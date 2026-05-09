'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('bookings', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      reference: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      guest_customer_id: {
        type: Sequelize.INTEGER,
        references: { model: 'guest_customers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      barber_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      service_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'services', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      date: { type: Sequelize.DATE, allowNull: false },
      status: {
        type: Sequelize.ENUM(
          'PENDING_PAYMENT',
          'CONFIRMED',
          'COMPLETED',
          'CANCELLED',
          'EXPIRED',
          'NO_SHOW'
        ),
        allowNull: false,
        defaultValue: 'PENDING_PAYMENT',
      },
      deposit_amount: { type: Sequelize.INTEGER, allowNull: false },
      total_amount: { type: Sequelize.INTEGER, allowNull: false },
      reschedule_token: { type: Sequelize.STRING(100), unique: true },
      reschedule_token_expires_at: { type: Sequelize.DATE },
      expires_at: { type: Sequelize.DATE },
      notes: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('bookings', ['barber_id', 'date', 'status']);
    await queryInterface.addIndex('bookings', ['reference']);
    await queryInterface.addIndex('bookings', ['expires_at', 'status']);
    await queryInterface.addIndex('bookings', ['guest_customer_id']);
    await queryInterface.addIndex('bookings', ['reschedule_token']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('bookings');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_bookings_status"');
  },
};
