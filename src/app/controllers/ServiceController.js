import Service from '../models/Service';

class ServiceController {
  async index(req, res) {
    const services = await Service.findAll({
      where: { is_active: true },
      attributes: ['id', 'name', 'duration_minutes', 'price', 'deposit_min', 'deposit_max', 'deposit_percentage_max'],
      order: [['price', 'ASC']],
    });

    const data = services.map(s => ({
      id: s.id,
      name: s.name,
      duration_minutes: s.duration_minutes,
      price: s.price,
      deposit_range: s.depositRange,
    }));

    return res.json(data);
  }
}

export default new ServiceController();
