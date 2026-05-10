import bcrypt from 'bcryptjs';
import * as Yup from 'yup';
import User from '../models/User';
import File from '../models/File';

class AdminUserController {
  async index(req, res) {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'provider', 'created_at'],
      include: [{ model: File, as: 'avatar', attributes: ['url'] }],
      order: [['created_at', 'ASC']],
    });
    return res.json(users);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string().required(),
      email: Yup.string().email().required(),
      password: Yup.string().min(6).required(),
      provider: Yup.boolean(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Datos inválidos.' });
    }

    const exists = await User.findOne({ where: { email: req.body.email } });
    if (exists) return res.status(400).json({ error: 'Ya existe un usuario con ese correo.' });

    const { name, email, password, provider = false } = req.body;
    const user = await User.create({ name, email, password, provider });
    return res.json({ id: user.id, name: user.name, email: user.email, provider: user.provider });
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string(),
      email: Yup.string().email(),
      password: Yup.string().min(6),
      provider: Yup.boolean(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Datos inválidos.' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const { name, email, password, provider } = req.body;

    if (email && email !== user.email) {
      const exists = await User.findOne({ where: { email } });
      if (exists) return res.status(400).json({ error: 'Ya existe un usuario con ese correo.' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (provider !== undefined) updates.provider = provider;
    if (password) {
      updates.password_hash = await bcrypt.hash(password, 8);
    }

    await user.update(updates);
    return res.json({ id: user.id, name: user.name, email: user.email, provider: user.provider });
  }

  async destroy(req, res) {
    if (Number(req.params.id) === req.userId) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta.' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    await user.destroy();
    return res.status(204).send();
  }
}

export default new AdminUserController();
