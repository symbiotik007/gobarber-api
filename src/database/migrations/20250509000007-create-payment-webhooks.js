'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payment_webhooks', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      provider: { type: Sequelize.STRING(50), allowNull: false },
      event_type: { type: Sequelize.STRING(100) },
      payload: { type: Sequelize.JSONB, allowNull: false },
      signature: { type: Sequelize.STRING(500) },
      idempotency_key: { type: Sequelize.STRING(200), unique: true },
      processed: { type: Sequelize.BOOLEAN, defaultValue: false },
      processed_at: { type: Sequelize.DATE },
      error: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('payment_webhooks', ['idempotency_key']);
    await queryInterface.addIndex('payment_webhooks', ['processed']);
    await queryInterface.addIndex('payment_webhooks', ['provider', 'event_type']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('payment_webhooks');
  },
};
