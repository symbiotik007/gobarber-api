'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('services', 'barber_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
    await queryInterface.addIndex('services', ['barber_id'], { name: 'services_barber_id_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('services', 'services_barber_id_idx');
    await queryInterface.removeColumn('services', 'barber_id');
  },
};
