import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import {
  Badge, Modal, Field, Table, EmptyRow, ErrorBanner,
  inputCls, btnPrimary, btnSecondary, btnSmall, fmtMoney,
} from '../components/ui';

const EMPTY = { vehicle_id: '', type: 'Oil Change', description: '', cost: '' };
const TYPES = ['Oil Change', 'Brake Pads', 'Tire Replacement', 'Engine Overhaul', 'Battery', 'General Service', 'Other'];

export default function Maintenance() {
  const { user } = useAuth();
  const canManage = user.role === 'fleet_manager';
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    api('/maintenance').then(setRecords).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const filtered = useMemo(
    () => (statusFilter ? records.filter((r) => r.status === statusFilter) : records),
    [records, statusFilter]
  );

  const openCreate = async () => {
    setForm(EMPTY);
    setFormError('');
    try {
      const all = await api('/vehicles');
      setVehicles(all.filter((v) => !['Retired', 'On Trip'].includes(v.status)));
      setCreating(true);
    } catch (e) {
      setError(e.message);
    }
  };

  const create = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await api('/maintenance', { method: 'POST', body: form });
      setCreating(false);
      load();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const close = async (r) => {
    setError('');
    try {
      await api(`/maintenance/${r.id}/close`, { method: 'POST' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Maintenance</h1>
        {canManage && <button className={btnPrimary} onClick={openCreate}>+ New record</button>}
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Opening a record automatically moves the vehicle to <Badge>In Shop</Badge> and removes it from dispatch. Closing restores it to <Badge>Available</Badge>.
      </p>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <div className="flex gap-2">
        <select className={`${inputCls} max-w-40`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All records</option>
          <option>Open</option>
          <option>Closed</option>
        </select>
      </div>

      <Table headers={['Vehicle', 'Type', 'Description', 'Cost', 'Opened', 'Closed', 'Status', canManage ? 'Actions' : ''].filter(Boolean)}>
        {filtered.length === 0 && <EmptyRow colSpan={8} />}
        {filtered.map((r) => (
          <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <td className="px-4 py-3">
              <div className="font-medium">{r.vehicle_name}</div>
              <div className="font-mono text-xs text-slate-400">{r.vehicle_reg_no}</div>
            </td>
            <td className="px-4 py-3">{r.type}</td>
            <td className="px-4 py-3 max-w-56 truncate text-slate-500 dark:text-slate-400">{r.description || '—'}</td>
            <td className="px-4 py-3">{fmtMoney(r.cost)}</td>
            <td className="px-4 py-3 text-xs">{r.opened_at?.slice(0, 10)}</td>
            <td className="px-4 py-3 text-xs">{r.closed_at ? r.closed_at.slice(0, 10) : '—'}</td>
            <td className="px-4 py-3"><Badge>{r.status}</Badge></td>
            {canManage && (
              <td className="px-4 py-3">
                {r.status === 'Open' && <button className={btnSmall} onClick={() => close(r)}>Close & release</button>}
              </td>
            )}
          </tr>
        ))}
      </Table>

      {creating && (
        <Modal title="New maintenance record" onClose={() => setCreating(false)}>
          <ErrorBanner message={formError} onDismiss={() => setFormError('')} />
          <form onSubmit={create} className="space-y-4">
            <Field label="Vehicle">
              <select className={inputCls} value={form.vehicle_id} onChange={set('vehicle_id')} required>
                <option value="">Select vehicle…</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} · {v.reg_no} ({v.status})</option>
                ))}
              </select>
            </Field>
            <Field label="Maintenance type">
              <select className={inputCls} value={form.type} onChange={set('type')}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Description">
              <textarea className={inputCls} rows="2" value={form.description} onChange={set('description')} />
            </Field>
            <Field label="Estimated cost (₹)">
              <input type="number" min="0" className={inputCls} value={form.cost} onChange={set('cost')} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnSecondary} onClick={() => setCreating(false)}>Cancel</button>
              <button className={btnPrimary}>Create (vehicle → In Shop)</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
