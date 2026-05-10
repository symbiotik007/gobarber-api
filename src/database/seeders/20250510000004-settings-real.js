'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    const updates = {
      shop_name:    'TROYA BARBER STUDIO',
      shop_phone:   '+573011581652',
      shop_address: 'Cl 18 #30-70, Pasto, Nariño, Colombia',
      shop_url:     'https://gobarber-client-ozzy.vercel.app',
      llave_number: '3011581652',
      llave_owner:  'TROYA BARBER STUDIO',
      llave_bank:   'Nequi',
    };

    for (const [key, value] of Object.entries(updates)) {
      await queryInterface.bulkUpdate(
        'admin_settings',
        { value, updated_at: now },
        { key }
      );
    }
  },

  down: async () => {},
};
