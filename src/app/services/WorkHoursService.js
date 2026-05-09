import AdminSetting from '../models/AdminSetting';

// Default schedule: Mon–Sat 08:00–20:00, Sunday closed
// Keys are JS getDay() values: 0=Sun, 1=Mon, ..., 6=Sat
const DEFAULT_WORK_HOURS = {
  0: null,
  1: { open: 8, close: 20 },
  2: { open: 8, close: 20 },
  3: { open: 8, close: 20 },
  4: { open: 8, close: 20 },
  5: { open: 8, close: 20 },
  6: { open: 8, close: 14 },
};

class WorkHoursService {
  async getConfig() {
    const [rawHours, rawBuffer, rawHolidays] = await Promise.all([
      AdminSetting.get('work_hours', null),
      AdminSetting.getInt('slot_buffer_minutes', 0),
      AdminSetting.get('holidays', null),
    ]);

    const workHours = rawHours ? JSON.parse(rawHours) : DEFAULT_WORK_HOURS;
    const holidays = rawHolidays ? JSON.parse(rawHolidays) : [];

    return { workHours, bufferMinutes: rawBuffer, holidays };
  }

  // Returns array of valid hours for a given date, or null if the day is closed/holiday
  async getAvailableHours(date) {
    const d = new Date(date);
    const { workHours, holidays } = await this.getConfig();

    const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
    if (holidays.includes(dateStr)) return null;

    const dayKey = String(d.getDay());
    const schedule = workHours[dayKey];
    if (!schedule) return null; // closed

    const hours = [];
    for (let h = schedule.open; h < schedule.close; h++) {
      hours.push(h);
    }
    return hours;
  }

  // Returns true if a specific datetime slot is within work hours and not a holiday
  async isValidSlot(date) {
    const d = new Date(date);
    const hours = await this.getAvailableHours(d);
    if (!hours) return false;
    return hours.includes(d.getHours());
  }

  // Returns schedule for the day: { open, close } or null
  async getDaySchedule(date) {
    const { workHours, holidays } = await this.getConfig();
    const d = new Date(date);
    const dateStr = d.toISOString().slice(0, 10);
    if (holidays.includes(dateStr)) return null;
    const schedule = workHours[String(d.getDay())];
    return schedule || null;
  }
}

export default new WorkHoursService();
