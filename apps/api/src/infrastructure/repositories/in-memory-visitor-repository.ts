import { randomUUID } from 'node:crypto';
import type { NewVisitor, Visitor } from '../../domain/entities.js';
import type { VisitorRepository } from '../../domain/repositories.js';

export class InMemoryVisitorRepository implements VisitorRepository {
  private readonly store = new Map<string, Visitor>();

  async findById(id: string): Promise<Visitor | null> {
    return this.store.get(id) ?? null;
  }

  async create(input: NewVisitor): Promise<Visitor> {
    const visitor: Visitor = {
      id: randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
    };
    this.store.set(visitor.id, visitor);
    return visitor;
  }

  /** Bypass ID generation for deterministic seed data. */
  seed(visitor: Visitor): void {
    this.store.set(visitor.id, visitor);
  }
}
