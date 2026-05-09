import '../src/database/index.js';
import Booking from '../src/app/models/Booking.js';
import GuestCustomer from '../src/app/models/GuestCustomer.js';
import Service from '../src/app/models/Service.js';
import User from '../src/app/models/User.js';
import NotificationService from '../src/app/services/NotificationService.js';

const REF = process.argv[2];
if (!REF) { console.error('Uso: node scripts/testNotification.js <reference>'); process.exit(1); }

setTimeout(async () => {
  try {
    const booking = await Booking.findOne({
      where: { reference: REF },
      include: [
        { model: GuestCustomer, as: 'guest_customer' },
        { model: Service, as: 'service' },
        { model: User, as: 'barber', attributes: ['id', 'name'] },
      ],
    });

    if (!booking) { console.error('Reserva no encontrada:', REF); process.exit(1); }

    console.log('Reserva encontrada:', booking.status);
    console.log('Cliente:', booking.guest_customer?.name, '<' + booking.guest_customer?.email + '>');
    console.log('Enviando notificación...');

    await NotificationService.notifyConfirmation(booking);
    console.log('✓ Notificación enviada. Revisa Mailtrap.');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}, 2000);
