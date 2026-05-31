import type { CalendarEntry, CalendarPort } from '../../domain/ports.js';

/**
 * Mock Microsoft 365 / Graph calendar adapter.
 * Initialized with a list of (personId, date) attendance entries.
 * In production this would query Microsoft Graph calendarView.
 */
export class MockM365Calendar implements CalendarPort {
  constructor(private readonly entries: ReadonlyArray<CalendarEntry & { date: string }>) {}

  async expectedOnsiteOn(date: string): Promise<CalendarEntry[]> {
    return this.entries
      .filter((e) => e.date === date)
      .map(({ date: _date, ...entry }) => entry);
  }
}
