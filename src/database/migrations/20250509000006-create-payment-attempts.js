'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payment_attempts', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bookings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      provider: { type: Sequelize.STRING(50), allowNull: false },
      reference: { type: Sequelize.STRING(100), allowNull: false },
      amount: { type: Sequelize.INTEGER, allowNull: false },
      status: { type: Sequelize.STRING(30), allowNull: false },
      error_message: { type: Sequelize.TEXT },
      metadata: { type: Sequelize.JSONB },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('payment_attempts', ['booking_id']);
    await queryInterface.addIndex('payment_attempts', ['reference']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('payment_attempts');
  },
};
