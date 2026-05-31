import type { OccupancyCounts, OccupantRecord, OnsiteResponse } from '@pmg/contracts';
import type { CheckInEventRepository, VisitorRepository } from '../../domain/repositories.js';

export class OnsiteProjectionService {
  constructor(
    private readonly checkInEvents: CheckInEventRepository,
    private readonly visitors: VisitorRepository,
  ) {}

  async getSnapshot(): Promise<OnsiteResponse> {
    const onsiteEvents = await this.checkInEvents.currentlyOnsite();

    const occupants: OccupantRecord[] = await Promise.all(
      onsiteEvents.map(async (event) => {
        const base: OccupantRecord = {
          personId: event.personId,
          personType: event.personType,
          displayName: event.displayName,
          since: event.timestamp,
          lastLocationId: event.locationId,
        };

        if (event.personType === 'visitor') {
          const visitor = await this.visitors.findById(event.personId);
          return {
            ...base,
            ...(visitor?.host ? { host: visitor.host } : {}),
            ...(visitor?.visitCategory ? { visitCategory: visitor.visitCategory } : {}),
          };
        }

        return base;
      }),
    );

    const counts: OccupancyCounts = { employee: 0, patient: 0, visitor: 0 };
    const visitorsByCategory: Record<string, number> = {};

    for (const occupant of occupants) {
      counts[occupant.personType]++;
      if (occupant.personType === 'visitor') {
        const cat = occupant.visitCategory ?? 'uncategorised';
        visitorsByCategory[cat] = (visitorsByCategory[cat] ?? 0) + 1;
      }
    }

    return {
      asOf: new Date().toISOString(),
      counts,
      visitorsByCategory,
      occupants,
    };
  }
}
