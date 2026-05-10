'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE users SET provider = true WHERE email = 'admin@troya.com'`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE users SET provider = false WHERE email = 'admin@troya.com'`
    );
  },
};
