import { beforeEach, describe, expect, it } from 'vitest';
import { ExpectedPresenceService } from './expected-presence-service.js';
import { MockM365Calendar } from '../../infrastructure/adapters/mock-m365-calendar.js';
import { InMemoryCheckInEventRepository } from '../../infrastructure/repositories/in-memory-check-in-event-repository.js';
import { InMemoryVisitBookingRepository } from '../../infrastructure/repositories/in-memory-visit-booking-repository.js';
import { InMemoryVisitorRepository } from '../../infrastructure/repositories/in-memory-visitor-repository.js';

const DATE = '2026-05-31';

describe('ExpectedPresenceService', () => {
  let calendar: MockM365Calendar;
  let visitBookings: InMemoryVisitBookingRepository;
  let checkInEvents: InMemoryCheckInEventRepository;
  let visitors: InMemoryVisitorRepository;
  let service: ExpectedPresenceService;

  beforeEach(() => {
    visitBookings = new InMemoryVisitBookingRepository();
    checkInEvents = new InMemoryCheckInEventRepository();
    visitors = new InMemoryVisitorRepository();
  });

  const buildService = () =>
    new ExpectedPresenceService(calendar, visitBookings, checkInEvents, visitors);

  describe('staff from M365 calendar', () => {
    it('returns staff expected on the given date', async () => {
      calendar = new MockM365Calendar([
        { personId: 'emp-03', displayName: 'Priya Shah', personType: 'employee', source: 'm365-calendar', date: DATE },
        { personId: 'emp-10', displayName: 'Dev Anand', personType: 'employee', source: 'm365-calendar', date: DATE },
      ]);
      service = buildService();

      const expected = await service.expectedOn(DATE);
      expect(expected).toHaveLength(2);
      expect(expected.map((e) => e.personId)).toContain('emp-03');
      expect(expected.map((e) => e.personId)).toContain('emp-10');
    });

    it('returns no staff for a different date', async () => {
      calendar = new MockM365Calendar([
        { personId: 'emp-03', displayName: 'Priya Shah', personType: 'employee', source: 'm365-calendar', date: DATE },
      ]);
      service = buildService();

      const expected = await service.expectedOn('2026-06-01');
      expect(expected).toHaveLength(0);
    });
  });

  describe('visitors from active bookings', () => {
    beforeEach(() => {
      calendar = new MockM365Calendar([]);
    });

    it('returns visitors with active bookings covering the date', async () => {
      visitors.seed({ id: 'vis-01', name: 'Dana Okoro', email: null, company: null, host: 'Gary', visitReason: 'r', visitCategory: 'contractor', createdAt: '' });
      await visitBookings.create({ visitorId: 'vis-01', host: 'Gary', startDate: '2026-05-30', endDate: '2026-06-12', passToken: 'tok', passCode: 'CODE' });

      service = buildService();
      const expected = await service.expectedOn(DATE);

      expect(expected).toHaveLength(1);
      expect(expected[0]?.personId).toBe('vis-01');
      expect(expected[0]?.displayName).toBe('Dana Okoro');
      expect(expected[0]?.source).toBe('visit-booking');
      expect(expected[0]?.visitCategory).toBe('contractor');
    });

    it('excludes bookings whose window does not cover the date', async () => {
      visitors.seed({ id: 'vis-02', name: 'Future', email: null, company: null, host: 'H', visitReason: 'r', visitCategory: null, createdAt: '' });
      await visitBookings.create({ visitorId: 'vis-02', host: 'H', startDate: '2026-06-01', endDate: '2026-06-05', passToken: null, passCode: null });

      service = buildService();
      const expected = await service.expectedOn(DATE);
      expect(expected).toHaveLength(0);
    });
  });

  describe('checkedInToday', () => {
    beforeEach(() => {
      calendar = new MockM365Calendar([
        { personId: 'emp-03', displayName: 'Priya Shah', personType: 'employee', source: 'm365-calendar', date: DATE },
        { personId: 'emp-04', displayName: 'Gary Cooper', personType: 'employee', source: 'm365-calendar', date: DATE },
      ]);
    });

    it('marks checkedInToday true for people currently on site', async () => {
      // Gary is on site
      checkInEvents.seed({
        id: 'evt-1',
        personId: 'emp-04',
        personType: 'employee',
        direction: 'in',
        method: 'qr',
        locationId: 'loc-reception',
        displayName: 'Gary Cooper',
        timestamp: `${DATE}T07:55:00.000Z`,
      });

      service = buildService();
      const expected = await service.expectedOn(DATE);

      const gary = expected.find((e) => e.personId === 'emp-04');
      const priya = expected.find((e) => e.personId === 'emp-03');
      expect(gary).toBeDefined();
      expect(priya).toBeDefined();
      expect(gary!.checkedInToday).toBe(true);
      expect(priya!.checkedInToday).toBe(false);
    });

    it('marks amber visitors as checkedInToday false', async () => {
      // Bram is expected (active booking) but not on site
      visitors.seed({ id: 'vis-02', name: 'Bram de Vries', email: null, company: null, host: 'Gary', visitReason: 'r', visitCategory: 'contractor', createdAt: '' });
      await visitBookings.create({ visitorId: 'vis-02', host: 'Gary', startDate: '2026-05-28', endDate: '2026-06-06', passToken: 'tok', passCode: 'CODE' });

      service = buildService();
      const expected = await service.expectedOn(DATE);

      const bram = expected.find((e) => e.personId === 'vis-02');
      expect(bram).toBeDefined();
      expect(bram!.checkedInToday).toBe(false);
    });
  });

  describe('union — no duplicates', () => {
    it('does not duplicate a person who appears in both calendar and bookings', async () => {
      // In practice staff won't have visit bookings, but guard against it
      calendar = new MockM365Calendar([
        { personId: 'emp-03', displayName: 'Priya Shah', personType: 'employee', source: 'm365-calendar', date: DATE },
      ]);
      visitors.seed({ id: 'emp-03', name: 'Priya Shah', email: null, company: null, host: 'H', visitReason: 'r', visitCategory: null, createdAt: '' });
      await visitBookings.create({ visitorId: 'emp-03', host: 'H', startDate: DATE, endDate: DATE, passToken: null, passCode: null });

      service = buildService();
      const expected = await service.expectedOn(DATE);

      expect(expected.filter((e) => e.personId === 'emp-03')).toHaveLength(1);
    });
  });
});

