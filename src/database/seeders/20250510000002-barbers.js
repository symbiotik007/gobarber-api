'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('users', [
      {
        name: 'Luis Fernando',
        email: 'luis@troyabarber.com',
        password_hash: '$2a$08$ZAP1sf8CbbLnxFYVIXhYW.tNx8usifKga.P4ruMMY62QklUUgbZzO',
        provider: true,
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Jhoymar Jojoa',
        email: 'jhoymar@troyabarber.com',
        password_hash: '$2a$08$erVTYziGOpf.sd.Q7uzdv.dnZhkcgq9pvyKN4LFq51AP5.6apsw3G',
        provider: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('users', {
      email: ['luis@troyabarber.com', 'jhoymar@troyabarber.com'],
    }, {});
  },
};
