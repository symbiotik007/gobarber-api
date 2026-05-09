import Sequelize, { Model } from 'sequelize';

export const BOOKING_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  NO_SHOW: 'NO_SHOW',
};

const VALID_TRANSITIONS = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED', 'EXPIRED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
  NO_SHOW: [],
};

class Booking extends Model {
  static init(sequelize) {
    super.init(
      {
        reference: Sequelize.UUID,
        date: Sequelize.DATE,
        status: Sequelize.STRING,
        deposit_amount: Sequelize.INTEGER,
        total_amount: Sequelize.INTEGER,
        reschedule_token: Sequelize.STRING,
        reschedule_token_expires_at: Sequelize.DATE,
        expires_at: Sequelize.DATE,
        notes: Sequelize.TEXT,
        branch_id: Sequelize.INTEGER,
        is_expired: {
          type: Sequelize.VIRTUAL,
          get() {
            return this.expires_at && new Date() > this.expires_at;
          },
        },
      },
      { sequelize, underscored: true, tableName: 'bookings' }
    );
    return this;
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'barber_id', as: 'barber' });
    this.belongsTo(models.Service, { foreignKey: 'service_id', as: 'service' });
    this.belongsTo(models.GuestCustomer, { foreignKey: 'guest_customer_id', as: 'guest_customer' });
    this.hasMany(models.BookingStatusHistory, { foreignKey: 'booking_id', as: 'status_history' });
    this.hasMany(models.Payment, { foreignKey: 'booking_id', as: 'payments' });
    this.hasMany(models.BookingNotification, { foreignKey: 'booking_id', as: 'notifications' });
    this.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
  }

  canTransitionTo(newStatus) {
    return VALID_TRANSITIONS[this.status]?.includes(newStatus) ?? false;
  }
}

export default Booking;
