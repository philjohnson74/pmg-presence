import { randomUUID } from 'node:crypto';
import type { Direction, PersonType, VisitCategory } from '@pmg/contracts';
import type { CheckInRequest, CheckInResponse, VisitorPassResponse } from '@pmg/contracts';
import type {
  AuditLogRepository,
  CheckInEventRepository,
  EmployeeRepository,
  VisitBookingRepository,
  VisitorRepository,
} from '../../domain/repositories.js';
import type { ClinicalSystemPort, JwtServicePort } from '../../domain/ports.js';
import type { JtiStore } from '../../domain/jti-store.js';
import { NotFoundError, ValidationError } from '../errors.js';

export interface CheckInEventDeps {
  checkInEvents: CheckInEventRepository;
  employees: EmployeeRepository;
  visitors: VisitorRepository;
  visitBookings: VisitBookingRepository;
  clinicalSystem: ClinicalSystemPort;
  auditLog: AuditLogRepository;
  jwtService: JwtServicePort;
  jtiStore?: JtiStore;
}

const DEBOUNCE_MS = 5_000;
const PASS_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generatePassCode(): string {
  return Array.from(
    { length: 6 },
    () => PASS_CODE_CHARS[Math.floor(Math.random() * PASS_CODE_CHARS.length)],
  ).join('');
}

interface Resolution {
  personId: string;
  personType: PersonType;
  displayName: string;
  visitCategory?: VisitCategory;
  pass?: VisitorPassResponse;
  /** JTI from the QR token — present only for method:'qr' */
  jti?: string;
  /** Token expiry — used to bound the JTI store entry */
  jtiExpiresAt?: Date;
}

export class CheckInEventUseCase {
  constructor(private readonly deps: CheckInEventDeps) {}

  async execute(
    input: CheckInRequest,
    direction: Direction,
    requestedBy: string,
  ): Promise<CheckInResponse> {
    const resolution = await this.resolvePerson(input);
    const { personId, personType, displayName, pass, jti, jtiExpiresAt } = resolution;

    // JTI replay check — if this exact QR scan was already processed, return the same event
    if (jti && this.deps.jtiStore) {
      const stored = this.deps.jtiStore.check(jti);
      if (stored) {
        return {
          eventId: stored.eventId,
          personType: stored.personType,
          displayName: stored.displayName,
          direction: stored.direction,
          timestamp: stored.timestamp,
          alreadyOnsite: stored.direction === 'in',
          debounced: true,
        };
      }
    }

    // Debounce: return existing event if same (personId, direction) within 5s
    const debounced = await this.checkDebounce(personId, direction);
    if (debounced) {
      return {
        eventId: debounced.id,
        personType,
        displayName,
        direction,
        timestamp: debounced.timestamp,
        alreadyOnsite: debounced.direction === 'in',
        debounced: true,
      };
    }

    const latestEvent = await this.deps.checkInEvents.latestForPerson(personId);
    const alreadyOnsite = latestEvent?.direction === 'in';

    const event = await this.deps.checkInEvents.append({
      personId,
      personType,
      direction,
      method: input.method ?? 'manual',
      locationId: input.locationId,
      displayName,
    });

    // Mark JTI as used so replays are debounced for the token's remaining lifetime
    if (jti && jtiExpiresAt && this.deps.jtiStore) {
      this.deps.jtiStore.mark(
        jti,
        { eventId: event.id, direction, personType, displayName, timestamp: event.timestamp },
        jtiExpiresAt,
      );
    }

    if (input.method === 'manual') {
      await this.deps.auditLog.record({
        entity: 'checkInEvent',
        entityId: event.id,
        action: 'manual-checkin',
        changedBy: requestedBy,
        after: { personType, displayName, manual: input.manual },
      });
    }

    return {
      eventId: event.id,
      personType,
      displayName,
      direction,
      timestamp: event.timestamp,
      alreadyOnsite,
      ...(pass ? { pass } : {}),
    };
  }

  private async checkDebounce(personId: string, direction: Direction) {
    const latest = await this.deps.checkInEvents.latestForPerson(personId);
    if (!latest || latest.direction !== direction) return null;
    const ageMs = Date.now() - new Date(latest.timestamp).getTime();
    return ageMs < DEBOUNCE_MS ? latest : null;
  }

  private async resolvePerson(input: CheckInRequest): Promise<Resolution> {
    const { method } = input;

    // Direct personId resolution — used for visitor/patient checkout from kiosk picker
    if (input.personId && input.personType) {
      return this.resolveByPersonId(input.personId, input.personType);
    }

    if (method === 'qr') {
      return this.resolveQr(input);
    }

    if (method === 'email') {
      if (!input.email) throw new ValidationError('email is required for method=email');
      const emp = await this.deps.employees.findByEmail(input.email);
      if (!emp || !emp.active) throw new NotFoundError('Employee not found');
      return { personId: emp.id, personType: 'employee', displayName: emp.name };
    }

    if (method === 'patient-lookup') {
      if (!input.patientId) throw new ValidationError('patientId is required for method=patient-lookup');
      const patient = await this.deps.clinicalSystem.findById(input.patientId);
      if (!patient) throw new NotFoundError('Patient not found');
      return { personId: input.patientId, personType: 'patient', displayName: patient.displayName };
    }

    if (method === 'visitor-form') {
      return this.resolveVisitorForm(input);
    }

    if (method === 'manual') {
      return this.resolveManual(input);
    }

    throw new ValidationError('method is required');
  }

