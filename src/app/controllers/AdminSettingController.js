import AdminSetting from '../models/AdminSetting';

const PUBLIC_KEYS = [
  'shop_name', 'shop_phone', 'shop_address',
  'llave_number', 'llave_owner', 'llave_bank',
  'booking_expiry_minutes', 'reschedule_window_hours',
  'work_hours', 'slot_buffer_minutes', 'holidays',
];

const PRIVATE_KEYS = [
  'wompi_private_key', 'wompi_events_secret',
];

class AdminSettingController {
  async index(req, res) {
    const settings = await AdminSetting.findAll({ order: [['key', 'ASC']] });
    const data = settings
      .filter(s => !PRIVATE_KEYS.includes(s.key))
      .reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});
    return res.json(data);
  }

  async update(req, res) {
    const updates = req.body;

    if (typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ error: 'Body debe ser un objeto { key: value }.' });
    }

    const forbidden = Object.keys(updates).filter(k => PRIVATE_KEYS.includes(k) && !req.isAdmin);
    if (forbidden.length) {
      return res.status(403).json({ error: `Sin permiso para actualizar: ${forbidden.join(', ')}` });
    }

    await Promise.all(
      Object.entries(updates).map(([key, value]) => AdminSetting.set(key, value))
    );

    return res.json({ message: 'Configuración actualizada.' });
  }

  async publicIndex(req, res) {
    const settings = await AdminSetting.findAll({ where: { key: PUBLIC_KEYS } });
    const data = settings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});
    return res.json(data);
  }
}

export default new AdminSettingController();
