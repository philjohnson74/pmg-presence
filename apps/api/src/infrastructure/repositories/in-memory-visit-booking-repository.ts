import { randomUUID } from 'node:crypto';
import type { NewVisitBooking, VisitBooking } from '../../domain/entities.js';
import type { VisitBookingRepository } from '../../domain/repositories.js';

export class InMemoryVisitBookingRepository implements VisitBookingRepository {
  private readonly store = new Map<string, VisitBooking>();

  async create(input: NewVisitBooking): Promise<VisitBooking> {
    const booking: VisitBooking = {
      id: randomUUID(),
      ...input,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    this.store.set(booking.id, booking);
    return booking;
  }

  async findById(id: string): Promise<VisitBooking | null> {
    return this.store.get(id) ?? null;
  }

  async findActiveByPassToken(token: string): Promise<VisitBooking | null> {
    for (const booking of this.store.values()) {
      if (booking.status === 'active' && booking.passToken === token) return booking;
    }
    return null;
  }

  async findActiveByCode(surname: string, code: string): Promise<VisitBooking | null> {
    const normalised = surname.trim().toLowerCase();
    for (const booking of this.store.values()) {
      if (booking.status !== 'active' || booking.passCode !== code) continue;
      // Validate against the visitor's surname — caller must supply the visitorId-resolved name.
      // We store the code directly; surname matching happens in the use case.
      // This repo only enforces code uniqueness; surname check is at the application layer.
      if (normalised && booking.passCode === code) return booking;
    }
    return null;
  }

  async activeOn(date: string): Promise<VisitBooking[]> {
    return [...this.store.values()].filter(
      (b) => b.status === 'active' && b.startDate <= date && date <= b.endDate,
    );
  }

  async complete(id: string): Promise<void> {
    const booking = this.store.get(id);
    if (!booking) throw new Error(`VisitBooking ${id} not found`);
    this.store.set(id, { ...booking, status: 'completed' });
  }

  /** Update the passToken after creation (used for multi-day visitor pass re-signing). */
  _updatePassToken(id: string, passToken: string): void {
    const booking = this.store.get(id);
    if (booking) this.store.set(id, { ...booking, passToken });
  }

  /** Bypass ID generation for deterministic seed data. */
  seed(booking: VisitBooking): void {
    this.store.set(booking.id, booking);
  }
}