describe('ExpectedPresenceService — seeded demo data', () => {
  it('returns 3 amber entries: 2 staff + 1 visitor', async () => {
    const { createContainer } = await import('../../container.js');
    const { SEED_DATE } = await import('../../infrastructure/seed/seed-data.js');
    const container = createContainer();

    const expected = await container.expectedPresence.expectedOn(SEED_DATE);

    // 2 staff from M365 calendar (Priya Shah, Dev Anand)
    const staffExpected = expected.filter((e) => e.source === 'm365-calendar');
    expect(staffExpected).toHaveLength(2);
    expect(staffExpected.map((e) => e.personId)).toContain('emp-003');
    expect(staffExpected.map((e) => e.personId)).toContain('emp-010');

    // 1 visitor from booking (Bram de Vries — multi-day, not checked in)
    // Plus 4 more visitors with active bookings who ARE on site (Dana, Niamh, Greg, Laura)
    const visitorExpected = expected.filter((e) => e.source === 'visit-booking');
    expect(visitorExpected.length).toBeGreaterThanOrEqual(1);

    // Bram is expected but not on site → checkedInToday: false
    const bram = expected.find((e) => e.personId === 'vis-002');
    expect(bram).not.toBeUndefined();
    expect(bram?.checkedInToday).toBe(false);
    expect(bram?.visitCategory).toBe('contractor');

    // All 3 amber entries: Priya + Dev (not on site) + Bram (not on site)
    const amber = expected.filter((e) => !e.checkedInToday);
    expect(amber).toHaveLength(3);
    expect(amber.map((e) => e.personId)).toEqual(
      expect.arrayContaining(['emp-003', 'emp-010', 'vis-002']),
    );
  });
});