  private async resolveByPersonId(personId: string, personType: PersonType): Promise<Resolution> {
    if (personType === 'visitor') {
      const visitor = await this.deps.visitors.findById(personId);
      if (!visitor) throw new NotFoundError('Visitor not found');
      return {
        personId: visitor.id,
        personType: 'visitor',
        displayName: visitor.name,
        ...(visitor.visitCategory ? { visitCategory: visitor.visitCategory } : {}),
      };
    }
    if (personType === 'patient') {
      const patient = await this.deps.clinicalSystem.findById(personId);
      if (!patient) throw new NotFoundError('Patient not found');
      return { personId, personType: 'patient', displayName: patient.displayName };
    }
    if (personType === 'employee') {
      const emp = await this.deps.employees.findById(personId);
      if (!emp || !emp.active) throw new NotFoundError('Employee not found');
      return { personId: emp.id, personType: 'employee', displayName: emp.name };
    }
    throw new ValidationError('Unsupported personType');
  }

  private async resolveQr(input: CheckInRequest): Promise<Resolution> {
    if (!input.qrToken) throw new ValidationError('qrToken is required for method=qr');

    let payload: Record<string, unknown>;
    try {
      payload = this.deps.jwtService.verifyRaw(input.qrToken);
    } catch {
      throw new ValidationError('Invalid or expired QR token');
    }

    const typ = payload['typ'];
    const sub = payload['sub'] as string | undefined;
    if (!sub) throw new ValidationError('Invalid QR token payload');

    if (typ === 'qr') {
      const emp = await this.deps.employees.findById(sub);
      if (!emp || !emp.active) throw new NotFoundError('Employee not found or inactive');
      const jti = payload['jti'] as string | undefined;
      const exp = payload['exp'] as number | undefined;
      return {
        personId: emp.id,
        personType: 'employee',
        displayName: emp.name,
        ...(jti ? { jti } : {}),
        ...(exp ? { jtiExpiresAt: new Date(exp * 1000) } : {}),
      };
    }

    if (typ === 'visit-pass') {
      const booking = await this.deps.visitBookings.findActiveByPassToken(input.qrToken);
      if (!booking) throw new ValidationError('Invalid or expired visitor pass');
      const visitor = await this.deps.visitors.findById(booking.visitorId);
      if (!visitor) throw new NotFoundError('Visitor not found');
      return {
        personId: visitor.id,
        personType: 'visitor',
        displayName: visitor.name,
        ...(visitor.visitCategory ? { visitCategory: visitor.visitCategory } : {}),
      };
    }

    throw new ValidationError('Unknown QR token type');
  }

  private async resolveVisitorForm(input: CheckInRequest): Promise<Resolution> {
    if (!input.visitor) throw new ValidationError('visitor is required for method=visitor-form');

    const visitor = await this.deps.visitors.create({
      name: input.visitor.name,
      email: input.visitor.email ?? null,
      company: input.visitor.company ?? null,
      host: input.visitor.host,
      visitReason: input.visitor.visitReason,
      visitCategory: input.visitor.visitCategory ?? null,
    });

    let pass: VisitorPassResponse | undefined;

    if (input.booking) {
      const { startDate, endDate } = input.booking;
      const isMultiDay = endDate > startDate;

      let passToken: string | null = null;
      let passCode: string | null = null;

      if (isMultiDay) {
        const endOfDay = new Date(`${endDate}T23:59:59Z`);
        passToken = this.deps.jwtService.signRaw(
          { sub: randomUUID(), typ: 'visit-pass', jti: randomUUID() },
          endOfDay,
        );
        passCode = generatePassCode();
      }

      const booking = await this.deps.visitBookings.create({
        visitorId: visitor.id,
        host: input.visitor.host,
        startDate,
        endDate,
        passToken,
        passCode,
      });

      // Re-sign with actual bookingId as sub now that we have it
      if (isMultiDay && passCode) {
        const endOfDay = new Date(`${endDate}T23:59:59Z`);
        passToken = this.deps.jwtService.signRaw(
          { sub: booking.id, typ: 'visit-pass', jti: randomUUID() },
          endOfDay,
        );
        // Update the booking's passToken in-place via the repository seed method
        // (acceptable for in-memory MVP; Postgres would use an UPDATE)
        (this.deps.visitBookings as { _updatePassToken?: (id: string, t: string) => void })
          ._updatePassToken?.(booking.id, passToken);

        pass = { passToken, passCode, validUntil: endDate };
      }
    }

    return {
      personId: visitor.id,
      personType: 'visitor',
      displayName: visitor.name,
      ...(visitor.visitCategory ? { visitCategory: visitor.visitCategory } : {}),
      ...(pass ? { pass } : {}),
    };
  }

  private async resolveManual(input: CheckInRequest): Promise<Resolution> {
    const personType = input.personType ?? 'patient';
    const { manual } = input;

    if (personType === 'employee') {
      if (!manual) throw new ValidationError('manual is required for method=manual personType=employee');
      let emp = null;
      if (manual.employeeNumber) {
        emp = await this.deps.employees.findByEmployeeNumber(manual.employeeNumber);
      }
      if (!emp && manual.name) {
        const all = await this.deps.employees.listActive();
        const needle = manual.name.toLowerCase().trim();
        emp = all.find((e) => e.name.toLowerCase().includes(needle)) ?? null;
      }
      if (!emp || !emp.active) throw new NotFoundError('Employee not found');
      return { personId: emp.id, personType: 'employee', displayName: emp.name };
    }

    if (personType === 'patient') {
      if (!manual?.name) throw new ValidationError('manual.name is required for manual patient check-in');
      return {
        personId: `anon-${randomUUID()}`,
        personType: 'patient',
        displayName: manual.name,
      };
    }

    throw new ValidationError('Unsupported personType for manual check-in');
  }
}
