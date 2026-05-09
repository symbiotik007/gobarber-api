import { Op } from 'sequelize';
import { addMinutes } from 'date-fns';
import Booking, { BOOKING_STATUS } from '../models/Booking';
import AvailabilityLock from '../models/AvailabilityLock';
import AdminSetting from '../models/AdminSetting';
import User from '../models/User';

class AvailabilityService {
  /**
   * Devuelve los slots ocupados de un barbero en una fecha dada.
   * Incluye reservas activas + locks vigentes.
   */
  async getOccupiedSlots(barberId, date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const [bookings, locks] = await Promise.all([
      Booking.findAll({
        where: {
          barber_id: barberId,
          date: { [Op.between]: [dayStart, dayEnd] },
          status: {
            [Op.in]: [BOOKING_STATUS.PENDING_PAYMENT, BOOKING_STATUS.CONFIRMED],
          },
        },
        attributes: ['date', 'status'],
      }),
      AvailabilityLock.findAll({
        where: {
          barber_id: barberId,
          date: { [Op.between]: [dayStart, dayEnd] },
          expires_at: { [Op.gt]: new Date() },
        },
        attributes: ['date'],
      }),
    ]);

    const occupied = new Set([
      ...bookings.map(b => b.date.toISOString()),
      ...locks.map(l => l.date.toISOString()),
    ]);

    return occupied;
  }

  /**
   * Verifica si un slot específico está disponible para un barbero.
   */
  async isSlotAvailable(barberId, date) {
    const occupied = await this.getOccupiedSlots(barberId, date);
    return !occupied.has(new Date(date).toISOString());
  }

  /**
   * Adquiere un lock temporal sobre un slot.
   * Lanza error si el slot ya está tomado (race condition protection).
   */
  async acquireLock(barberId, date, lockedBy) {
    const expiryMinutes = await AdminSetting.getInt('booking_expiry_minutes', 10);
    const expiresAt = addMinutes(new Date(), expiryMinutes);

    await this._cleanExpiredLocks();

    const isAvailable = await this.isSlotAvailable(barberId, date);
    if (!isAvailable) {
      throw new Error('Este horario ya no está disponible. Por favor elige otro.');
    }

    const [lock, created] = await AvailabilityLock.findOrCreate({
      where: { barber_id: barberId, date: new Date(date) },
      defaults: { barber_id: barberId, date: new Date(date), locked_by: lockedBy, expires_at: expiresAt },
    });

    if (!created && lock.expires_at > new Date()) {
      throw new Error('Este horario ya no está disponible. Por favor elige otro.');
    }

    if (!created) {
      await lock.update({ locked_by: lockedBy, expires_at: expiresAt });
    }

    return lock;
  }

  /**
   * Libera el lock de un slot al confirmar o cancelar la reserva.
   */
  async releaseLock(barberId, date) {
    await AvailabilityLock.destroy({
      where: { barber_id: barberId, date: new Date(date) },
    });
  }

  /**
   * Devuelve los slots donde TODOS los barberos están ocupados (para modo "cualquiera").
   * Un slot aparece como ocupado solo si ningún barbero lo tiene libre.
   */
  async getFullyOccupiedSlots(date) {
    const barbers = await User.findAll({ where: { provider: true }, attributes: ['id'] });
    if (barbers.length === 0) return new Set();

    const slotsPerBarber = await Promise.all(
      barbers.map(b => this.getOccupiedSlots(b.id, date))
    );

    // Un slot está "bloqueado para todos" si aparece en TODOS los sets
    const [first, ...rest] = slotsPerBarber;
    const fullyOccupied = new Set(
      [...first].filter(slot => rest.every(s => s.has(slot)))
    );

    return fullyOccupied;
  }

  /**
   * Elige el barbero con menor carga en la fecha dada que tenga el slot libre.
   * "Menor carga" = menor número de bookings PENDING_PAYMENT + CONFIRMED ese día.
   */
  async pickLeastLoadedBarber(date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const barbers = await User.findAll({ where: { provider: true }, attributes: ['id', 'name'] });
    if (barbers.length === 0) throw new Error('No hay barberos disponibles.');

    const slotDate = new Date(date);

    const candidates = await Promise.all(
      barbers.map(async barber => {
        const isAvail = await this.isSlotAvailable(barber.id, slotDate);
        if (!isAvail) return null;

        const load = await Booking.count({
          where: {
            barber_id: barber.id,
            date: { [Op.between]: [dayStart, dayEnd] },
            status: { [Op.in]: [BOOKING_STATUS.PENDING_PAYMENT, BOOKING_STATUS.CONFIRMED] },
          },
        });

        return { barber, load };
      })
    );

    const available = candidates.filter(Boolean);
    if (available.length === 0) {
      throw new Error('Este horario ya no está disponible. Por favor elige otro.');
    }

    available.sort((a, b) => a.load - b.load);
    return available[0].barber;
  }

  async _cleanExpiredLocks() {
    await AvailabilityLock.destroy({
      where: { expires_at: { [Op.lte]: new Date() } },
    });
  }
}

export default new AvailabilityService();
