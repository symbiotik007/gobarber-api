import Sequelize, { Model } from 'sequelize';

class PaymentWebhook extends Model {
  static init(sequelize) {
    super.init(
      {
        provider: Sequelize.STRING,
        event_type: Sequelize.STRING,
        payload: Sequelize.JSONB,
        signature: Sequelize.STRING,
        idempotency_key: Sequelize.STRING,
        processed: Sequelize.BOOLEAN,
        processed_at: Sequelize.DATE,
        error: Sequelize.TEXT,
      },
      { sequelize, underscored: true, tableName: 'payment_webhooks', updatedAt: false }
    );
    return this;
  }
}

export default PaymentWebhook;
