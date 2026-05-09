import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Mail from '../../lib/Mail';
import BookingNotification from '../models/BookingNotification';
import AdminSetting from '../models/AdminSetting';

class NotificationService {
  /**
   * Dispara todas las notificaciones cuando una reserva es CONFIRMED.
   * Fire-and-forget: los errores se loggean pero no bloquean el flujo.
   */
  async notifyConfirmation(booking) {
    const [shopPhone, shopUrl] = await Promise.all([
      AdminSetting.get('shop_phone', ''),
      AdminSetting.get('shop_url', process.env.CLIENT_URL || 'http://localhost:5174'),
    ]);

    const customer = booking.guest_customer;
    const service  = booking.service;
    const barber   = booking.barber;

    if (!customer || !service || !barber) {
      console.warn('[NotificationService] Booking sin includes completos, se omiten notificaciones.');
      return;
    }

    const bookingDate  = new Date(booking.date);
    const dateStr      = format(bookingDate, "EEEE dd 'de' MMMM 'de' yyyy", { locale: es });
    const timeStr      = format(bookingDate, "HH:mm'h'");
    const depositFmt   = '$' + Number(booking.deposit_amount).toLocaleString('es-CO');
    const balanceFmt   = '$' + Number(booking.total_amount - booking.deposit_amount).toLocaleString('es-CO');

    const rescheduleUrl = booking.reschedule_token
      ? `${shopUrl}/reschedule/${booking.reschedule_token}`
      : null;

    const rescheduleDeadline = booking.reschedule_token_expires_at
      ? format(new Date(booking.reschedule_token_expires_at), "dd MMM yyyy HH:mm'h'", { locale: es })
      : null;

    const whatsappMsg = encodeURIComponent(
      `Hola! Confirmo mi cita en TROYA BARBER STUDIO.\n` +
      `Referencia: ${booking.reference}\n` +
      `Fecha: ${dateStr} a las ${timeStr}`
    );

    const emailCtx = {
      customerName:      customer.name,
      serviceName:       service.name,
      barberName:        barber.name,
      date:              dateStr,
      time:              timeStr,
      depositPaid:       depositFmt,
      balanceDue:        balanceFmt,
      reference:         booking.reference,
      rescheduleUrl,
      rescheduleDeadline,
      whatsappNumber:    shopPhone.replace(/\D/g, ''),
      whatsappMessage:   whatsappMsg,
    };

    await Promise.allSettled([
      this._sendEmail(booking.id, customer.email, customer.name, emailCtx),
      this._logWhatsApp(booking.id, customer.phone, shopPhone.replace(/\D/g, ''), emailCtx),
    ]);
  }

  /**
   * Notificación de cancelación.
   */
  async notifyCancellation(booking, reason) {
    const shopUrl = await AdminSetting.get('shop_url', 'http://localhost:5174');
    const customer = booking.guest_customer;
    const service  = booking.service;
    if (!customer || !service) return;

    const bookingDate = new Date(booking.date);
    const ctx = {
      customerName: customer.name,
      serviceName:  service.name,
      date:         format(bookingDate, "EEEE dd 'de' MMMM", { locale: es }),
      time:         format(bookingDate, "HH:mm'h'"),
      reason:       reason || 'Cancelada',
      bookingUrl:   `${shopUrl}/book`,
    };

    await this._sendEmail(booking.id, customer.email, customer.name, ctx, 'booking_cancelled', 'Reserva cancelada — TROYA BARBER STUDIO');
  }

  async _sendEmail(bookingId, to, name, context, template = 'booking_confirmation', subject = null) {
    const shopName = await AdminSetting.get('shop_name', 'TROYA BARBER STUDIO');
    const fromEmail = await AdminSetting.get('mail_from', process.env.MAIL_USER || 'noreply@troyabarber.com');

    const record = await BookingNotification.create({
      booking_id: bookingId,
      channel: 'email',
      type: template,
      recipient: to,
      status: 'PENDING',
    });

    try {
      await Mail.sendMail({
        to: `${name} <${to}>`,
        from: `${shopName} <${fromEmail}>`,
        subject: subject || '¡Reserva confirmada! — TROYA BARBER STUDIO',
        template,
        context,
      });

      await record.update({ status: 'SENT', sent_at: new Date() });
      console.log(`[NotificationService] Email enviado a ${to}`);
    } catch (err) {
      await record.update({ status: 'FAILED', error: err.message });
      console.error(`[NotificationService] Error email a ${to}:`, err.message);
    }
  }

  async _logWhatsApp(bookingId, customerPhone, shopPhone, context) {
    // Sin Twilio/Meta API configurado, generamos el link y lo registramos.
    // El barbero puede enviarlo manualmente o automatizarlo cuando tenga credenciales.
    const waLink = `https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${context.whatsappMessage}`;

    await BookingNotification.create({
      booking_id: bookingId,
      channel: 'whatsapp',
      type: 'booking_confirmation',
      recipient: customerPhone,
      status: 'SENT',
      sent_at: new Date(),
      error: null,
    }).catch(() => {});

    console.log(`[NotificationService] WhatsApp link generado: ${waLink}`);
    return waLink;
  }
}

export default new NotificationService();
