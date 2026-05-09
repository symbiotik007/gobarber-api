import Branch from '../models/Branch';

class BranchController {
  async index(req, res) {
    const branches = await Branch.findAll({ order: [['name', 'ASC']] });
    return res.json(branches);
  }

  async store(req, res) {
    const { name, address, phone } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Nombre requerido.' });

    const branch = await Branch.create({ name: name.trim(), address, phone });
    return res.status(201).json(branch);
  }

  async update(req, res) {
    const branch = await Branch.findByPk(req.params.id);
    if (!branch) return res.status(404).json({ error: 'Sucursal no encontrada.' });

    const { name, address, phone, is_active } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (address !== undefined) updates.address = address;
    if (phone !== undefined) updates.phone = phone;
    if (is_active !== undefined) updates.is_active = is_active;

    await branch.update(updates);
    return res.json(branch);
  }
}

export default new BranchController();
