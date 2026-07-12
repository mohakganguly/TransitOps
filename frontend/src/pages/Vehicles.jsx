import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import {
  Badge, Modal, Field, Table, EmptyRow, ErrorBanner,
  inputCls, btnPrimary, btnSecondary, btnSmallGhost, btnDanger, fmtMoney, fmtNum,
} from '../components/ui';

const EMPTY = { reg_no: '', name: '', type: 'Van', region: 'Central', max_load: '', odometer: 0, acquisition_cost: '', status: 'Available' };
const TYPES = ['Van', 'Truck', 'Mini Truck', 'Trailer', 'Bus', 'Pickup'];
const REGIONS = ['North', 'South', 'East', 'West', 'Central'];
const STATUSES = ['Available', 'In Shop', 'Retired'];

export default function Vehicles() {
  const { user } = useAuth();
  const canEdit = user.role === 'fleet_manager';
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [editing, setEditing] = useState(null); // null | 'new' | vehicle object
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    api('/vehicles').then(setVehicles).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const filtered = useMemo(() => {
    let rows = vehicles;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((v) => v.reg_no.toLowerCase().includes(q) || v.name.toLowerCase().includes(q));
    }
    if (statusFilter) rows = rows.filter((v) => v.status === statusFilter);
    return [...rows].sort((a, b) => {
      if (sortBy === 'odometer') return b.odometer - a.odometer;
      if (sortBy === 'max_load') return b.max_load - a.max_load;
      return String(a[sortBy]).localeCompare(String(b[sortBy]));
    });
  }, [vehicles, search, statusFilter, sortBy]);

  const openNew = () => { setForm(EMPTY); setFormError(''); setEditing('new'); };
  const openEdit = (v) => { setForm({ ...v }); setFormError(''); setEditing(v); };

  const save = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      if (editing === 'new') await api('/vehicles', { method: 'POST', body: form });
      else await api(`/vehicles/${editing.id}`, { method: 'PUT', body: form });
      setEditing(null);
      load();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const remove = async (v) => {
    if (!confirm(`Delete ${v.name} (${v.reg_no})?`)) return;
    try {
      await api(`/vehicles/${v.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const setStatus = async (v, status) => {
    setError('');
    try {
      await api(`/vehicles/${v.id}`, { method: 'PUT', body: { status } });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Vehicles</h1>
        {canEdit && <button className={btnPrimary} onClick={openNew}>+ Add vehicle</button>}
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <div className="flex flex-wrap gap-2">
        <input
          className={`${inputCls} max-w-xs`}
          placeholder="Search reg no or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={`${inputCls} max-w-40`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['Available', 'On Trip', 'In Shop', 'Retired'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={`${inputCls} max-w-44`} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="name">Sort: Name</option>
          <option value="reg_no">Sort: Registration</option>
          <option value="odometer">Sort: Odometer ↓</option>
          <option value="max_load">Sort: Capacity ↓</option>
        </select>
      </div>

      <Table headers={['Registration', 'Vehicle', 'Type', 'Region', 'Max load (kg)', 'Odometer (km)', 'Acquisition', 'Status', canEdit ? 'Actions' : ''].filter(Boolean)}>
        {filtered.length === 0 && <EmptyRow colSpan={9} />}
        {filtered.map((v) => (
          <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <td className="px-4 py-3 font-mono text-xs">{v.reg_no}</td>
            <td className="px-4 py-3 font-medium">{v.name}</td>
            <td className="px-4 py-3">{v.type}</td>
            <td className="px-4 py-3">{v.region}</td>
            <td className="px-4 py-3">{fmtNum(v.max_load)}</td>
            <td className="px-4 py-3">{fmtNum(v.odometer)}</td>
            <td className="px-4 py-3">{fmtMoney(v.acquisition_cost)}</td>
            <td className="px-4 py-3">
              {canEdit && v.status !== 'On Trip' ? (
                <select
                  className="rounded-full border-0 bg-transparent py-0.5 pl-1 pr-6 text-xs font-medium ring-1 ring-slate-300 dark:ring-slate-700 dark:bg-slate-900"
                  value={v.status}
                  onChange={(e) => setStatus(v, e.target.value)}
                  title="Toggle status"
                >
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              ) : (
                <Badge>{v.status}</Badge>
              )}
            </td>
            {canEdit && (
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button className={btnSmallGhost} onClick={() => openEdit(v)}>Edit</button>
                  <button className={btnDanger} onClick={() => remove(v)}>Delete</button>
                </div>
              </td>
            )}
          </tr>
        ))}
      </Table>

      {editing && (
        <Modal title={editing === 'new' ? 'Add vehicle' : `Edit ${editing.name}`} onClose={() => setEditing(null)} wide>
          <ErrorBanner message={formError} onDismiss={() => setFormError('')} />
          <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Registration number">
              <input className={inputCls} value={form.reg_no} onChange={set('reg_no')} required placeholder="MH12AB1234" />
            </Field>
            <Field label="Vehicle name / model">
              <input className={inputCls} value={form.name} onChange={set('name')} required placeholder="Van-05" />
            </Field>
            <Field label="Type">
              <select className={inputCls} value={form.type} onChange={set('type')}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Region">
              <select className={inputCls} value={form.region} onChange={set('region')}>
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Max load capacity (kg)">
              <input type="number" min="1" className={inputCls} value={form.max_load} onChange={set('max_load')} required />
            </Field>
            <Field label="Odometer (km)">
              <input type="number" min="0" className={inputCls} value={form.odometer} onChange={set('odometer')} />
            </Field>
            <Field label="Acquisition cost (₹)">
              <input type="number" min="0" className={inputCls} value={form.acquisition_cost} onChange={set('acquisition_cost')} />
            </Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={set('status')} disabled={form.status === 'On Trip'}>
                {form.status === 'On Trip' ? <option>On Trip</option> : STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <div className="col-span-full flex justify-end gap-2 pt-2">
              <button type="button" className={btnSecondary} onClick={() => setEditing(null)}>Cancel</button>
              <button className={btnPrimary}>{editing === 'new' ? 'Create vehicle' : 'Save changes'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
