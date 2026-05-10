'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    // Desactiva servicios de prueba anteriores sin borrarlos
    await queryInterface.bulkUpdate('services', { is_active: false, updated_at: now }, {});

    await queryInterface.bulkInsert('services', [
      {
        name: 'Corte de Cabello TROYA',
        duration_minutes: 60,
        price: 28000,
        deposit_min: 5000,
        deposit_max: 8000,
        deposit_percentage_max: 30,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Corte de Cabello y Barba TROYA',
        duration_minutes: 75,
        price: 38000,
        deposit_min: 8000,
        deposit_max: 12000,
        deposit_percentage_max: 30,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Diseño de Barba',
        duration_minutes: 20,
        price: 15000,
        deposit_min: 3000,
        deposit_max: 5000,
        deposit_percentage_max: 30,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Diseño de Cejas con Henna',
        duration_minutes: 15,
        price: 15000,
        deposit_min: 3000,
        deposit_max: 5000,
        deposit_percentage_max: 30,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Corte de Cabello',
        duration_minutes: 50,
        price: 26000,
        deposit_min: 5000,
        deposit_max: 8000,
        deposit_percentage_max: 30,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Corte de Cabello y Barba',
        duration_minutes: 75,
        price: 38000,
        deposit_min: 8000,
        deposit_max: 12000,
        deposit_percentage_max: 30,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkUpdate('services', { is_active: true }, {});
  },
};
