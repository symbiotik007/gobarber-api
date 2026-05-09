import { Op } from 'sequelize';
import { parseISO, startOfDay, endOfDay, isValid, format } from 'date-fns';
import BookingService from '../services/BookingService';
import Booking, { BOOKING_STATUS } from '../models/Booking';
import GuestCustomer from '../models/GuestCustomer';
import Service from '../models/Service';
import User from '../models/User';
import Payment from '../models/Payment';
import BookingStatusHistory from '../models/BookingStatusHistory';

function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function rowToCsv(fields) {
  return fields.map(escapeCsv).join(',');
}

class AdminBookingController {
  async index(req, res) {
    const { date, status, barber_id, branch_id, page = 1 } = req.query;
    const LIMIT = 30;
    const where = {};

    if (status) where.status = status;
    if (barber_id) where.barber_id = barber_id;
    if (branch_id) where.branch_id = branch_id;
    if (date) {
      const parsed = parseISO(date);
      if (isValid(parsed)) {
        where.date = { [Op.between]: [startOfDay(parsed), endOfDay(parsed)] };
      }
    }

    const { rows: bookings, count } = await Booking.findAndCountAll({
      where,
      order: [['date', 'ASC']],
      limit: LIMIT,
      offset: (page - 1) * LIMIT,
      include: [
        { model: GuestCustomer, as: 'guest_customer', attributes: ['name', 'email', 'phone'] },
        { model: Service, as: 'service', attributes: ['id', 'name', 'price'] },
        { model: User, as: 'barber', attributes: ['id', 'name'] },
        { model: Payment, as: 'payments', attributes: ['status', 'amount', 'provider', 'reference', 'transaction_id'] },
      ],
    });

    return res.json({ bookings, total: count, page: Number(page), pages: Math.ceil(count / LIMIT) });
  }

  async show(req, res) {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: GuestCustomer, as: 'guest_customer' },
        { model: Service, as: 'service' },
        { model: User, as: 'barber', attributes: ['id', 'name', 'email'] },
        { model: Payment, as: 'payments' },
        { model: BookingStatusHistory, as: 'status_history', order: [['created_at', 'ASC']] },
      ],
    });

    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada.' });
    return res.json(booking);
  }

  async confirmPayment(req, res) {
    const { id } = req.params;
    const { transaction_id } = req.body;

    try {
      const booking = await BookingService.confirm({
        bookingId: Number(id),
        confirmedBy: req.userId,
        transactionId: transaction_id || null,
      });
      return res.json({ message: 'Pago confirmado. Reserva confirmada.', booking });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  async updateStatus(req, res) {
    const { id } = req.params;
    const { status, reason } = req.body;

    const allowed = [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED, BOOKING_STATUS.NO_SHOW];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Estado inválido. Usa: ${allowed.join(', ')}` });
    }

    try {
      let booking;
      if (status === BOOKING_STATUS.COMPLETED) {
        booking = await BookingService.complete({ bookingId: Number(id), completedBy: req.userId });
      } else if (status === BOOKING_STATUS.NO_SHOW) {
        booking = await BookingService.markNoShow({ bookingId: Number(id), markedBy: req.userId });
      } else if (status === BOOKING_STATUS.CANCELLED) {
        booking = await BookingService.cancel({ bookingId: Number(id), reason, cancelledBy: req.userId });
      }
      return res.json({ message: `Reserva actualizada a ${status}.`, booking });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  async stats(req, res) {
    const { from, to } = req.query;

    const where = {};
    if (from || to) {
      where.date = {};
      if (from) {
        const f = parseISO(from);
        if (isValid(f)) where.date[Op.gte] = startOfDay(f);
      }
      if (to) {
        const t = parseISO(to);
        if (isValid(t)) where.date[Op.lte] = endOfDay(t);
      }
    }

    const bookings = await Booking.findAll({
      where,
      include: [{ model: Payment, as: 'payments', attributes: ['status', 'amount'] }],
    });

    const result = {
      total: bookings.length,
      pending:   0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      expired:   0,
      no_show:   0,
      revenue_deposits: 0,
      revenue_balance:  0,
    };

    bookings.forEach(b => {
      const s = b.status.toLowerCase();
      if (result[s] !== undefined) result[s]++;

      if (['CONFIRMED', 'COMPLETED', 'NO_SHOW'].includes(b.status)) {
        result.revenue_deposits += b.deposit_amount || 0;
      }
      if (b.status === 'COMPLETED') {
        result.revenue_balance += (b.total_amount || 0) - (b.deposit_amount || 0);
      }
    });

    return res.json(result);
  }

  async exportCsv(req, res) {
    const { from, to, status } = req.query;
    const where = {};

    if (status) where.status = status;
    if (from || to) {
      where.date = {};
      if (from) {
        const f = parseISO(from);
        if (isValid(f)) where.date[Op.gte] = startOfDay(f);
      }
      if (to) {
        const t = parseISO(to);
        if (isValid(t)) where.date[Op.lte] = endOfDay(t);
      }
    }

    const bookings = await Booking.findAll({
      where,
      order: [['date', 'ASC']],
      limit: 5000,
      include: [
        { model: GuestCustomer, as: 'guest_customer', attributes: ['name', 'email', 'phone'] },
        { model: Service, as: 'service', attributes: ['name'] },
        { model: User, as: 'barber', attributes: ['name'] },
      ],
    });

    const headers = ['Referencia','Estado','Fecha','Hora','Servicio','Barbero','Cliente','Email','Teléfono','Anticipo','Total'];
    const rows = bookings.map(b => rowToCsv([
      b.reference,
      b.status,
      format(new Date(b.date), 'yyyy-MM-dd'),
      format(new Date(b.date), 'HH:mm'),
      b.service ? b.service.name : '',
      b.barber ? b.barber.name : '',
      b.guest_customer ? b.guest_customer.name : '',
      b.guest_customer ? b.guest_customer.email : '',
      b.guest_customer ? b.guest_customer.phone : '',
      b.deposit_amount,
      b.total_amount,
    ]));

    const csv = [rowToCsv(headers), ...rows].join('\r\n');
    const filename = `reservas-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('﻿' + csv);
  }
}

export default new AdminBookingController();
