import Sequelize, { Model } from 'sequelize';

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  DECLINED: 'DECLINED',
  VOIDED: 'VOIDED',
  ERROR: 'ERROR',
};

class Payment extends Model {
  static init(sequelize) {
    super.init(
      {
        provider: Sequelize.STRING,
        transaction_id: Sequelize.STRING,
        reference: Sequelize.STRING,
        status: Sequelize.STRING,
        amount: Sequelize.INTEGER,
        currency: Sequelize.STRING,
        metadata: Sequelize.JSONB,
      },
      { sequelize, underscored: true, tableName: 'payments' }
    );
    return this;
  }

  static associate(models) {
    this.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
    this.hasMany(models.PaymentAttempt, { foreignKey: 'booking_id', sourceKey: 'booking_id', as: 'attempts' });
  }

  get isApproved() {
    return this.status === PAYMENT_STATUS.APPROVED;
  }
}

export default Payment;
