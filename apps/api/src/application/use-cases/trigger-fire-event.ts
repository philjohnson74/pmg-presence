import type { FireEvent, NewRollCallEntry, RollCallEntry } from '../../domain/entities.js';
import type { FireEventRepository, RollCallRepository } from '../../domain/repositories.js';
import type { PushPort, SseBrokerPort } from '../../domain/ports.js';
import type { OnsiteProjectionService } from '../services/onsite-projection-service.js';
import type { ExpectedPresenceService } from '../services/expected-presence-service.js';
import { ConflictError } from '../errors.js';
import { fireEventsCounter } from '../../infrastructure/telemetry/metrics.js';

export interface TriggerFireEventDeps {
  fireEvents: FireEventRepository;
  rollCall: RollCallRepository;
  onsiteProjection: OnsiteProjectionService;
  expectedPresence: ExpectedPresenceService;
  broker: SseBrokerPort;
  pushPort: PushPort;
}

export interface TriggerFireResult {
  fireEvent: FireEvent;
  entries: RollCallEntry[];
}

export class TriggerFireEventUseCase {
  constructor(private readonly deps: TriggerFireEventDeps) {}

  async execute(triggeredBy: string): Promise<TriggerFireResult> {
    const existing = await this.deps.fireEvents.active();
    if (existing) throw new ConflictError('A fire event is already active');

    const today = new Date().toISOString().slice(0, 10);

    const [snapshot, expectedPeople] = await Promise.all([
      this.deps.onsiteProjection.getSnapshot(),
      this.deps.expectedPresence.expectedOn(today),
    ]);

    const onsiteIds = new Set(snapshot.occupants.map((o) => o.personId));

    const fireEvent = await this.deps.fireEvents.create(triggeredBy);

    const onsiteEntries: NewRollCallEntry[] = snapshot.occupants.map((o) => ({
      fireEventId: fireEvent.id,
      personId: o.personId,
      personType: o.personType,
      displayName: o.displayName,
      state: 'unaccounted' as const,
    }));

    // Expected but not checked in today → amber (expected-absent)
    const amberEntries: NewRollCallEntry[] = expectedPeople
      .filter((e) => !onsiteIds.has(e.personId))
      .map((e) => ({
        fireEventId: fireEvent.id,
        personId: e.personId,
        personType: e.personType,
        displayName: e.displayName,
        state: 'expected-absent' as const,
      }));

    await this.deps.rollCall.snapshot([...onsiteEntries, ...amberEntries]);
    const entries = await this.deps.rollCall.list(fireEvent.id);

    this.deps.broker.broadcast({
      event: 'fire.triggered',
      data: {
        fireEventId: fireEvent.id,
        triggeredAt: fireEvent.triggeredAt,
        rollCall: entries,
      },
    });

    await this.deps.pushPort.notifyMarshals({
      fireEventId: fireEvent.id,
      triggeredAt: fireEvent.triggeredAt,
    });

    fireEventsCounter.inc();

    return { fireEvent, entries };
  }
}
