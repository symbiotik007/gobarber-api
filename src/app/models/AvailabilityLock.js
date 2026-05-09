import Sequelize, { Model } from 'sequelize';

class AvailabilityLock extends Model {
  static init(sequelize) {
    super.init(
      {
        date: Sequelize.DATE,
        locked_by: Sequelize.STRING,
        expires_at: Sequelize.DATE,
        branch_id: Sequelize.INTEGER,
      },
      { sequelize, underscored: true, tableName: 'availability_locks', updatedAt: false }
    );
    return this;
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'barber_id', as: 'barber' });
  }

  get isExpired() {
    return new Date() > this.expires_at;
  }
}

export default AvailabilityLock;
