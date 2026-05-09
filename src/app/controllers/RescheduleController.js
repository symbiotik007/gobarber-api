import { body, validationResult } from 'express-validator';
import BookingService from '../services/BookingService';
import Booking from '../models/Booking';
import { Op } from 'sequelize';
import { BOOKING_STATUS } from '../models/Booking';

export const rescheduleValidators = [
  body('new_date').isISO8601().withMessage('Fecha inválida.'),
];

class RescheduleController {
  async show(req, res) {
    const { token } = req.params;

    const booking = await Booking.findOne({
      where: {
        reschedule_token: token,
        reschedule_token_expires_at: { [Op.gt]: new Date() },
        status: BOOKING_STATUS.CONFIRMED,
      },
      include: [
        { association: 'service', attributes: ['id', 'name', 'duration_minutes'] },
        { association: 'barber', attributes: ['id', 'name'] },
        { association: 'guest_customer', attributes: ['name', 'email'] },
      ],
    });

    if (!booking) {
      return res.status(404).json({ error: 'Token de reagendamiento inválido o expirado.' });
    }

    return res.json({
      reference: booking.reference,
      date: booking.date,
      service: booking.service,
      barber: booking.barber,
      customer: booking.guest_customer,
      token_expires_at: booking.reschedule_token_expires_at,
    });
  }

  async update(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { token } = req.params;
    const { new_date } = req.body;

    try {
      const booking = await BookingService.reschedule({ token, newDate: new_date });
      return res.json({
        reference: booking.reference,
        new_date: booking.date,
        status: booking.status,
        service: booking.service,
      });
    } catch (err) {
      const status = err.message.includes('disponible') ? 409 : 400;
      return res.status(status).json({ error: err.message });
    }
  }
}

export default new RescheduleController();
