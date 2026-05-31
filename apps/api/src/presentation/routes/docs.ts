import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'PMG Presence API',
    version: '1.0.0',
    description:
      'Visitor, patient and employee presence management for Peacock Medical Group. ' +
      'All protected routes require a Bearer JWT issued by `POST /api/auth/login`.',
  },
  servers: [{ url: 'http://localhost:4000', description: 'Local dev' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'integer' },
          detail: { type: 'string' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['userId'],
        properties: { userId: { type: 'string', example: 'emp-001' } },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              sub: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string', nullable: true },
              roles: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
      CheckInRequest: {
        type: 'object',
        properties: {
          method: {
            type: 'string',
            enum: ['qr', 'email', 'patient-lookup', 'visitor-form', 'manual'],
          },
          locationId: { type: 'string', example: 'loc-reception' },
          qrToken: { type: 'string', description: 'Required when method=qr' },
          email: { type: 'string', description: 'Required when method=email' },
          patientId: { type: 'string', description: 'Required when method=patient-lookup' },
          personId: { type: 'string', description: 'For direct checkout by kiosk picker' },
          personType: { type: 'string', enum: ['employee', 'patient', 'visitor'] },
          visitor: {
            type: 'object',
            description: 'Required when method=visitor-form',
            properties: {
              name: { type: 'string' },
              email: { type: 'string', nullable: true },
              company: { type: 'string', nullable: true },
              host: { type: 'string' },
              visitReason: { type: 'string' },
              visitCategory: {
                type: 'string',
                enum: ['contractor', 'supplier', 'auditor', 'nhs-commissioner', 'other'],
                nullable: true,
              },
            },
          },
          booking: {
            type: 'object',
            properties: {
              startDate: { type: 'string', format: 'date' },
              endDate: { type: 'string', format: 'date' },
            },
          },
          manual: {
            type: 'object',
            description: 'Required when method=manual',
            properties: {
              name: { type: 'string' },
              employeeNumber: { type: 'string' },
              note: { type: 'string' },
            },
          },
        },
      },
      CheckInResponse: {
        type: 'object',
        properties: {
          eventId: { type: 'string' },
          personType: { type: 'string' },
          displayName: { type: 'string' },
          direction: { type: 'string', enum: ['in', 'out'] },
          timestamp: { type: 'string', format: 'date-time' },
          alreadyOnsite: { type: 'boolean' },
          debounced: { type: 'boolean' },
          pass: {
            type: 'object',
            nullable: true,
            properties: {
              passToken: { type: 'string' },
              passCode: { type: 'string' },
              validUntil: { type: 'string', format: 'date' },
            },
          },
        },
      },
      OnsiteSnapshot: {
        type: 'object',
        properties: {
          occupants: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                personId: { type: 'string' },
                personType: { type: 'string' },
                displayName: { type: 'string' },
                visitCategory: { type: 'string', nullable: true },
                host: { type: 'string', nullable: true },
              },
            },
          },
          counts: {
            type: 'object',
            properties: {
              employee: { type: 'integer' },
              patient: { type: 'integer' },
              visitor: { type: 'integer' },
            },
          },
          visitorsByCategory: {
            type: 'object',
            additionalProperties: { type: 'integer' },
          },
        },
      },
      RollCallEntry: {
        type: 'object',
        properties: {
          personId: { type: 'string' },
          personType: { type: 'string' },
          displayName: { type: 'string' },
          state: {
            type: 'string',
            enum: ['unaccounted', 'accounted', 'expected-absent'],
          },
          accountedBy: { type: 'string', nullable: true },
          accountedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'Login and identity' },
    { name: 'Check-in', description: 'Public kiosk check-in/out (no auth required)' },
    { name: 'Onsite', description: 'Live occupancy and SSE stream — requires admin or marshal role' },
    { name: 'Fire', description: 'Evacuation alarm management' },
    { name: 'Patients', description: 'Clinical system lookup — public' },
    { name: 'QR', description: 'Rotating QR tokens for employees — requires any authenticated role' },
    { name: 'Employees', description: 'Employee CRUD — requires admin role' },
    { name: 'Visits', description: 'Visit history — requires admin role' },
    { name: 'Expected', description: 'Expected presence (M365 + bookings) — requires admin or marshal role' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Auth'],
        summary: 'Health check',
        responses: { '200': { description: 'API is running' } },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Mock SSO login — pick a seeded user by ID',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: {
          '200': { description: 'JWT token + user object', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
          '404': { description: 'User not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Return the authenticated user — any role',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Authenticated user' },
          '401': { description: 'Unauthenticated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/auth/users': {
      get: {
        tags: ['Auth'],
        summary: 'List seeded users for the mock login picker (public)',
        responses: { '200': { description: 'Array of seeded employees' } },
      },
    },
    '/api/checkin': {
      post: {
        tags: ['Check-in'],
        summary: 'Check a person in — public, all identity methods',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CheckInRequest' } } } },
        responses: {
          '201': { description: 'Check-in event created', content: { 'application/json': { schema: { $ref: '#/components/schemas/CheckInResponse' } } } },
          '200': { description: 'Debounced — same event returned' },
          '400': { description: 'Validation error' },
          '404': { description: 'Person not found' },
        },
      },
    },
    '/api/checkout': {
      post: {
        tags: ['Check-in'],
        summary: 'Check a person out — public',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CheckInRequest' } } } },
        responses: {
          '201': { description: 'Check-out event created', content: { 'application/json': { schema: { $ref: '#/components/schemas/CheckInResponse' } } } },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/api/patients/lookup': {
      get: {
        tags: ['Patients'],
        summary: 'Patient name + DOB lookup — public, rate-limited (5 req / 30s)',
        parameters: [
          { name: 'name', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'dob', in: 'query', required: true, schema: { type: 'string', format: 'date' }, description: 'YYYY-MM-DD, must not be future' },
        ],
        responses: {
          '200': { description: 'match: true with patient reference, or match: false' },
          '429': { description: 'Rate limit exceeded' },
        },
      },
    },
    '/api/visits/returning': {
      get: {
        tags: ['Check-in'],
        summary: 'Returning multi-day visitor lookup by surname + pass code — public, rate-limited',
        parameters: [
          { name: 'surname', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'code', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Visitor booking found and within window' },
          '404': { description: 'No matching active booking' },
        },
      },
    },
    '/api/employees/me/qr': {
      get: {
        tags: ['QR'],
        summary: 'Issue a 60-second rotating QR token — any authenticated role',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'QR token + expiry', content: { 'application/json': { schema: { type: 'object', properties: { qrToken: { type: 'string' }, expiresAt: { type: 'string' } } } } } },
          '401': { description: 'Unauthenticated' },
        },
      },
    },
    '/api/onsite': {
      get: {
        tags: ['Onsite'],
        summary: 'Live occupancy snapshot — admin or marshal',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['employee', 'patient', 'visitor'] }, description: 'Filter by personType' },
        ],
        responses: {
          '200': { description: 'Snapshot with occupants, counts, visitorsByCategory', content: { 'application/json': { schema: { $ref: '#/components/schemas/OnsiteSnapshot' } } } },
          '401': { description: 'Unauthenticated' },
          '403': { description: 'Insufficient role' },
        },
      },
    },
    '/api/onsite/visitors': {
      get: {
        tags: ['Onsite'],
        summary: 'Data-minimised checked-in visitor list for kiosk checkout picker — public',
        responses: {
          '200': { description: 'List of {personId, displayName} for currently checked-in visitors' },
        },
      },
    },
    '/api/onsite/stream': {
      get: {
        tags: ['Onsite'],
        summary: 'SSE stream — admin or marshal. Auth via ?access_token= (EventSource cannot set headers)',
        parameters: [
          { name: 'access_token', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'SSE stream: onsite.changed | fire.triggered | rollcall.updated | heartbeat', content: { 'text/event-stream': {} } },
          '401': { description: 'Missing or invalid token' },
          '403': { description: 'Insufficient role' },
        },
      },
    },
    '/api/onsite/rollcall': {
      get: {
        tags: ['Fire'],
        summary: 'Roll-call entries for the active fire event — admin or marshal',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Roll-call with unaccounted / accounted / expected-absent entries' },
          '409': { description: 'No active fire event' },
        },
      },
    },
    '/api/onsite/rollcall/{personId}': {
      patch: {
        tags: ['Fire'],
        summary: 'Mark person accounted-for in active roll-call — admin or marshal',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'personId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { accountedFor: { type: 'boolean' } }, required: ['accountedFor'] } } },
        },
        responses: {
          '200': { description: 'Updated roll-call entry', content: { 'application/json': { schema: { $ref: '#/components/schemas/RollCallEntry' } } } },
          '409': { description: 'No active fire event' },
        },
      },
    },
    '/api/fire/trigger': {
      post: {
        tags: ['Fire'],
        summary: 'Trigger fire alarm — public (kiosk) or admin JWT',
        security: [{ bearerAuth: [] }],
        responses: {
          '201': { description: 'Fire event created with roll-call snapshot' },
          '409': { description: 'Fire event already active' },
        },
      },
    },
    '/api/fire/events': {
      get: {
        tags: ['Fire'],
        summary: 'List all fire events — admin or marshal',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Array of fire events ordered by triggeredAt' },
        },
      },
    },
    '/api/fire/{id}/resolve': {
      post: {
        tags: ['Fire'],
        summary: 'Resolve (stand down) an active fire event — admin only',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Resolved fire event' },
          '404': { description: 'Fire event not found' },
        },
      },
    },
    '/api/expected': {
      get: {
        tags: ['Expected'],
        summary: 'Expected presence for a date (M365 calendar + active bookings) — admin or marshal',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Defaults to today (YYYY-MM-DD)' },
        ],
        responses: {
          '200': { description: 'date + expected[] with source labels and checkedInToday flag' },
          '400': { description: 'Invalid date format' },
        },
      },
    },
    '/api/employees': {
      get: {
        tags: ['Employees'],
        summary: 'List all employees (active + inactive) — admin only',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Array of employees' } },
      },
      post: {
        tags: ['Employees'],
        summary: 'Create employee — admin only. email is optional (null for no-email staff)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'employeeNumber', 'role'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', nullable: true },
                  employeeNumber: { type: 'string' },
                  role: { type: 'string', enum: ['admin', 'marshal', 'employee'] },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created employee' }, '409': { description: 'employeeNumber already exists' } },
      },
    },
    '/api/employees/{id}': {
      patch: {
        tags: ['Employees'],
        summary: 'Update employee fields — admin only. Pass null email to clear.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string', nullable: true }, role: { type: 'string' }, active: { type: 'boolean' } } } } },
        },
        responses: { '200': { description: 'Updated employee' }, '404': { description: 'Not found' } },
      },
    },
    '/api/visits/history': {
      get: {
        tags: ['Visits'],
        summary: 'Check-in event history — admin only',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Name search' },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['employee', 'patient', 'visitor'] } },
        ],
        responses: { '200': { description: 'Array of check-in events' } },
      },
    },
    '/api/employees/me/visits': {
      get: {
        tags: ['Visits'],
        summary: "Authenticated employee's own visit history — any role",
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Array of check-in events for the caller' } },
      },
    },
    '/metrics': {
      get: {
        tags: ['Onsite'],
        summary: 'Prometheus metrics scrape endpoint',
        responses: { '200': { description: 'Prometheus text format metrics', content: { 'text/plain': {} } } },
      },
    },
  },
};

export function makeDocsRouter(): Router {
  const router = Router();
  router.use('/', swaggerUi.serve);
  router.get('/', swaggerUi.setup(spec, { explorer: false }));
  return router;
}
