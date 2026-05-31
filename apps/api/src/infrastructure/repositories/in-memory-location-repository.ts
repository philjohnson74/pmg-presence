import type { Location } from '../../domain/entities.js';
import type { LocationRepository } from '../../domain/repositories.js';

export class InMemoryLocationRepository implements LocationRepository {
  private readonly store = new Map<string, Location>();

  async findById(id: string): Promise<Location | null> {
    return this.store.get(id) ?? null;
  }

  async listAll(): Promise<Location[]> {
    return [...this.store.values()];
  }

  /** Bypass ID generation for deterministic seed data. */
  seed(location: Location): void {
    this.store.set(location.id, location);
  }
}
