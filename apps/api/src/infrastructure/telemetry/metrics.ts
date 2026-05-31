import { collectDefaultMetrics, Counter, Gauge, Registry } from 'prom-client';

export const registry = new Registry();
registry.setDefaultLabels({ app: 'pmg-presence' });
collectDefaultMetrics({ register: registry, prefix: 'pmg_node_' });

export const checkinCounter = new Counter({
  name: 'pmg_checkin_total',
  help: 'Check-in/out events by method, direction, and personType',
  labelNames: ['method', 'direction', 'personType'] as const,
  registers: [registry],
});

export const patientLookupCounter = new Counter({
  name: 'pmg_patient_lookup_total',
  help: 'Patient lookup outcomes (match or miss)',
  labelNames: ['outcome'] as const,
  registers: [registry],
});

export const fireEventsCounter = new Counter({
  name: 'pmg_fire_events_total',
  help: 'Fire alarm events triggered',
  registers: [registry],
});

export const rollcallAccountedCounter = new Counter({
  name: 'pmg_rollcall_accounted_total',
  help: 'Roll-call accounted-for marks',
  registers: [registry],
});

export const authFailuresCounter = new Counter({
  name: 'pmg_auth_failures_total',
  help: 'Authentication failures by reason',
  labelNames: ['reason'] as const,
  registers: [registry],
});

// Gauge updated after each check-in/out with the snapshot counts
export const occupancyGauge = new Gauge({
  name: 'pmg_occupancy_current',
  help: 'Current on-site occupants by personType',
  labelNames: ['personType'] as const,
  registers: [registry],
});

// SSE connections — collected lazily via a broker reference set at startup
let _getBrokerCount: (() => number) | null = null;

export function registerSseBroker(getBrokerCount: () => number): void {
  _getBrokerCount = getBrokerCount;
}

new Gauge({
  name: 'pmg_sse_connections',
  help: 'Active SSE stream connections',
  registers: [registry],
  collect() {
    this.set(_getBrokerCount?.() ?? 0);
  },
});
