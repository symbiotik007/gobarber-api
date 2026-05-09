import Sequelize, { Model } from 'sequelize';

class AdminSetting extends Model {
  static init(sequelize) {
    super.init(
      {
        key: Sequelize.STRING,
        value: Sequelize.TEXT,
        description: Sequelize.TEXT,
      },
      { sequelize, underscored: true, tableName: 'admin_settings' }
    );
    return this;
  }

  static async get(key, defaultValue = null) {
    const setting = await this.findOne({ where: { key } });
    return setting ? setting.value : defaultValue;
  }

  static async getInt(key, defaultValue = 0) {
    const val = await this.get(key, String(defaultValue));
    return parseInt(val, 10);
  }

  static async set(key, value) {
    const [setting] = await this.findOrCreate({ where: { key }, defaults: { value: String(value) } });
    if (setting.value !== String(value)) {
      setting.value = String(value);
      await setting.save();
    }
    return setting;
  }
}

export default AdminSetting;
