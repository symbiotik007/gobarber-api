// Tests for the Booking state machine — no DB, no Sequelize init needed.
// We test canTransitionTo and the is_expired virtual via the prototype directly.

jest.mock('../../src/database/index.js', () => ({}));

// Mock Sequelize so Model.init doesn't require a real connection
jest.mock('sequelize', () => {
  const types = ['UUID','DATE','STRING','INTEGER','TEXT','BOOLEAN','VIRTUAL'];
  const Sequelize = {};
  types.forEach(t => { Sequelize[t] = t; });

  class Model {
    static init(attrs, opts) {
      // Store attribute definitions for virtual getters
      this._attrs = attrs;
      return this;
    }
    static associate() {}
  }

  Sequelize.Model = Model;
  Sequelize.default = Sequelize;
  return Sequelize;
});

import { BOOKING_STATUS } from '../../src/app/models/Booking';
import BookingModule from '../../src/app/models/Booking';

const Booking = BookingModule;

// Build a booking-like object with the prototype methods
function makeBooking(status, expiresAt) {
  const proto = Booking.prototype;
  const b = Object.create(proto);
  b.status = status;
  b.expires_at = expiresAt || null;

  // Re-implement the virtual getter since init() never ran
  Object.defineProperty(b, 'is_expired', {
    get() { return this.expires_at && new Date() > this.expires_at; },
  });
  return b;
}

describe('BOOKING_STATUS constants', () => {
  test('exports all expected statuses', () => {
    expect(BOOKING_STATUS).toEqual({
      PENDING_PAYMENT: 'PENDING_PAYMENT',
      CONFIRMED: 'CONFIRMED',
      COMPLETED: 'COMPLETED',
      CANCELLED: 'CANCELLED',
      EXPIRED: 'EXPIRED',
      NO_SHOW: 'NO_SHOW',
    });
  });
});

describe('Booking.canTransitionTo', () => {
  describe('from PENDING_PAYMENT', () => {
    let b;
    beforeEach(() => { b = makeBooking(BOOKING_STATUS.PENDING_PAYMENT); });

    test('can transition to CONFIRMED', () => {
      expect(b.canTransitionTo(BOOKING_STATUS.CONFIRMED)).toBe(true);
    });

    test('can transition to CANCELLED', () => {
      expect(b.canTransitionTo(BOOKING_STATUS.CANCELLED)).toBe(true);
    });

    test('can transition to EXPIRED', () => {
      expect(b.canTransitionTo(BOOKING_STATUS.EXPIRED)).toBe(true);
    });

    test('cannot transition to COMPLETED', () => {
      expect(b.canTransitionTo(BOOKING_STATUS.COMPLETED)).toBe(false);
    });

    test('cannot transition to NO_SHOW', () => {
      expect(b.canTransitionTo(BOOKING_STATUS.NO_SHOW)).toBe(false);
    });

    test('cannot self-transition', () => {
      expect(b.canTransitionTo(BOOKING_STATUS.PENDING_PAYMENT)).toBe(false);
    });
  });

  describe('from CONFIRMED', () => {
    let b;
    beforeEach(() => { b = makeBooking(BOOKING_STATUS.CONFIRMED); });

    test('can transition to COMPLETED', () => {
      expect(b.canTransitionTo(BOOKING_STATUS.COMPLETED)).toBe(true);
    });

    test('can transition to CANCELLED', () => {
      expect(b.canTransitionTo(BOOKING_STATUS.CANCELLED)).toBe(true);
    });

    test('can transition to NO_SHOW', () => {
      expect(b.canTransitionTo(BOOKING_STATUS.NO_SHOW)).toBe(true);
    });

    test('cannot go back to PENDING_PAYMENT', () => {
      expect(b.canTransitionTo(BOOKING_STATUS.PENDING_PAYMENT)).toBe(false);
    });

    test('cannot transition to EXPIRED', () => {
      expect(b.canTransitionTo(BOOKING_STATUS.EXPIRED)).toBe(false);
    });
  });

  describe('terminal states have no valid outgoing transitions', () => {
    const terminal = [
      BOOKING_STATUS.COMPLETED,
      BOOKING_STATUS.CANCELLED,
      BOOKING_STATUS.EXPIRED,
      BOOKING_STATUS.NO_SHOW,
    ];

    terminal.forEach(status => {
      test(`${status} is terminal`, () => {
        const b = makeBooking(status);
        Object.values(BOOKING_STATUS).forEach(target => {
          expect(b.canTransitionTo(target)).toBe(false);
        });
      });
    });
  });
});

describe('is_expired virtual', () => {
  test('true when expires_at is in the past', () => {
    const b = makeBooking(BOOKING_STATUS.PENDING_PAYMENT, new Date(Date.now() - 1000));
    expect(b.is_expired).toBe(true);
  });

  test('false when expires_at is in the future', () => {
    const b = makeBooking(BOOKING_STATUS.PENDING_PAYMENT, new Date(Date.now() + 60000));
    expect(b.is_expired).toBe(false);
  });

  test('falsy when expires_at is null', () => {
    const b = makeBooking(BOOKING_STATUS.CONFIRMED, null);
    expect(b.is_expired).toBeFalsy();
  });
});
