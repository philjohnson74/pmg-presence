import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import type { SseEvent } from '@pmg/contracts';
import type { SseBrokerPort } from '../../domain/ports.js';

interface Connection {
  readonly id: string;
  readonly res: Response;
  readonly userId: string;
}

const RING_BUFFER_SIZE = 100;
const HEARTBEAT_INTERVAL_MS = 15_000;

export class SseBroker implements SseBrokerPort {
  private readonly connections = new Map<string, Connection>();
  private readonly ringBuffer: Array<{ id: number; event: SseEvent }> = [];
  private eventCounter = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  startHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      this.broadcast({ event: 'heartbeat', data: { at: new Date().toISOString() } });
    }, HEARTBEAT_INTERVAL_MS);
    // Don't block Node.js from exiting in tests/dev
    this.heartbeatTimer.unref();
  }

  connect(res: Response, userId: string, lastEventId?: number): string {
    const id = randomUUID();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const conn: Connection = { id, res, userId };
    this.connections.set(id, conn);

    // Replay missed events from ring buffer on reconnect
    if (lastEventId !== undefined) {
      for (const buffered of this.ringBuffer) {
        if (buffered.id > lastEventId) {
          this.sendTo(res, buffered.event, buffered.id);
        }
      }
    }

    res.on('close', () => {
      this.connections.delete(id);
    });

    return id;
  }

  broadcast(event: SseEvent): void {
    const id = ++this.eventCounter;

    this.ringBuffer.push({ id, event });
    if (this.ringBuffer.length > RING_BUFFER_SIZE) {
      this.ringBuffer.shift();
    }

    for (const conn of this.connections.values()) {
      this.sendTo(conn.res, event, id);
    }
  }

  get connectionCount(): number {
    return this.connections.size;
  }

  close(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    for (const conn of this.connections.values()) {
      try {
        conn.res.end();
      } catch {
        // Already closed
      }
    }
    this.connections.clear();
  }

  private sendTo(res: Response, event: SseEvent, id: number): void {
    try {
      res.write(`event: ${event.event}\nid: ${id}\ndata: ${JSON.stringify(event.data)}\n\n`);
    } catch {
      // Connection closed between broadcast and write
    }
  }
}
