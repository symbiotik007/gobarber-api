// Tests for BookingService — uses Jest module mocks for all DB models.
// No real database connection is made.

jest.mock('../../src/database/index.js', () => ({}));

// ── Booking mock ──────────────────────────────────────────────────────────────
const BOOKING_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  NO_SHOW: 'NO_SHOW',
};

const VALID_TRANSITIONS = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED', 'EXPIRED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
  NO_SHOW: [],
};

class MockBooking {
  constructor(data) { Object.assign(this, data); }
  canTransitionTo(s) { return (VALID_TRANSITIONS[this.status] || []).includes(s); }
  async update(data) { Object.assign(this, data); return this; }
  async reload() { return this; }
}
MockBooking.findByPk = jest.fn();

jest.mock('../../src/app/models/Booking', () => ({
  __esModule: true,
  default: MockBooking,
  BOOKING_STATUS,
}));

jest.mock('../../src/app/models/BookingStatusHistory', () => ({
  __esModule: true,
  default: { create: jest.fn().mockResolvedValue({}) },
}));

jest.mock('../../src/app/models/GuestCustomer', () => ({
  __esModule: true,
  default: { findOrCreate: jest.fn() },
}));

jest.mock('../../src/app/models/Service', () => ({
  __esModule: true,
  default: { findByPk: jest.fn() },
}));

jest.mock('../../src/app/models/User', () => ({
  __esModule: true,
  default: { findOne: jest.fn(), findAll: jest.fn() },
}));

jest.mock('../../src/app/models/AdminSetting', () => ({
  __esModule: true,
  default: { getInt: jest.fn().mockResolvedValue(10) },
}));

