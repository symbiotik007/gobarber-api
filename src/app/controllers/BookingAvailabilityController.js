import { parseISO, isValid } from 'date-fns';
import AvailabilityService from '../services/AvailabilityService';
import WorkHoursService from '../services/WorkHoursService';
import User from '../models/User';

class BookingAvailabilityController {
  async index(req, res) {
    const { barberId } = req.params;
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Parámetro date requerido (YYYY-MM-DD).' });
    }

    const parsed = parseISO(date);
    if (!isValid(parsed)) return res.status(400).json({ error: 'Fecha inválida.' });

    // Work hours for this day — null means closed/holiday
    const availableHours = await WorkHoursService.getAvailableHours(parsed);
    if (!availableHours) {
      return res.json({ occupied: [], available_hours: [], closed: true });
    }

    // barberId=0 → modo "cualquier barbero disponible"
    if (String(barberId) === '0') {
      const occupied = await AvailabilityService.getFullyOccupiedSlots(parsed);
      return res.json({
        occupied: Array.from(occupied),
        available_hours: availableHours,
        any_barber: true,
      });
    }

    const barber = await User.findOne({ where: { id: barberId, provider: true } });
    if (!barber) return res.status(404).json({ error: 'Barbero no encontrado.' });

    const occupied = await AvailabilityService.getOccupiedSlots(barberId, parsed);
    return res.json({ occupied: Array.from(occupied), available_hours: availableHours });
  }
}

export default new BookingAvailabilityController();

export default new BookingAvailabilityController();
