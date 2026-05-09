import { v4 as uuidv4 } from 'uuid';
import LlaveAdapter from './LlaveAdapter';
import Payment, { PAYMENT_STATUS } from '../models/Payment';
import PaymentAttempt from '../models/PaymentAttempt';
import AdminSetting from '../models/AdminSetting';

const ADAPTERS = {
  llave: LlaveAdapter,
};

class PaymentService {
  async getActiveAdapter() {
    const provider = await AdminSetting.get('payment_provider', 'llave');
    const adapter = ADAPTERS[provider];
    if (!adapter) throw new Error(`Proveedor de pago desconocido: ${provider}`);
    return adapter;
  }

  /**
   * Genera el intent de pago y crea el registro Payment en PENDING.
   */
  async createIntent({ booking, service, customer }) {
    const adapter = await this.getActiveAdapter();
    const reference = `TRY-${booking.reference.split('-')[0].toUpperCase()}`;

    const intent = await adapter.createPaymentIntent({
      reference,
      amount: booking.deposit_amount,
      customerName: customer.name,
      description: `${service.name} — ${customer.name}`,
    });

    await Payment.create({
      booking_id: booking.id,
      provider: adapter.name,
      reference,
      transaction_id: null,
      status: PAYMENT_STATUS.PENDING,
      amount: booking.deposit_amount,
      currency: 'COP',
      metadata: intent,
    });

    await PaymentAttempt.create({
      booking_id: booking.id,
      provider: adapter.name,
      reference,
      amount: booking.deposit_amount,
      status: PAYMENT_STATUS.PENDING,
      metadata: intent,
    });

    return intent;
  }

  /**
   * Confirmación manual de pago (barbero confirma desde dashboard).
   * Política: no reembolsable — se registra en metadata.
   */
  async confirmManual({ bookingId, confirmedBy, transactionId = null }) {
    const payment = await Payment.findOne({
      where: { booking_id: bookingId, status: PAYMENT_STATUS.PENDING },
    });

    if (!payment) throw new Error('No hay pago pendiente para esta reserva.');

    const txId = transactionId || `MANUAL-${uuidv4().split('-')[0].toUpperCase()}`;

    await payment.update({
      status: PAYMENT_STATUS.APPROVED,
      transaction_id: txId,
      metadata: {
        ...payment.metadata,
        confirmed_by: confirmedBy,
        confirmed_at: new Date().toISOString(),
        non_refundable: true,
        confirmation_method: 'manual_dashboard',
      },
    });

    await PaymentAttempt.create({
      booking_id: bookingId,
      provider: payment.provider,
      reference: payment.reference,
      amount: payment.amount,
      status: PAYMENT_STATUS.APPROVED,
      metadata: { confirmed_by: confirmedBy, transaction_id: txId },
    });

    return payment;
  }

  /**
   * Marca el pago como DECLINED cuando la reserva expira sin confirmar.
   */
  async voidPendingPayment(bookingId) {
    const payment = await Payment.findOne({
      where: { booking_id: bookingId, status: PAYMENT_STATUS.PENDING },
    });
    if (!payment) return null;

    await payment.update({ status: PAYMENT_STATUS.VOIDED });
    return payment;
  }
}

export default new PaymentService();
