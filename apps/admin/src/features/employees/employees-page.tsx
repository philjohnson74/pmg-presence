import React, { useCallback, useEffect, useState } from 'react';
import type { Employee, CreateEmployeeRequest, UpdateEmployeeRequest, Role } from '@pmg/contracts';
import { Button, Badge } from '@pmg/ui';
import { fetchEmployees, createEmployee, updateEmployee } from '../../lib/api.js';
import { useSession } from '../auth/use-session.js';

// ─── Employee form ─────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  email: string;
  role: Role;
  employeeNumber: string;
}

const BLANK: FormState = { name: '', email: '', role: 'employee', employeeNumber: '' };

interface EmployeeFormProps {
  initial?: Employee | null;
  onSave: (data: FormState) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

function EmployeeForm({ initial, onSave, onCancel, saving }: Readonly<EmployeeFormProps>) {
  const [form, setForm] = useState<FormState>(
    initial
      ? { name: initial.name, email: initial.email ?? '', role: initial.role, employeeNumber: initial.employeeNumber }
      : BLANK,
  );

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-pmg-navy mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          required
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pmg-navy focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-pmg-navy mb-1">
          Email <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder="Leave blank if no email"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pmg-navy focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-pmg-navy mb-1">
          Employee number <span className="text-red-500">*</span>
        </label>
        <input
          required
          value={form.employeeNumber}
          onChange={(e) => set('employeeNumber', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pmg-navy focus:outline-none"
          disabled={!!initial}
        />
        {initial && (
          <p className="text-xs text-gray-400 mt-1">Employee number cannot be changed after creation.</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-pmg-navy mb-1">Role</label>
        <select
          value={form.role}
          onChange={(e) => set('role', e.target.value as Role)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pmg-navy focus:outline-none"
        >
          <option value="employee">Employee</option>
          <option value="marshal">Marshal</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving} size="sm">
          {saving ? 'Saving…' : initial ? 'Update' : 'Create'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ─── Dialog wrapper ────────────────────────────────────────────────────────────

function Modal({ title, children, onClose }: Readonly<{ title: string; children: React.ReactNode; onClose: () => void }>) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-pmg-navy">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type Dialog = { type: 'add' } | { type: 'edit'; employee: Employee };

export function EmployeesPage() {
  const { token } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchEmployees(token);
      setEmployees(data.employees);
    } catch {
      setError('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function handleSave(form: { name: string; email: string; role: Role; employeeNumber: string }) {
    if (!token) return;
    setSaving(true);
    try {
      const email = form.email.trim() || null;
      if (dialog?.type === 'add') {
        const body: CreateEmployeeRequest = {
          name: form.name,
          email,
          role: form.role,
          employeeNumber: form.employeeNumber,
        };
        await createEmployee(token, body);
      } else if (dialog?.type === 'edit') {
        const body: UpdateEmployeeRequest = { name: form.name, email, role: form.role };
        await updateEmployee(token, dialog.employee.id, body);
      }
      setDialog(null);
      await load();
    } catch {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(emp: Employee) {
    if (!token) return;
    if (!confirm(`Deactivate ${emp.name}?`)) return;
    try {
      await updateEmployee(token, emp.id, { active: false });
      await load();
    } catch {
      setError('Deactivate failed');
    }
  }

  async function handleReactivate(emp: Employee) {
    if (!token) return;
    try {
      await updateEmployee(token, emp.id, { active: true });
      await load();
    } catch {
      setError('Reactivate failed');
    }
  }

  const active = employees.filter((e) => e.active);
  const inactive = employees.filter((e) => !e.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-pmg-navy">Employees</h1>
          <p className="text-sm text-gray-500 mt-0.5">{active.length} active</p>
        </div>
        <Button size="sm" onClick={() => setDialog({ type: 'add' })}>
          + Add employee
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex justify-between">
          {error}
          <button onClick={() => setError(null)} className="font-semibold">Dismiss</button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <EmployeeTable
          employees={active}
          onEdit={(e) => setDialog({ type: 'edit', employee: e })}
          onDeactivate={handleDeactivate}
          onReactivate={handleReactivate}
          showInactive={inactive}
        />
      )}

      {dialog && (
        <Modal
          title={dialog.type === 'add' ? 'Add employee' : `Edit ${dialog.type === 'edit' ? dialog.employee.name : ''}`}
          onClose={() => setDialog(null)}
        >
          <EmployeeForm
            initial={dialog.type === 'edit' ? dialog.employee : null}
            onSave={handleSave}
            onCancel={() => setDialog(null)}
            saving={saving}
          />
        </Modal>
      )}
    </div>
  );
}

// ─── Table ─────────────────────────────────────────────────────────────────────

const ROLE_VARIANT: Record<Role, 'employee' | 'visitor' | 'patient'> = {
  admin: 'patient',
  marshal: 'visitor',
  employee: 'employee',
};

interface EmployeeTableProps {
  employees: Employee[];
  showInactive: Employee[];
  onEdit: (e: Employee) => void;
  onDeactivate: (e: Employee) => void;
  onReactivate: (e: Employee) => void;
}

function EmployeeTable({
  employees,
  showInactive,
  onEdit,
  onDeactivate,
  onReactivate,
}: Readonly<EmployeeTableProps>) {
  const [showingInactive, setShowingInactive] = useState(false);
  const rows = showingInactive ? [...employees, ...showInactive] : employees;

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-pmg-navy">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-pmg-navy">Employee #</th>
              <th className="px-4 py-3 text-left font-semibold text-pmg-navy">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-pmg-navy">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-pmg-navy">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((emp) => (
              <tr key={emp.id} className={!emp.active ? 'opacity-50' : undefined}>
                <td className="px-4 py-3 font-medium text-pmg-navy">{emp.name}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{emp.employeeNumber}</td>
                <td className="px-4 py-3 text-gray-600">{emp.email ?? <span className="text-gray-400">—</span>}</td>
                <td className="px-4 py-3">
                  <Badge variant={ROLE_VARIANT[emp.role]}>
                    {emp.role.charAt(0).toUpperCase() + emp.role.slice(1)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {emp.active ? (
                    <span className="text-xs font-semibold text-pmg-green">Active</span>
                  ) : (
                    <span className="text-xs font-semibold text-gray-400">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => onEdit(emp)}
                    className="text-xs text-pmg-navy hover:underline mr-3"
                  >
                    Edit
                  </button>
                  {emp.active ? (
                    <button
                      onClick={() => void onDeactivate(emp)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => void onReactivate(emp)}
                      className="text-xs text-pmg-cyan hover:underline"
                    >
                      Reactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showInactive.length > 0 && (
        <button
          onClick={() => setShowingInactive((s) => !s)}
          className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline"
        >
          {showingInactive
            ? 'Hide inactive'
            : `Show ${showInactive.length} inactive employee${showInactive.length !== 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  );
}
