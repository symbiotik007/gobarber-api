// Tests for AvailabilityService — mocks Booking, AvailabilityLock, User models.

jest.mock('../../src/database/index.js', () => ({}));

const BOOKING_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  CONFIRMED: 'CONFIRMED',
};

const mockBookingFindAll = jest.fn();
const mockBookingCount = jest.fn();
const mockLockFindAll = jest.fn();
const mockLockFindOrCreate = jest.fn();
const mockLockDestroy = jest.fn();
const mockUserFindAll = jest.fn();

jest.mock('../../src/app/models/Booking', () => ({
  __esModule: true,
  default: {
    findAll: mockBookingFindAll,
    count: mockBookingCount,
  },
  BOOKING_STATUS,
}));

jest.mock('../../src/app/models/AvailabilityLock', () => ({
  __esModule: true,
  default: {
    findAll: mockLockFindAll,
    findOrCreate: mockLockFindOrCreate,
    destroy: mockLockDestroy,
  },
}));

jest.mock('../../src/app/models/AdminSetting', () => ({
  __esModule: true,
  default: { getInt: jest.fn().mockResolvedValue(10) },
}));

jest.mock('../../src/app/models/User', () => ({
  __esModule: true,
  default: { findAll: mockUserFindAll },
}));

import AvailabilityService from '../../src/app/services/AvailabilityService';

const TEST_DATE = new Date('2027-06-15T10:00:00.000Z');

beforeEach(() => {
  jest.clearAllMocks();
  mockLockDestroy.mockResolvedValue(0);
});

// ── getOccupiedSlots ──────────────────────────────────────────────────────────
describe('AvailabilityService.getOccupiedSlots', () => {
  test('returns union of booking dates and lock dates', async () => {
    const slot1 = new Date('2027-06-15T10:00:00.000Z');
    const slot2 = new Date('2027-06-15T11:00:00.000Z');
    const slot3 = new Date('2027-06-15T14:00:00.000Z');

    mockBookingFindAll.mockResolvedValue([{ date: slot1 }, { date: slot2 }]);
    mockLockFindAll.mockResolvedValue([{ date: slot3 }]);

    const result = await AvailabilityService.getOccupiedSlots(1, TEST_DATE);

    expect(result.has(slot1.toISOString())).toBe(true);
    expect(result.has(slot2.toISOString())).toBe(true);
    expect(result.has(slot3.toISOString())).toBe(true);
    expect(result.size).toBe(3);
  });

  test('returns empty set when nothing is booked', async () => {
    mockBookingFindAll.mockResolvedValue([]);
    mockLockFindAll.mockResolvedValue([]);
    const result = await AvailabilityService.getOccupiedSlots(1, TEST_DATE);
    expect(result.size).toBe(0);
  });

  test('deduplicates overlapping booking + lock on same slot', async () => {
    const slot = new Date('2027-06-15T10:00:00.000Z');
    mockBookingFindAll.mockResolvedValue([{ date: slot }]);
    mockLockFindAll.mockResolvedValue([{ date: slot }]);
    const result = await AvailabilityService.getOccupiedSlots(1, TEST_DATE);
    expect(result.size).toBe(1);
  });
});

// ── isSlotAvailable ───────────────────────────────────────────────────────────
describe('AvailabilityService.isSlotAvailable', () => {
  test('returns true when slot is free', async () => {
    mockBookingFindAll.mockResolvedValue([]);
    mockLockFindAll.mockResolvedValue([]);
    expect(await AvailabilityService.isSlotAvailable(1, TEST_DATE)).toBe(true);
  });

  test('returns false when occupied by booking', async () => {
    mockBookingFindAll.mockResolvedValue([{ date: TEST_DATE }]);
    mockLockFindAll.mockResolvedValue([]);
    expect(await AvailabilityService.isSlotAvailable(1, TEST_DATE)).toBe(false);
  });

  test('returns false when occupied by lock', async () => {
    mockBookingFindAll.mockResolvedValue([]);
    mockLockFindAll.mockResolvedValue([{ date: TEST_DATE }]);
    expect(await AvailabilityService.isSlotAvailable(1, TEST_DATE)).toBe(false);
  });
});

// ── releaseLock ───────────────────────────────────────────────────────────────
describe('AvailabilityService.releaseLock', () => {
  test('destroys lock for given barber + date', async () => {
    await AvailabilityService.releaseLock(2, TEST_DATE);
    expect(mockLockDestroy).toHaveBeenCalledWith({
      where: { barber_id: 2, date: new Date(TEST_DATE) },
    });
  });
});

// ── acquireLock ───────────────────────────────────────────────────────────────
describe('AvailabilityService.acquireLock', () => {
  test('creates a new lock when slot is free', async () => {
    mockBookingFindAll.mockResolvedValue([]);
    mockLockFindAll.mockResolvedValue([]);
    const fakeLock = { expires_at: new Date(Date.now() + 600000) };
    mockLockFindOrCreate.mockResolvedValue([fakeLock, true]);

    const lock = await AvailabilityService.acquireLock(1, TEST_DATE, 'user@test.com');
    expect(lock).toBe(fakeLock);
    expect(mockLockFindOrCreate).toHaveBeenCalled();
  });

  test('throws when slot is already occupied', async () => {
    mockBookingFindAll.mockResolvedValue([{ date: TEST_DATE }]);
    mockLockFindAll.mockResolvedValue([]);

    await expect(
      AvailabilityService.acquireLock(1, TEST_DATE, 'user@test.com')
    ).rejects.toThrow('Este horario ya no está disponible');
  });
});

// ── getFullyOccupiedSlots ─────────────────────────────────────────────────────
describe('AvailabilityService.getFullyOccupiedSlots', () => {
  test('returns empty set when no barbers exist', async () => {
    mockUserFindAll.mockResolvedValue([]);
    const result = await AvailabilityService.getFullyOccupiedSlots(TEST_DATE);
    expect(result.size).toBe(0);
  });

  test('marks slot fully occupied only when ALL barbers have it', async () => {
    mockUserFindAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const slot = new Date('2027-06-15T10:00:00.000Z');

    // Both barbers have this slot occupied
    mockBookingFindAll
      .mockResolvedValueOnce([{ date: slot }])
      .mockResolvedValueOnce([{ date: slot }]);
    mockLockFindAll.mockResolvedValue([]);

    const result = await AvailabilityService.getFullyOccupiedSlots(TEST_DATE);
    expect(result.has(slot.toISOString())).toBe(true);
  });

  test('does not mark slot occupied when only one barber has it', async () => {
    mockUserFindAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const slot = new Date('2027-06-15T10:00:00.000Z');

    // Only barber 1 is busy; barber 2 is free
    mockBookingFindAll
      .mockResolvedValueOnce([{ date: slot }])
      .mockResolvedValueOnce([]);
    mockLockFindAll.mockResolvedValue([]);

    const result = await AvailabilityService.getFullyOccupiedSlots(TEST_DATE);
    expect(result.has(slot.toISOString())).toBe(false);
  });
});
