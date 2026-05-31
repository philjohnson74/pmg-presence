import type { ExpectedPerson } from '@pmg/contracts';
import type { CalendarPort } from '../../domain/ports.js';
import type {
  CheckInEventRepository,
  VisitBookingRepository,
  VisitorRepository,
} from '../../domain/repositories.js';

export class ExpectedPresenceService {
  constructor(
    private readonly calendar: CalendarPort,
    private readonly visitBookings: VisitBookingRepository,
    private readonly checkInEvents: CheckInEventRepository,
    private readonly visitors: VisitorRepository,
  ) {}

  async expectedOn(date: string): Promise<ExpectedPerson[]> {
    const [staffEntries, activeBookings, onsiteEvents] = await Promise.all([
      this.calendar.expectedOnsiteOn(date),
      this.visitBookings.activeOn(date),
      this.checkInEvents.currentlyOnsite(),
    ]);

    const onsiteIds = new Set(onsiteEvents.map((e) => e.personId));
    const staffIds = new Set(staffEntries.map((e) => e.personId));

    const staffExpected: ExpectedPerson[] = staffEntries.map((entry) => ({
      ...entry,
      checkedInToday: onsiteIds.has(entry.personId),
    }));

    // Visitor bookings — skip any personId already in the staff set (prevents duplicates)
    const visitorExpected = (
      await Promise.all(
        activeBookings
          .filter((booking) => !staffIds.has(booking.visitorId))
          .map(async (booking) => {
            const visitor = await this.visitors.findById(booking.visitorId);
            if (!visitor) return null;
            const person: ExpectedPerson = {
              personId: booking.visitorId,
              displayName: visitor.name,
              personType: 'visitor',
              source: 'visit-booking',
              host: booking.host,
              checkedInToday: onsiteIds.has(booking.visitorId),
            };
            if (visitor.visitCategory !== null) {
              person.visitCategory = visitor.visitCategory;
            }
            return person;
          }),
      )
    ).filter((e): e is ExpectedPerson => e !== null);

    return [...staffExpected, ...visitorExpected];
  }
}
