import { body, validationResult } from 'express-validator';
import { Op } from 'sequelize';
import BookingService from '../services/BookingService';
import Booking from '../models/Booking';
import BookingStatusHistory from '../models/BookingStatusHistory';
import GuestCustomer from '../models/GuestCustomer';
import Service from '../models/Service';
import User from '../models/User';
import Payment from '../models/Payment';

export const createBookingValidators = [
  body('barber_id').isInt({ min: 0 }).withMessage('Barbero inválido.'), // 0 = cualquiera disponible
  body('service_id').isInt({ min: 1 }).withMessage('Servicio inválido.'),
  body('date')
    .isISO8601()
    .withMessage('Fecha inválida.')
    .custom(val => {
      const d = new Date(val);
      if (d <= new Date()) throw new Error('La fecha debe ser futura.');
      return true;
    }),
  body('deposit_amount').isInt({ min: 1, max: 10000000 }).withMessage('Anticipo inválido.'),
  body('customer.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nombre requerido (2-100 caracteres).'),
  body('customer.email')
    .isEmail()
    .normalizeEmail()
    .isLength({ max: 254 })
    .withMessage('Email inválido.'),
  body('customer.phone')
    .trim()
    .isLength({ min: 7, max: 20 })
    .matches(/^[+\d\s\-().]+$/)
    .withMessage('Teléfono inválido.'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden superar 500 caracteres.'),
];

class BookingController {
  async store(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { barber_id, service_id, date, deposit_amount, customer, notes } = req.body;

    try {
      const result = await BookingService.create({
        barberId: barber_id,
        serviceId: service_id,
        date,
        depositAmount: deposit_amount,
        customer,
        notes,
      });

      return res.status(201).json({
        booking: {
          id: result.booking.id,
          reference: result.booking.reference,
          status: result.booking.status,
          date: result.booking.date,
          deposit_amount: result.booking.deposit_amount,
          total_amount: result.booking.total_amount,
          expires_at: result.booking.expires_at,
        },
        payment: result.paymentIntent,
        customer: {
          name: result.guest.name,
          email: result.guest.email,
          phone: result.guest.phone,
        },
      });
    } catch (err) {
      const status = err.message.includes('disponible') ? 409 : 400;
      return res.status(status).json({ error: err.message });
    }
  }

  async show(req, res) {
    const { reference } = req.params;

    const booking = await Booking.findOne({
      where: { reference },
      include: [
        { model: GuestCustomer, as: 'guest_customer', attributes: ['name', 'email', 'phone'] },
        { model: Service, as: 'service', attributes: ['id', 'name', 'duration_minutes', 'price'] },
        { model: User, as: 'barber', attributes: ['id', 'name'] },
        { model: Payment, as: 'payments', attributes: ['status', 'amount', 'provider', 'reference', 'created_at'] },
        {
          model: BookingStatusHistory,
          as: 'status_history',
          attributes: ['from_status', 'to_status', 'reason', 'created_at'],
          order: [['created_at', 'ASC']],
        },
      ],
    });

    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada.' });

    const rescheduleAvailable = !!(
      booking.reschedule_token &&
      booking.reschedule_token_expires_at &&
      booking.reschedule_token_expires_at > new Date()
    );

    return res.json({
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
      date: booking.date,
      deposit_amount: booking.deposit_amount,
      total_amount: booking.total_amount,
      expires_at: booking.expires_at,
      reschedule_available: rescheduleAvailable,
      reschedule_token: rescheduleAvailable ? booking.reschedule_token : null,
      barber: booking.barber,
      service: booking.service,
      customer: booking.guest_customer,
      payments: booking.payments,
      status_history: booking.status_history,
    });
  }

  async myBookings(req, res) {
    const currentUser = await User.findByPk(req.userId, { attributes: ['email'] });
    if (!currentUser) return res.status(401).json({ error: 'No autenticado.' });

    const guests = await GuestCustomer.findAll({
      where: { email: currentUser.email },
      attributes: ['id'],
    });

    if (!guests.length) return res.json([]);

    const guestIds = guests.map(g => g.id);

    const bookings = await Booking.findAll({
      where: { guest_customer_id: { [Op.in]: guestIds } },
      include: [
        { model: Service, as: 'service', attributes: ['id', 'name', 'duration_minutes', 'price'] },
        { model: User, as: 'barber', attributes: ['id', 'name'] },
      ],
      order: [['date', 'DESC']],
    });

    return res.json(bookings.map(b => ({
      id: b.id,
      reference: b.reference,
      status: b.status,
      date: b.date,
      deposit_amount: b.deposit_amount,
      expires_at: b.expires_at,
      service: b.service,
      barber: b.barber,
    })));
  }
}

export default new BookingController();
