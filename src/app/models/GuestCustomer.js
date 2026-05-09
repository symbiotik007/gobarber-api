import Sequelize, { Model } from 'sequelize';

class GuestCustomer extends Model {
  static init(sequelize) {
    super.init(
      {
        name: Sequelize.STRING,
        email: Sequelize.STRING,
        phone: Sequelize.STRING,
      },
      { sequelize, underscored: true, tableName: 'guest_customers' }
    );
    return this;
  }

  static associate(models) {
    this.hasMany(models.Booking, { foreignKey: 'guest_customer_id', as: 'bookings' });
  }
}

export default GuestCustomer;
