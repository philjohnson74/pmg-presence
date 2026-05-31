import { Router } from 'express';
import { z } from 'zod';
import type { RequestHandler } from 'express';
import type { Employee } from '../../domain/entities.js';
import type { EmployeeRepository } from '../../domain/repositories.js';
import { NotFoundError, ValidationError } from '../../application/errors.js';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().nullable().optional(),
  role: z.enum(['admin', 'marshal', 'employee']),
  employeeNumber: z.string().min(1).max(50),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().nullable().optional(),
  role: z.enum(['admin', 'marshal', 'employee']).optional(),
  active: z.boolean().optional(),
});

function toResponse(e: Employee) {
  return {
    id: e.id,
    name: e.name,
    email: e.email,
    role: e.role,
    employeeNumber: e.employeeNumber,
    active: e.active,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

// ─── Router factory ───────────────────────────────────────────────────────────

export function makeEmployeesRouter(
  employees: EmployeeRepository,
  requireAuth: RequestHandler,
  requireAdmin: RequestHandler,
): Router {
  const router = Router();

  // GET /api/employees — list all employees (active + inactive)
  router.get('/employees', requireAuth, requireAdmin, (_req, res, next) => {
    employees
      .listAll()
      .then((list) => res.json({ employees: list.map(toResponse) }))
      .catch((err: unknown) => next(err));
  });

  // POST /api/employees — create employee
  router.post('/employees', requireAuth, requireAdmin, (req, res, next) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError(JSON.stringify(parsed.error.flatten())));
    }
    const { name, email, role, employeeNumber } = parsed.data;
    employees
      .create({
        name,
        email: email ?? null,
        role,
        employeeNumber,
        qrCodeToken: '',
      })
      .then((emp) => res.status(201).json(toResponse(emp)))
      .catch((err: unknown) => next(err));
  });

  // PATCH /api/employees/:id — edit or deactivate
  router.patch('/employees/:id', requireAuth, requireAdmin, (req, res, next) => {
    const id = req.params['id'] as string;
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError(JSON.stringify(parsed.error.flatten())));
    }
    const { name, email, role, active } = parsed.data;
    const patch = {
      ...(name === undefined ? {} : { name }),
      ...(email === undefined ? {} : { email: email ?? null }),
      ...(role === undefined ? {} : { role }),
      ...(active === undefined ? {} : { active }),
    };

    employees
      .findById(id)
      .then((existing) => {
        if (!existing) throw new NotFoundError('Employee not found');
        return employees.update(id, patch);
      })
      .then((emp) => res.json(toResponse(emp)))
      .catch((err: unknown) => next(err));
  });

  return router;
}
