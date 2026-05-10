'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [barbers] = await queryInterface.sequelize.query(
      `SELECT id, email FROM users WHERE email IN ('luis@troyabarber.com', 'jhoymar@troyabarber.com')`
    );

    const luis   = barbers.find(b => b.email === 'luis@troyabarber.com');
    const jhoymar = barbers.find(b => b.email === 'jhoymar@troyabarber.com');

    if (!luis || !jhoymar) throw new Error('Barbers not found — run barbers seeder first');

    const now = new Date();

    // Luis Fernando: haircut services (including TROYA variants)
    await queryInterface.bulkUpdate(
      'services',
      { barber_id: luis.id, updated_at: now },
      {
        name: [
          'Corte de Cabello TROYA',
          'Corte de Cabello y Barba TROYA',
          'Corte de Cabello',
          'Corte de Cabello y Barba',
        ],
      }
    );

    // Jhoymar Jojoa: design services
    await queryInterface.bulkUpdate(
      'services',
      { barber_id: jhoymar.id, updated_at: now },
      {
        name: [
          'Diseño de Barba',
          'Diseño de Cejas con Henna',
        ],
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.bulkUpdate('services', { barber_id: null }, {});
  },
};
