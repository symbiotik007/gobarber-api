import { v4 as uuidv4 } from 'uuid';
import { addMinutes, addHours } from 'date-fns';
import { Op } from 'sequelize';
import Booking, { BOOKING_STATUS } from '../models/Booking';
import BookingStatusHistory from '../models/BookingStatusHistory';
import GuestCustomer from '../models/GuestCustomer';
import Service from '../models/Service';
import User from '../models/User';
import AdminSetting from '../models/AdminSetting';
import AvailabilityService from './AvailabilityService';
import PaymentService from './PaymentService';
import NotificationService from './NotificationService';
import logger from '../../lib/logger';
import AnalyticsService from './AnalyticsService';
import WorkHoursService from './WorkHoursService';

class BookingService {
  /**
   * Crea una reserva provisional con estado PENDING_PAYMENT.
   * Adquiere lock de disponibilidad antes de persistir.
   */
  async create({ barberId, serviceId, date, depositAmount, customer, notes }) {
    const bookingDate = new Date(date);
    if (bookingDate <= new Date()) throw new Error('La fecha debe ser futura.');

    const service = await Service.findByPk(serviceId);
    if (!service || !service.is_active) throw new Error('Servicio no disponible.');

    let barber;
    let resolvedBarberId = barberId;

    if (!barberId || Number(barberId) === 0) {
      // Modo "cualquier barbero" — elige el de menor carga con el slot libre
      barber = await AvailabilityService.pickLeastLoadedBarber(bookingDate);
      resolvedBarberId = barber.id;
    } else {
      barber = await User.findOne({ where: { id: barberId, provider: true } });
      if (!barber) throw new Error('Barbero no encontrado.');
    }

    if (!service.validateDeposit(depositAmount)) {
      const range = service.depositRange;
      throw new Error(
        `El anticipo debe estar entre $${range.min.toLocaleString('es-CO')} y $${range.max.toLocaleString('es-CO')} COP.`
      );
    }

    const isValidSlot = await WorkHoursService.isValidSlot(bookingDate);
    if (!isValidSlot) {
      throw new Error('El horario seleccionado está fuera del horario laboral o corresponde a un día festivo/cerrado.');
    }

    const expiryMinutes = await AdminSetting.getInt('booking_expiry_minutes', 10);

    await AvailabilityService.acquireLock(resolvedBarberId, bookingDate, customer.email);

    const [guest] = await GuestCustomer.findOrCreate({
      where: { email: customer.email.toLowerCase() },
      defaults: { name: customer.name, email: customer.email.toLowerCase(), phone: customer.phone },
    });

    if (guest.name !== customer.name || guest.phone !== customer.phone) {
      await guest.update({ name: customer.name, phone: customer.phone });
    }

    const reference = uuidv4();
    const expiresAt = addMinutes(new Date(), expiryMinutes);

    const booking = await Booking.create({
      reference,
      barber_id: resolvedBarberId,
      service_id: serviceId,
      guest_customer_id: guest.id,
      date: bookingDate,
      status: BOOKING_STATUS.PENDING_PAYMENT,
      deposit_amount: depositAmount,
      total_amount: service.price,
      expires_at: expiresAt,
      notes: notes || null,
    });

    await BookingStatusHistory.create({
      booking_id: booking.id,
      from_status: null,
      to_status: BOOKING_STATUS.PENDING_PAYMENT,
      reason: 'Reserva creada',
      metadata: { deposit_amount: depositAmount, expires_at: expiresAt },
    });

    const paymentIntent = await PaymentService.createIntent({ booking, service, customer: guest });

    AnalyticsService.emit('booking_created', {
      bookingId: booking.id,
      reference: booking.reference,
      barberId: resolvedBarberId,
      anyBarber: !barberId || Number(barberId) === 0,
      serviceId,
      depositAmount,
      customerEmail: guest.email,
      expiresAt: expiresAt.toISOString(),
    });

    return { booking, paymentIntent, guest };
  }

