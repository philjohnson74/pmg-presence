import type {
  AuditLog,
  CheckInEvent,
  Employee,
  FireEvent,
  HistoryFilter,
  Location,
  NewAuditEntry,
  NewCheckInEvent,
  NewEmployee,
  NewRollCallEntry,
  NewVisitBooking,
  NewVisitor,
  RollCallEntry,
  VisitBooking,
  Visitor,
} from './entities.js';

export interface EmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;      // case-insensitive
  findByEmployeeNumber(n: string): Promise<Employee | null>;
  listActive(): Promise<Employee[]>;
  listAll(): Promise<Employee[]>;
  create(e: NewEmployee): Promise<Employee>;
  update(
    id: string,
    patch: Partial<Pick<Employee, 'name' | 'email' | 'role' | 'active' | 'qrCodeToken'>>,
  ): Promise<Employee>;
  deactivate(id: string): Promise<void>;
}

export interface VisitorRepository {
  findById(id: string): Promise<Visitor | null>;
  create(v: NewVisitor): Promise<Visitor>;
}

export interface VisitBookingRepository {
  create(b: NewVisitBooking): Promise<VisitBooking>;
  findById(id: string): Promise<VisitBooking | null>;
  findActiveByPassToken(token: string): Promise<VisitBooking | null>;
  findActiveByCode(surname: string, code: string): Promise<VisitBooking | null>;
  activeOn(date: string): Promise<VisitBooking[]>; // bookings where startDate <= date <= endDate and status=active
  complete(id: string): Promise<void>;
}

export interface CheckInEventRepository {
  append(e: NewCheckInEvent): Promise<CheckInEvent>;
  latestForPerson(personId: string): Promise<CheckInEvent | null>;
  currentlyOnsite(): Promise<CheckInEvent[]>; // latest 'in' per person, no later 'out'
  history(filter: HistoryFilter): Promise<CheckInEvent[]>;
}

export interface FireEventRepository {
  active(): Promise<FireEvent | null>;
  list(): Promise<FireEvent[]>;
  create(triggeredBy: string): Promise<FireEvent>;
  resolve(id: string): Promise<FireEvent>;
}

export interface RollCallRepository {
  snapshot(entries: NewRollCallEntry[]): Promise<void>;
  list(fireEventId: string): Promise<RollCallEntry[]>;
  markAccounted(fireEventId: string, personId: string, by: string): Promise<RollCallEntry>;
}

export interface AuditLogRepository {
  record(entry: NewAuditEntry): Promise<AuditLog>;
}

export interface LocationRepository {
  findById(id: string): Promise<Location | null>;
  listAll(): Promise<Location[]>;
}
