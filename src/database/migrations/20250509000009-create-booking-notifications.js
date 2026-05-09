'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('booking_notifications', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bookings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      channel: { type: Sequelize.STRING(30), allowNull: false },
      type: { type: Sequelize.STRING(50), allowNull: false },
      recipient: { type: Sequelize.STRING(200), allowNull: false },
      status: {
        type: Sequelize.ENUM('PENDING', 'SENT', 'FAILED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      sent_at: { type: Sequelize.DATE },
      error: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('booking_notifications', ['booking_id']);
    await queryInterface.addIndex('booking_notifications', ['status']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('booking_notifications');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_booking_notifications_status"');
  },
};
