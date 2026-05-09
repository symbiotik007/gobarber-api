import Sequelize, { Model } from 'sequelize';

class Branch extends Model {
  static init(sequelize) {
    super.init(
      {
        name: Sequelize.STRING(120),
        address: Sequelize.STRING(255),
        phone: Sequelize.STRING(30),
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      },
      { sequelize, underscored: true, tableName: 'branches' }
    );
    return this;
  }

  static associate(models) {
    this.hasMany(models.Booking, { foreignKey: 'branch_id', as: 'bookings' });
  }
}

export default Branch;
