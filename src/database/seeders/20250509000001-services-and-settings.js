'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('services', [
      {
        name: 'Corte',
        duration_minutes: 30,
        price: 35000,
        deposit_min: 5000,
        deposit_max: 10000,
        deposit_percentage_max: 30,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Corte + Barba',
        duration_minutes: 50,
        price: 50000,
        deposit_min: 10000,
        deposit_max: 15000,
        deposit_percentage_max: 30,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Barba',
        duration_minutes: 25,
        price: 20000,
        deposit_min: 5000,
        deposit_max: 8000,
        deposit_percentage_max: 30,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Corte + Barba + Tinte',
        duration_minutes: 90,
        price: 80000,
        deposit_min: 15000,
        deposit_max: 25000,
        deposit_percentage_max: 30,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('admin_settings', [
      {
        key: 'booking_expiry_minutes',
        value: '15',
        description: 'Minutos antes de que expire una reserva PENDING_PAYMENT sin pago',
        created_at: now,
        updated_at: now,
      },
      {
        key: 'payment_provider',
        value: 'llave',
        description: 'Proveedor de pagos activo',
        created_at: now,
        updated_at: now,
      },
      {
        key: 'reschedule_window_hours',
        value: '24',
        description: 'Horas antes de la cita en que se permite reagendar',
        created_at: now,
        updated_at: now,
      },
      {
        key: 'shop_name',
        value: 'TROYA BARBER STUDIO',
        description: 'Nombre del establecimiento',
        created_at: now,
        updated_at: now,
      },
      {
        key: 'shop_phone',
        value: '+573017381452',
        description: 'Teléfono de contacto',
        created_at: now,
        updated_at: now,
      },
      {
        key: 'shop_address',
        value: 'Calle 18 #49-75, Pasto, Nariño',
        description: 'Dirección física',
        created_at: now,
        updated_at: now,
      },
      {
        key: 'llave_number',
        value: '',
        description: 'Número de llave Bre-B / Nequi para recibir anticipos',
        created_at: now,
        updated_at: now,
      },
      {
        key: 'llave_owner',
        value: 'TROYA BARBER STUDIO',
        description: 'Nombre del titular de la llave',
        created_at: now,
        updated_at: now,
      },
      {
        key: 'llave_bank',
        value: 'Nequi',
        description: 'Banco o billetera de la llave (Nequi, Daviplata, etc.)',
        created_at: now,
        updated_at: now,
      },
      {
        key: 'wompi_public_key',
        value: '',
        description: 'Llave pública de Wompi',
        created_at: now,
        updated_at: now,
      },
      {
        key: 'wompi_private_key',
        value: '',
        description: 'Llave privada de Wompi (secreta)',
        created_at: now,
        updated_at: now,
      },
      {
        key: 'wompi_events_secret',
        value: '',
        description: 'Secreto para verificar webhooks de Wompi',
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('admin_settings', null, {});
    await queryInterface.bulkDelete('services', null, {});
  },
};
