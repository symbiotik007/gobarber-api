import Sequelize, { Model } from 'sequelize';

class PaymentAttempt extends Model {
  static init(sequelize) {
    super.init(
      {
        provider: Sequelize.STRING,
        reference: Sequelize.STRING,
        amount: Sequelize.INTEGER,
        status: Sequelize.STRING,
        error_message: Sequelize.TEXT,
        metadata: Sequelize.JSONB,
      },
      { sequelize, underscored: true, tableName: 'payment_attempts', updatedAt: false }
    );
    return this;
  }

  static associate(models) {
    this.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
  }
}

export default PaymentAttempt;
