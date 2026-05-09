import Sequelize, { Model } from 'sequelize';

class BookingNotification extends Model {
  static init(sequelize) {
    super.init(
      {
        channel: Sequelize.STRING,
        type: Sequelize.STRING,
        recipient: Sequelize.STRING,
        status: Sequelize.STRING,
        sent_at: Sequelize.DATE,
        error: Sequelize.TEXT,
      },
      { sequelize, underscored: true, tableName: 'booking_notifications', updatedAt: false }
    );
    return this;
  }

  static associate(models) {
    this.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
  }
}

export default BookingNotification;