  /**
   * Confirma una reserva después de que el barbero verifica el pago.
   * Política no reembolsable: se graba en el historial.
   */
  async confirm({ bookingId, confirmedBy, transactionId }) {
    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: GuestCustomer, as: 'guest_customer' }],
    });

    if (!booking) throw new Error('Reserva no encontrada.');
    if (!booking.canTransitionTo(BOOKING_STATUS.CONFIRMED)) {
      throw new Error(`No se puede confirmar una reserva en estado ${booking.status}.`);
    }

    const rescheduleWindowHours = await AdminSetting.getInt('reschedule_window_hours', 24);
    const rescheduleToken = uuidv4().replace(/-/g, '');
    const rescheduleTokenExpiresAt = addHours(new Date(booking.date), -rescheduleWindowHours);

    await PaymentService.confirmManual({ bookingId, confirmedBy, transactionId });

    await booking.update({
      status: BOOKING_STATUS.CONFIRMED,
      expires_at: null,
      reschedule_token: rescheduleToken,
      reschedule_token_expires_at: rescheduleTokenExpiresAt,
    });

    await BookingStatusHistory.create({
      booking_id: booking.id,
      from_status: BOOKING_STATUS.PENDING_PAYMENT,
      to_status: BOOKING_STATUS.CONFIRMED,
      reason: 'Pago confirmado manualmente',
      metadata: { confirmed_by: confirmedBy, transaction_id: transactionId, non_refundable: true },
    });

    await AvailabilityService.releaseLock(booking.barber_id, booking.date);

    const confirmed = await booking.reload({
      include: [
        { model: GuestCustomer, as: 'guest_customer' },
        { model: Service, as: 'service' },
        { model: User, as: 'barber', attributes: ['id', 'name'] },
      ],
    });

    AnalyticsService.emit('booking_confirmed', {
      bookingId: booking.id,
      reference: booking.reference,
      confirmedBy,
      transactionId,
    });

    NotificationService.notifyConfirmation(confirmed).catch(err =>
      logger.error('notification_error', { bookingId: booking.id, error: err.message })
    );

    return confirmed;
  }

  /**
   * Cancela una reserva. El anticipo NO se reembolsa.
   */
  async cancel({ bookingId, reason, cancelledBy }) {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) throw new Error('Reserva no encontrada.');

    if (!booking.canTransitionTo(BOOKING_STATUS.CANCELLED)) {
      throw new Error(`No se puede cancelar una reserva en estado ${booking.status}.`);
    }

    await booking.update({ status: BOOKING_STATUS.CANCELLED, expires_at: null });

    await BookingStatusHistory.create({
      booking_id: booking.id,
      from_status: booking.status,
      to_status: BOOKING_STATUS.CANCELLED,
      reason: reason || 'Cancelada',
      metadata: { cancelled_by: cancelledBy, non_refundable: true },
    });

    await AvailabilityService.releaseLock(booking.barber_id, booking.date);
    await PaymentService.voidPendingPayment(bookingId);

    const cancelledWithIncludes = await booking.reload({
      include: [
        { model: GuestCustomer, as: 'guest_customer' },
        { model: Service, as: 'service' },
        { model: User, as: 'barber', attributes: ['id', 'name'] },
      ],
    });

    AnalyticsService.emit('booking_cancelled', {
      bookingId: booking.id,
      reference: booking.reference,
      cancelledBy,
      reason,
    });

    NotificationService.notifyCancellation(cancelledWithIncludes, reason).catch(err =>
      logger.error('notification_error', { bookingId: booking.id, error: err.message })
    );

    return cancelledWithIncludes;
  }

  /**
   * Expira todas las reservas PENDING_PAYMENT cuyo expires_at ya pasó.
   * Diseñado para ser llamado por un cron job.
   */
  async expireStale() {
    const stale = await Booking.findAll({
      where: {
        status: BOOKING_STATUS.PENDING_PAYMENT,
        expires_at: { [Op.lte]: new Date() },
      },
    });

    const results = await Promise.allSettled(
      stale.map(async booking => {
        await booking.update({ status: BOOKING_STATUS.EXPIRED });

        await BookingStatusHistory.create({
          booking_id: booking.id,
          from_status: BOOKING_STATUS.PENDING_PAYMENT,
          to_status: BOOKING_STATUS.EXPIRED,
          reason: 'Tiempo de pago expirado',
          metadata: { expired_at: new Date().toISOString() },
        });

        await AvailabilityService.releaseLock(booking.barber_id, booking.date);
        await PaymentService.voidPendingPayment(booking.id);

        return booking.id;
      })
    );

    const expired = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed = results.filter(r => r.status === 'rejected').length;

    if (expired.length > 0) {
      expired.forEach(bookingId => AnalyticsService.emit('booking_expired', { bookingId }));
      logger.info('booking_expired_batch', { count: expired.length, bookingIds: expired });
    }
    if (failed > 0) {
      logger.error('booking_expire_failures', { count: failed });
    }

    return { expired: expired.length, failed };
  }

  /**
   * Marca una reserva como NO_SHOW (cliente no apareció).
   * El anticipo se pierde.
   */
  async markNoShow({ bookingId, markedBy }) {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) throw new Error('Reserva no encontrada.');
    if (!booking.canTransitionTo(BOOKING_STATUS.NO_SHOW)) {
      throw new Error(`No se puede marcar como no-show una reserva en estado ${booking.status}.`);
    }

    await booking.update({ status: BOOKING_STATUS.NO_SHOW });

    await BookingStatusHistory.create({
      booking_id: booking.id,
      from_status: BOOKING_STATUS.CONFIRMED,
      to_status: BOOKING_STATUS.NO_SHOW,
      reason: 'Cliente no se presentó',
      metadata: { marked_by: markedBy, deposit_forfeited: true },
    });

    AnalyticsService.emit('booking_no_show', { bookingId: booking.id, markedBy });

    return booking;
  }

  /**
   * Marca una reserva como COMPLETED.
   */
  async complete({ bookingId, completedBy }) {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) throw new Error('Reserva no encontrada.');
    if (!booking.canTransitionTo(BOOKING_STATUS.COMPLETED)) {
      throw new Error(`No se puede completar una reserva en estado ${booking.status}.`);
    }

    await booking.update({ status: BOOKING_STATUS.COMPLETED });

    await BookingStatusHistory.create({
      booking_id: booking.id,
      from_status: BOOKING_STATUS.CONFIRMED,
      to_status: BOOKING_STATUS.COMPLETED,
      reason: 'Servicio completado',
      metadata: { completed_by: completedBy },
    });

    AnalyticsService.emit('booking_completed', { bookingId: booking.id, completedBy });

    return booking;
  }

  /**
   * Marca como NO_SHOW las reservas CONFIRMED cuya fecha ya pasó hace más de 1 hora
   * y el barbero no las completó ni canceló manualmente.
   */
  async markStaleNoShow() {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000); // hace 1 hora

    const stale = await Booking.findAll({
      where: {
        status: BOOKING_STATUS.CONFIRMED,
        date: { [Op.lte]: cutoff },
      },
    });

    const results = await Promise.allSettled(
      stale.map(async booking => {
        await booking.update({ status: BOOKING_STATUS.NO_SHOW });
        await BookingStatusHistory.create({
          booking_id: booking.id,
          from_status: BOOKING_STATUS.CONFIRMED,
          to_status: BOOKING_STATUS.NO_SHOW,
          reason: 'Marcado automáticamente por no presentarse',
          metadata: { auto: true, deposit_forfeited: true },
        });
        AnalyticsService.emit('booking_no_show', { bookingId: booking.id, auto: true });
        return booking.id;
      })
    );

    const marked = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed = results.filter(r => r.status === 'rejected').length;

    if (marked.length > 0) {
      logger.info('no_show_batch', { count: marked.length, bookingIds: marked });
    }
    if (failed > 0) {
      logger.error('no_show_batch_failures', { count: failed });
    }

    return { marked: marked.length, failed };
  }

  /**
   * Reagenda una reserva usando el token seguro.
   */
  async reschedule({ token, newDate }) {
    const booking = await Booking.findOne({
      where: {
        reschedule_token: token,
        reschedule_token_expires_at: { [Op.gt]: new Date() },
        status: BOOKING_STATUS.CONFIRMED,
      },
      include: [{ model: Service, as: 'service' }],
    });

    if (!booking) throw new Error('Token de reagendamiento inválido o expirado.');

    const newBookingDate = new Date(newDate);
    if (newBookingDate <= new Date()) throw new Error('La nueva fecha debe ser futura.');

    await AvailabilityService.acquireLock(booking.barber_id, newBookingDate, `reschedule:${token}`);
    await AvailabilityService.releaseLock(booking.barber_id, booking.date);

    const oldDate = booking.date;
    await booking.update({
      date: newBookingDate,
      reschedule_token: null,
      reschedule_token_expires_at: null,
    });

    await BookingStatusHistory.create({
      booking_id: booking.id,
      from_status: BOOKING_STATUS.CONFIRMED,
      to_status: BOOKING_STATUS.CONFIRMED,
      reason: 'Reagendado por cliente',
      metadata: {
        old_date: oldDate.toISOString(),
        new_date: newBookingDate.toISOString(),
        non_refundable: true,
      },
    });

    const reloaded = await booking.reload({ include: [{ model: Service, as: 'service' }] });

    AnalyticsService.emit('reschedule_completed', {
      bookingId: booking.id,
      reference: booking.reference,
      oldDate: oldDate.toISOString(),
      newDate: newBookingDate.toISOString(),
    });

    return reloaded;
  }
}

export default new BookingService();
