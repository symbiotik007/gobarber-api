import Sequelize, { Model } from 'sequelize';

class Service extends Model {
  static init(sequelize) {
    super.init(
      {
        name: Sequelize.STRING,
        duration_minutes: Sequelize.INTEGER,
        price: Sequelize.INTEGER,
        deposit_min: Sequelize.INTEGER,
        deposit_max: Sequelize.INTEGER,
        deposit_percentage_max: Sequelize.INTEGER,
        is_active: Sequelize.BOOLEAN,
        barber_id: Sequelize.INTEGER,
      },
      { sequelize, underscored: true, tableName: 'services' }
    );
    return this;
  }

  validateDeposit(amount) {
    if (amount < this.deposit_min) return false;
    const maxByPercent = Math.floor(this.price * (this.deposit_percentage_max / 100));
    const cap = Math.min(this.deposit_max, maxByPercent);
    return amount <= cap;
  }

  get depositRange() {
    const maxByPercent = Math.floor(this.price * (this.deposit_percentage_max / 100));
    return { min: this.deposit_min, max: Math.min(this.deposit_max, maxByPercent) };
  }
}

export default Service;