jest.mock('../../src/app/services/AvailabilityService', () => ({
  __esModule: true,
  default: {
    acquireLock: jest.fn().mockResolvedValue({}),
    releaseLock: jest.fn().mockResolvedValue({}),
    pickLeastLoadedBarber: jest.fn(),
    isSlotAvailable: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../../src/app/services/PaymentService', () => ({
  __esModule: true,
  default: {
    createIntent: jest.fn().mockResolvedValue({ payment_url: 'http://pay.test' }),
    confirmManual: jest.fn().mockResolvedValue({}),
    voidPendingPayment: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../../src/app/services/NotificationService', () => ({
  __esModule: true,
  default: {
    notifyConfirmation: jest.fn().mockResolvedValue({}),
    notifyCancellation: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../../src/app/services/WorkHoursService', () => ({
  __esModule: true,
  default: { isValidSlot: jest.fn().mockResolvedValue(true) },
}));

jest.mock('../../src/app/services/AnalyticsService', () => ({
  __esModule: true,
  default: { emit: jest.fn() },
}));

jest.mock('../../src/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

// ── Import after mocks ────────────────────────────────────────────────────────
import BookingService from '../../src/app/services/BookingService';
import AvailabilityService from '../../src/app/services/AvailabilityService';
import PaymentService from '../../src/app/services/PaymentService';
import AnalyticsService from '../../src/app/services/AnalyticsService';
import BookingStatusHistory from '../../src/app/models/BookingStatusHistory';

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeBooking(overrides = {}) {
  return new MockBooking({
    id: 1,
    reference: 'test-ref-123',
    status: BOOKING_STATUS.CONFIRMED,
    deposit_amount: 15000,
    total_amount: 50000,
    barber_id: 2,
    service_id: 3,
    date: new Date(Date.now() + 86400000),
    expires_at: new Date(Date.now() + 600000),
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  BookingStatusHistory.create.mockResolvedValue({});
});

// ── cancel() ─────────────────────────────────────────────────────────────────
describe('BookingService.cancel', () => {
  test('cancels a CONFIRMED booking', async () => {
    const booking = makeBooking({ status: BOOKING_STATUS.CONFIRMED });
    MockBooking.findByPk.mockResolvedValue(booking);

    await BookingService.cancel({ bookingId: 1, reason: 'Cliente solicita', cancelledBy: 99 });

    expect(booking.status).toBe(BOOKING_STATUS.CANCELLED);
    expect(BookingStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        to_status: BOOKING_STATUS.CANCELLED,
        metadata: expect.objectContaining({ non_refundable: true }),
      })
    );
    expect(AvailabilityService.releaseLock).toHaveBeenCalled();
    expect(PaymentService.voidPendingPayment).toHaveBeenCalledWith(1);
  });

  test('cancels a PENDING_PAYMENT booking', async () => {
    const booking = makeBooking({ status: BOOKING_STATUS.PENDING_PAYMENT });
    MockBooking.findByPk.mockResolvedValue(booking);

    await BookingService.cancel({ bookingId: 1, cancelledBy: 99 });

    expect(booking.status).toBe(BOOKING_STATUS.CANCELLED);
  });

  test('throws if booking not found', async () => {
    MockBooking.findByPk.mockResolvedValue(null);
    await expect(BookingService.cancel({ bookingId: 999 })).rejects.toThrow('Reserva no encontrada.');
  });

  test('throws for COMPLETED booking (invalid transition)', async () => {
    const booking = makeBooking({ status: BOOKING_STATUS.COMPLETED });
    MockBooking.findByPk.mockResolvedValue(booking);
    await expect(BookingService.cancel({ bookingId: 1 })).rejects.toThrow(/No se puede cancelar/);
  });

  test('throws for EXPIRED booking', async () => {
    const booking = makeBooking({ status: BOOKING_STATUS.EXPIRED });
    MockBooking.findByPk.mockResolvedValue(booking);
    await expect(BookingService.cancel({ bookingId: 1 })).rejects.toThrow(/No se puede cancelar/);
  });

  test('emits booking_cancelled analytics event', async () => {
    const booking = makeBooking({ status: BOOKING_STATUS.CONFIRMED });
    MockBooking.findByPk.mockResolvedValue(booking);
    await BookingService.cancel({ bookingId: 1, reason: 'test', cancelledBy: 5 });
    expect(AnalyticsService.emit).toHaveBeenCalledWith('booking_cancelled', expect.objectContaining({ bookingId: 1 }));
  });
});

// ── complete() ────────────────────────────────────────────────────────────────
describe('BookingService.complete', () => {
  test('completes a CONFIRMED booking', async () => {
    const booking = makeBooking({ status: BOOKING_STATUS.CONFIRMED });
    MockBooking.findByPk.mockResolvedValue(booking);

    await BookingService.complete({ bookingId: 1, completedBy: 2 });

    expect(booking.status).toBe(BOOKING_STATUS.COMPLETED);
    expect(BookingStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({ to_status: BOOKING_STATUS.COMPLETED })
    );
    expect(AnalyticsService.emit).toHaveBeenCalledWith('booking_completed', expect.any(Object));
  });

  test('throws for PENDING_PAYMENT booking', async () => {
    const booking = makeBooking({ status: BOOKING_STATUS.PENDING_PAYMENT });
    MockBooking.findByPk.mockResolvedValue(booking);
    await expect(BookingService.complete({ bookingId: 1 })).rejects.toThrow(/No se puede completar/);
  });

  test('throws if booking not found', async () => {
    MockBooking.findByPk.mockResolvedValue(null);
    await expect(BookingService.complete({ bookingId: 999 })).rejects.toThrow('Reserva no encontrada.');
  });
});

// ── markNoShow() ──────────────────────────────────────────────────────────────
describe('BookingService.markNoShow', () => {
  test('marks CONFIRMED booking as NO_SHOW', async () => {
    const booking = makeBooking({ status: BOOKING_STATUS.CONFIRMED });
    MockBooking.findByPk.mockResolvedValue(booking);

    await BookingService.markNoShow({ bookingId: 1, markedBy: 2 });

    expect(booking.status).toBe(BOOKING_STATUS.NO_SHOW);
    expect(BookingStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        to_status: BOOKING_STATUS.NO_SHOW,
        metadata: expect.objectContaining({ deposit_forfeited: true }),
      })
    );
  });

  test('throws for COMPLETED booking', async () => {
    const booking = makeBooking({ status: BOOKING_STATUS.COMPLETED });
    MockBooking.findByPk.mockResolvedValue(booking);
    await expect(BookingService.markNoShow({ bookingId: 1 })).rejects.toThrow(/No se puede marcar como no-show/);
  });

  test('emits booking_no_show analytics event', async () => {
    const booking = makeBooking({ status: BOOKING_STATUS.CONFIRMED });
    MockBooking.findByPk.mockResolvedValue(booking);
    await BookingService.markNoShow({ bookingId: 1, markedBy: 3 });
    expect(AnalyticsService.emit).toHaveBeenCalledWith('booking_no_show', expect.objectContaining({ bookingId: 1 }));
  });
});
