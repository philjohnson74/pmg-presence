import { ExpectedPresenceService } from './application/services/expected-presence-service.js';
import { OnsiteProjectionService } from './application/services/onsite-projection-service.js';
import { MockM365Calendar } from './infrastructure/adapters/mock-m365-calendar.js';
import { MockClinicalSystem } from './infrastructure/adapters/mock-clinical-system.js';
import { JwtService } from './infrastructure/auth/jwt-service.js';
import { MockEntraProvider } from './infrastructure/auth/mock-entra-provider.js';
import { InMemoryAuditLogRepository } from './infrastructure/repositories/in-memory-audit-log-repository.js';
import { InMemoryCheckInEventRepository } from './infrastructure/repositories/in-memory-check-in-event-repository.js';
import { InMemoryEmployeeRepository } from './infrastructure/repositories/in-memory-employee-repository.js';
import { InMemoryFireEventRepository } from './infrastructure/repositories/in-memory-fire-event-repository.js';
import { InMemoryLocationRepository } from './infrastructure/repositories/in-memory-location-repository.js';
import { InMemoryRollCallRepository } from './infrastructure/repositories/in-memory-roll-call-repository.js';
import { InMemoryVisitBookingRepository } from './infrastructure/repositories/in-memory-visit-booking-repository.js';
import { InMemoryVisitorRepository } from './infrastructure/repositories/in-memory-visitor-repository.js';
import { loadSeed } from './infrastructure/seed/index.js';
import { M365_CALENDAR_ENTRIES, PATIENTS } from './infrastructure/seed/seed-data.js';
import { config } from './config/index.js';

export interface Container {
  // Repositories
  employees: InMemoryEmployeeRepository;
  visitors: InMemoryVisitorRepository;
  visitBookings: InMemoryVisitBookingRepository;
  checkInEvents: InMemoryCheckInEventRepository;
  fireEvents: InMemoryFireEventRepository;
  rollCall: InMemoryRollCallRepository;
  auditLog: InMemoryAuditLogRepository;
  locations: InMemoryLocationRepository;
  // Adapters
  clinicalSystem: MockClinicalSystem;
  calendar: MockM365Calendar;
  // Auth
  jwtService: JwtService;
  entraProvider: MockEntraProvider;
  // Application services
  onsiteProjection: OnsiteProjectionService;
  expectedPresence: ExpectedPresenceService;
}

/** Production container — seeded with demo data. */
export function createContainer(): Container {
  const employees = new InMemoryEmployeeRepository();
  const visitors = new InMemoryVisitorRepository();
  const visitBookings = new InMemoryVisitBookingRepository();
  const checkInEvents = new InMemoryCheckInEventRepository();
  const fireEvents = new InMemoryFireEventRepository();
  const rollCall = new InMemoryRollCallRepository();
  const auditLog = new InMemoryAuditLogRepository();
  const locations = new InMemoryLocationRepository();

  const clinicalSystem = new MockClinicalSystem(PATIENTS);
  const calendar = new MockM365Calendar(M365_CALENDAR_ENTRIES);

  loadSeed({ employees, visitors, visitBookings, checkInEvents, locations });

  const jwtService = new JwtService(config.jwtSecret, config.jwtExpiresInSeconds);
  const entraProvider = new MockEntraProvider(
    employees,
    jwtService,
    config.jwtIssuer,
    config.jwtAudience,
  );

  const onsiteProjection = new OnsiteProjectionService(checkInEvents, visitors);
  const expectedPresence = new ExpectedPresenceService(
    calendar,
    visitBookings,
    checkInEvents,
    visitors,
  );

  return {
    employees,
    visitors,
    visitBookings,
    checkInEvents,
    fireEvents,
    rollCall,
    auditLog,
    locations,
    clinicalSystem,
    calendar,
    jwtService,
    entraProvider,
    onsiteProjection,
    expectedPresence,
  };
}

/**
 * Test container — empty repositories, no seed data.
 * Pass custom calendar entries / patients / jwtSecret for isolated unit/integration tests.
 */
export function buildTestContainer(
  opts: {
    calendarEntries?: ConstructorParameters<typeof MockM365Calendar>[0];
    patients?: ConstructorParameters<typeof MockClinicalSystem>[0];
    jwtSecret?: string;
  } = {},
): Container {
  const secret = opts.jwtSecret ?? 'test-secret-at-least-16-chars';
  const employees = new InMemoryEmployeeRepository();
  const visitors = new InMemoryVisitorRepository();
  const visitBookings = new InMemoryVisitBookingRepository();
  const checkInEvents = new InMemoryCheckInEventRepository();
  const fireEvents = new InMemoryFireEventRepository();
  const rollCall = new InMemoryRollCallRepository();
  const auditLog = new InMemoryAuditLogRepository();
  const locations = new InMemoryLocationRepository();

  const clinicalSystem = new MockClinicalSystem(opts.patients ?? []);
  const calendar = new MockM365Calendar(opts.calendarEntries ?? []);

  const jwtService = new JwtService(secret, 8 * 60 * 60);
  const entraProvider = new MockEntraProvider(
    employees,
    jwtService,
    'pmg-mock-idp',
    'pmg-presence-api',
  );

  const onsiteProjection = new OnsiteProjectionService(checkInEvents, visitors);
  const expectedPresence = new ExpectedPresenceService(
    calendar,
    visitBookings,
    checkInEvents,
    visitors,
  );

  return {
    employees,
    visitors,
    visitBookings,
    checkInEvents,
    fireEvents,
    rollCall,
    auditLog,
    locations,
    clinicalSystem,
    calendar,
    jwtService,
    entraProvider,
    onsiteProjection,
    expectedPresence,
  };
}
