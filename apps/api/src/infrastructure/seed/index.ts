import type { InMemoryCheckInEventRepository } from '../repositories/in-memory-check-in-event-repository.js';
import type { InMemoryEmployeeRepository } from '../repositories/in-memory-employee-repository.js';
import type { InMemoryLocationRepository } from '../repositories/in-memory-location-repository.js';
import type { InMemoryVisitBookingRepository } from '../repositories/in-memory-visit-booking-repository.js';
import type { InMemoryVisitorRepository } from '../repositories/in-memory-visitor-repository.js';
import {
  CHECK_IN_EVENTS,
  EMPLOYEES,
  LOCATIONS,
  VISIT_BOOKINGS,
  VISITORS,
} from './seed-data.js';

export interface SeedableRepositories {
  employees: InMemoryEmployeeRepository;
  visitors: InMemoryVisitorRepository;
  visitBookings: InMemoryVisitBookingRepository;
  checkInEvents: InMemoryCheckInEventRepository;
  locations: InMemoryLocationRepository;
}

/** Populates all in-memory repositories with demo seed data. */
export function loadSeed(repos: SeedableRepositories): void {
  for (const location of LOCATIONS) repos.locations.seed(location);
  for (const employee of EMPLOYEES) repos.employees.seed(employee);
  for (const visitor of VISITORS) repos.visitors.seed(visitor);
  for (const booking of VISIT_BOOKINGS) repos.visitBookings.seed(booking);
  for (const event of CHECK_IN_EVENTS) repos.checkInEvents.seed(event);
}
