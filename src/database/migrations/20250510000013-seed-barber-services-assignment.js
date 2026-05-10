'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [barbers] = await queryInterface.sequelize.query(
      `SELECT id, email FROM users WHERE email IN ('luis@troyabarber.com', 'jhoymar@troyabarber.com')`
    );

    const luis    = barbers.find(b => b.email === 'luis@troyabarber.com');
    const jhoymar = barbers.find(b => b.email === 'jhoymar@troyabarber.com');

    if (!luis || !jhoymar) return; // barbers not seeded yet, skip silently

    const now = new Date();

    await queryInterface.bulkUpdate(
      'services',
      { barber_id: luis.id, updated_at: now },
      { name: ['Corte de Cabello TROYA', 'Corte de Cabello y Barba TROYA', 'Corte de Cabello', 'Corte de Cabello y Barba'] }
    );

    await queryInterface.bulkUpdate(
      'services',
      { barber_id: jhoymar.id, updated_at: now },
      { name: ['Diseño de Barba', 'Diseño de Cejas con Henna'] }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.bulkUpdate('services', { barber_id: null }, {});
  },
};
