'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE users SET provider = false WHERE email IN ('admin@troya.com', 'barbeiro@gobarber.com', 'oa@gmail.com')`
    );
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE users SET provider = true WHERE email IN ('admin@troya.com', 'barbeiro@gobarber.com', 'oa@gmail.com')`
    );
  },
};
