import { Op } from 'sequelize';
import Service from '../models/Service';

class AdminServiceController {
  async index(req, res) {
    const { include_inactive } = req.query;
    const where = include_inactive === 'true' ? {} : { is_active: true };

    const services = await Service.findAll({
      where,
      order: [['name', 'ASC']],
    });

    return res.json(services);
  }

  async store(req, res) {
    const { name, duration_minutes, price, deposit_min, deposit_max, deposit_percentage_max } = req.body;

    if (!name || !duration_minutes || !price || deposit_min == null) {
      return res.status(400).json({ error: 'Faltan campos requeridos.' });
    }

    if (price <= 0 || duration_minutes <= 0) {
      return res.status(400).json({ error: 'Precio y duración deben ser positivos.' });
    }

    const service = await Service.create({
      name,
      duration_minutes: Number(duration_minutes),
      price: Number(price),
      deposit_min: Number(deposit_min),
      deposit_max: Number(deposit_max || price),
      deposit_percentage_max: Number(deposit_percentage_max || 100),
      is_active: true,
    });

    return res.status(201).json(service);
  }

  async update(req, res) {
    const { id } = req.params;

    const service = await Service.findByPk(id);
    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado.' });
    }

    const { name, duration_minutes, price, deposit_min, deposit_max, deposit_percentage_max, is_active } = req.body;

    if (price !== undefined && Number(price) <= 0) {
      return res.status(400).json({ error: 'El precio debe ser positivo.' });
    }

    if (duration_minutes !== undefined && Number(duration_minutes) <= 0) {
      return res.status(400).json({ error: 'La duración debe ser positiva.' });
    }

    await service.update({
      ...(name !== undefined && { name }),
      ...(duration_minutes !== undefined && { duration_minutes: Number(duration_minutes) }),
      ...(price !== undefined && { price: Number(price) }),
      ...(deposit_min !== undefined && { deposit_min: Number(deposit_min) }),
      ...(deposit_max !== undefined && { deposit_max: Number(deposit_max) }),
      ...(deposit_percentage_max !== undefined && { deposit_percentage_max: Number(deposit_percentage_max) }),
      ...(is_active !== undefined && { is_active: Boolean(is_active) }),
    });

    return res.json(service);
  }
}

export default new AdminServiceController();
