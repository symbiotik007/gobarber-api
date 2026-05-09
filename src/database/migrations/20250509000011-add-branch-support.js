'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Tabla de sucursales
    await queryInterface.createTable('branches', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING(120), allowNull: false },
      address: { type: Sequelize.STRING(255) },
      phone: { type: Sequelize.STRING(30) },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    // branch_id en bookings (nullable — NULL = sucursal principal / sin multisucursal)
    await queryInterface.addColumn('bookings', 'branch_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'branches', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // branch_id en availability_locks
    await queryInterface.addColumn('availability_locks', 'branch_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'branches', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // branch_id en admin_settings (para config por sucursal futura)
    await queryInterface.addColumn('admin_settings', 'branch_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'branches', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addIndex('bookings', ['branch_id']);
    await queryInterface.addIndex('admin_settings', ['branch_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('admin_settings', 'branch_id');
    await queryInterface.removeColumn('availability_locks', 'branch_id');
    await queryInterface.removeColumn('bookings', 'branch_id');
    await queryInterface.dropTable('branches');
  },
};
