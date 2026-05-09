'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('availability_locks', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      barber_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date: { type: Sequelize.DATE, allowNull: false },
      locked_by: { type: Sequelize.STRING(100) },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('availability_locks', ['barber_id', 'date'], { unique: true });
    await queryInterface.addIndex('availability_locks', ['expires_at']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('availability_locks');
  },
};
