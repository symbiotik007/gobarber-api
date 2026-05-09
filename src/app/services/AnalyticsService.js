import eventBus from '../../lib/eventBus';
import logger from '../../lib/logger';

const EVENTS = [
  'booking_created',
  'booking_confirmed',
  'booking_expired',
  'booking_cancelled',
  'booking_no_show',
  'booking_completed',
  'reschedule_completed',
];

function track(event, payload = {}) {
  logger.info(event, { analytics: true, ...payload });
}

class AnalyticsService {
  init() {
    EVENTS.forEach(event => {
      eventBus.on(event, payload => track(event, payload));
    });

    // Fraud suspect is already logged in middleware, but also expose as event
    eventBus.on('fraud_suspect', payload => {
      logger.warn('fraud_suspect', { analytics: true, ...payload });
    });
  }

  emit(event, payload = {}) {
    eventBus.emit(event, { ...payload, ts: new Date().toISOString() });
  }
}

export default new AnalyticsService();
