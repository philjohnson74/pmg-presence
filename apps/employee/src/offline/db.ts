import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { OnsiteResponse, RollCallResponse } from '@pmg/contracts';

interface PmgDB extends DBSchema {
  onsite: {
    key: 'current';
    value: { data: OnsiteResponse; updatedAt: string };
  };
  rollcall: {
    key: 'current';
    value: { data: RollCallResponse; updatedAt: string };
  };
  outbox: {
    key: string;
    value: { personId: string; accountedFor: boolean; queuedAt: string };
  };
}

const DB_NAME = 'pmg-presence';
const DB_VERSION = 1;

let _db: Promise<IDBPDatabase<PmgDB>> | null = null;

function getDb(): Promise<IDBPDatabase<PmgDB>> {
  if (!_db) {
    _db = openDB<PmgDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('onsite');
        db.createObjectStore('rollcall');
        db.createObjectStore('outbox', { keyPath: 'personId' });
      },
    });
  }
  return _db;
}

// ─── Onsite cache ──────────────────────────────────────────────────────────────

export async function getCachedOnsite() {
  try {
    const db = await getDb();
    return db.get('onsite', 'current');
  } catch {
    return undefined;
  }
}

export async function putCachedOnsite(data: OnsiteResponse) {
  try {
    const db = await getDb();
    await db.put('onsite', { data, updatedAt: new Date().toISOString() }, 'current');
  } catch {
    // IDB unavailable (private mode on some browsers) — degrade silently
  }
}

// ─── Roll-call cache ───────────────────────────────────────────────────────────

export async function getCachedRollCall() {
  try {
    const db = await getDb();
    return db.get('rollcall', 'current');
  } catch {
    return undefined;
  }
}

export async function putCachedRollCall(data: RollCallResponse) {
  try {
    const db = await getDb();
    await db.put('rollcall', { data, updatedAt: new Date().toISOString() }, 'current');
  } catch {
    // degrade silently
  }
}

export async function updateCachedRollCallTimestamp() {
  try {
    const db = await getDb();
    const entry = await db.get('rollcall', 'current');
    if (entry) {
      await db.put('rollcall', { ...entry, updatedAt: new Date().toISOString() }, 'current');
    }
  } catch {
    // degrade silently
  }
}

export async function clearCachedRollCall() {
  try {
    const db = await getDb();
    await db.delete('rollcall', 'current');
  } catch {
    // degrade silently
  }
}

// ─── Outbox ────────────────────────────────────────────────────────────────────

export async function getOutbox() {
  try {
    const db = await getDb();
    return db.getAll('outbox');
  } catch {
    return [];
  }
}

export async function addToOutbox(personId: string, accountedFor: boolean) {
  try {
    const db = await getDb();
    await db.put('outbox', { personId, accountedFor, queuedAt: new Date().toISOString() });
  } catch {
    // degrade silently
  }
}

export async function removeFromOutbox(personId: string) {
  try {
    const db = await getDb();
    await db.delete('outbox', personId);
  } catch {
    // degrade silently
  }
}
