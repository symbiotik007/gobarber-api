import Sequelize, { Model } from 'sequelize';

class BookingStatusHistory extends Model {
  static init(sequelize) {
    super.init(
      {
        from_status: Sequelize.STRING,
        to_status: Sequelize.STRING,
        reason: Sequelize.TEXT,
        metadata: Sequelize.JSONB,
      },
      { sequelize, underscored: true, tableName: 'booking_status_history', updatedAt: false }
    );
    return this;
  }

  static associate(models) {
    this.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
  }
}

export default BookingStatusHistory;
