/**
 * Contrato base para cualquier proveedor de pago.
 * Cada adaptador concreto debe implementar estos métodos.
 */
class PaymentProvider {
  get name() {
    throw new Error('PaymentProvider.name must be implemented');
  }

  /**
   * Genera las instrucciones de pago para mostrarle al cliente.
   * @param {Object} params
   * @param {string} params.reference - Referencia única del booking
   * @param {number} params.amount - Monto en COP (entero, sin decimales)
   * @param {string} params.customerName
   * @param {string} params.description
   * @returns {Promise<PaymentIntent>}
   */
  // eslint-disable-next-line no-unused-vars
  async createPaymentIntent({ reference, amount, customerName, description }) {
    throw new Error('PaymentProvider.createPaymentIntent must be implemented');
  }

  /**
   * Verifica si un pago fue recibido. Usado para polling o confirmación manual.
   * @param {string} reference
   * @returns {Promise<{confirmed: boolean, transactionId: string|null, metadata: Object}>}
   */
  // eslint-disable-next-line no-unused-vars
  async verifyPayment(reference) {
    throw new Error('PaymentProvider.verifyPayment must be implemented');
  }

  /**
   * Valida la firma de un webhook entrante.
   * @param {Object} payload
   * @param {string} signature
   * @returns {boolean}
   */
  // eslint-disable-next-line no-unused-vars
  validateWebhookSignature(payload, signature) {
    return true;
  }
}

export default PaymentProvider;
