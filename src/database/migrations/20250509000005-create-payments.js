'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payments', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bookings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      provider: { type: Sequelize.STRING(50), allowNull: false },
      transaction_id: { type: Sequelize.STRING(200), unique: true },
      reference: { type: Sequelize.STRING(100), allowNull: false },
      status: {
        type: Sequelize.ENUM('PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      amount: { type: Sequelize.INTEGER, allowNull: false },
      currency: { type: Sequelize.STRING(3), defaultValue: 'COP' },
      metadata: { type: Sequelize.JSONB },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('payments', ['booking_id']);
    await queryInterface.addIndex('payments', ['transaction_id']);
    await queryInterface.addIndex('payments', ['reference']);
    await queryInterface.addIndex('payments', ['status']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('payments');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payments_status"');
  },
};
