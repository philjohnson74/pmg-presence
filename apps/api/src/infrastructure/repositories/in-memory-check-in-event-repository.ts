import { randomUUID } from 'node:crypto';
import type { CheckInEvent, HistoryFilter, NewCheckInEvent } from '../../domain/entities.js';
import type { CheckInEventRepository } from '../../domain/repositories.js';

export class InMemoryCheckInEventRepository implements CheckInEventRepository {
  private readonly events: CheckInEvent[] = [];

  async append(input: NewCheckInEvent): Promise<CheckInEvent> {
    const event: CheckInEvent = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...input,
      // explicit timestamp override from input takes precedence
      ...(input.timestamp ? { timestamp: input.timestamp } : {}),
    };
    this.events.push(event);
    return event;
  }

  async latestForPerson(personId: string): Promise<CheckInEvent | null> {
    let latest: CheckInEvent | null = null;
    for (const event of this.events) {
      if (event.personId !== personId) continue;
      if (!latest || event.timestamp > latest.timestamp) latest = event;
    }
    return latest;
  }

  async currentlyOnsite(): Promise<CheckInEvent[]> {
    // For each person, find their latest event. Keep only those where it is 'in'.
    const latestByPerson = new Map<string, CheckInEvent>();
    for (const event of this.events) {
      const existing = latestByPerson.get(event.personId);
      if (!existing || event.timestamp > existing.timestamp) {
        latestByPerson.set(event.personId, event);
      }
    }
    return [...latestByPerson.values()].filter((e) => e.direction === 'in');
  }

  async history(filter: HistoryFilter): Promise<CheckInEvent[]> {
    return this.events.filter((event) => {
      const date = event.timestamp.slice(0, 10); // YYYY-MM-DD
      if (filter.from && date < filter.from) return false;
      if (filter.to && date > filter.to) return false;
      if (filter.name) {
        const needle = filter.name.toLowerCase();
        if (!event.displayName.toLowerCase().includes(needle)) return false;
      }
      if (filter.personType && event.personType !== filter.personType) return false;
      return true;
    });
  }

  /** Bypass timestamp/ID generation for deterministic seed data. */
  seed(event: CheckInEvent): void {
    this.events.push(event);
  }
}
