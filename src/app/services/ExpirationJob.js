import BookingService from './BookingService';
import logger from '../../lib/logger';

let _interval = null;

const ExpirationJob = {
  start(intervalMs = 60000) {
    if (_interval) return;
    logger.info('ExpirationJob started', { intervalMs });
    _interval = setInterval(async () => {
      try {
        await BookingService.expireStale();
        await BookingService.markStaleNoShow();
      } catch (err) {
        logger.error('ExpirationJob error', { error: err.message });
      }
    }, intervalMs);
    _interval.unref();
  },

  stop() {
    if (_interval) {
      clearInterval(_interval);
      _interval = null;
    }
  },
};

export default ExpirationJob;
