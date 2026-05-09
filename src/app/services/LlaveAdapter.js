import PaymentProvider from './PaymentProvider';
import AdminSetting from '../models/AdminSetting';

/**
 * Adaptador para pagos manuales via Bre-B / llave bancaria.
 *
 * Flujo:
 *  1. createPaymentIntent → devuelve instrucciones para que el cliente transfiera
 *  2. El cliente transfiere desde su app bancaria
 *  3. El barbero confirma desde el dashboard (verifyPayment se llama con confirmed=true)
 *
 * Cuando Nequi Business / Bancolombia API estén disponibles, solo se reemplaza
 * verifyPayment con el polling a su API — el resto del sistema no cambia.
 */
class LlaveAdapter extends PaymentProvider {
  get name() {
    return 'llave';
  }

  async createPaymentIntent({ reference, amount, customerName, description }) {
    const [llave, llaveOwner, llaveBank] = await Promise.all([
      AdminSetting.get('llave_number', ''),
      AdminSetting.get('llave_owner', 'TROYA BARBER STUDIO'),
      AdminSetting.get('llave_bank', 'Nequi'),
    ]);

    if (!llave) throw new Error('Llave de pago no configurada. Configúrala en Admin Settings.');

    return {
      provider: 'llave',
      reference,
      amount,
      currency: 'COP',
      instructions: {
        llave,
        owner: llaveOwner,
        bank: llaveBank,
        amount,
        reference,
        message: `Reserva ${reference}`,
        note: `Envía exactamente $${amount.toLocaleString('es-CO')} COP a la llave ${llave} (${llaveBank}). Incluye la referencia "${reference}" en el mensaje. El anticipo NO es reembolsable.`,
      },
      expiresInMinutes: 10,
      requiresManualConfirmation: true,
    };
  }

  async verifyPayment(reference) {
    // Con llave manual, la confirmación viene del dashboard del barbero.
    // Este método es invocado por PaymentService.confirmManual().
    // Retorna false por defecto — la confirmación es push, no pull.
    return { confirmed: false, transactionId: null, metadata: { reference } };
  }
}

export default new LlaveAdapter();
