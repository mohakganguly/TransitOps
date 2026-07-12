import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import {
  Badge, Modal, Field, Table, EmptyRow, ErrorBanner,
  inputCls, btnPrimary, btnSecondary, btnSmallGhost, btnDanger,
} from '../components/ui';

const EMPTY = { name: '', license_no: '', license_category: 'LMV', license_expiry: '', contact: '', safety_score: 100, status: 'Available' };
const CATEGORIES = ['LMV', 'HMV', 'MCWG', 'Transport'];
const STATUSES = ['Available', 'Off Duty', 'Suspended'];

const isExpired = (d) => new Date(d) < new Date(new Date().toISOString().slice(0, 10));
const expiresSoon = (d) => !isExpired(d) && (new Date(d) - new Date()) / 86400000 <= 60;

function scoreColor(s) {
  if (s >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (s >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export default function Drivers() {
  const { user } = useAuth();
  const canEdit = ['fleet_manager', 'safety_officer'].includes(user.role);
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    api('/drivers').then(setDrivers).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const filtered = useMemo(() => {
    let rows = drivers;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((d) => d.name.toLowerCase().includes(q) || d.license_no.toLowerCase().includes(q));
    }
    if (statusFilter) rows = rows.filter((d) => d.status === statusFilter);
    return rows;
  }, [drivers, search, statusFilter]);

  const openNew = () => { setForm(EMPTY); setFormError(''); setEditing('new'); };
  const openEdit = (d) => { setForm({ ...d }); setFormError(''); setEditing(d); };

  const save = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      if (editing === 'new') await api('/drivers', { method: 'POST', body: form });
      else await api(`/drivers/${editing.id}`, { method: 'PUT', body: form });
      setEditing(null);
      load();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const remove = async (d) => {
    if (!confirm(`Delete driver ${d.name}?`)) return;
    try {
      await api(`/drivers/${d.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const setStatus = async (d, status) => {
    setError('');
    try {
      await api(`/drivers/${d.id}`, { method: 'PUT', body: { status } });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Drivers</h1>
        {canEdit && <button className={btnPrimary} onClick={openNew}>+ Add driver</button>}
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <div className="flex flex-wrap gap-2">
        <input
          className={`${inputCls} max-w-xs`}
          placeholder="Search name or license…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={`${inputCls} max-w-40`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['Available', 'On Trip', 'Off Duty', 'Suspended'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <Table headers={['Name', 'License', 'Category', 'Expiry', 'Contact', 'Safety score', 'Status', canEdit ? 'Actions' : ''].filter(Boolean)}>
        {filtered.length === 0 && <EmptyRow colSpan={8} />}
        {filtered.map((d) => (
          <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <td className="px-4 py-3 font-medium">{d.name}</td>
            <td className="px-4 py-3 font-mono text-xs">{d.license_no}</td>
            <td className="px-4 py-3">{d.license_category}</td>
            <td className="px-4 py-3">
              <span className={isExpired(d.license_expiry) ? 'font-medium text-red-600 dark:text-red-400' : expiresSoon(d.license_expiry) ? 'font-medium text-amber-600 dark:text-amber-400' : ''}>
                {d.license_expiry}
                {isExpired(d.license_expiry) && ' (expired)'}
                {expiresSoon(d.license_expiry) && ' (soon)'}
              </span>
            </td>
            <td className="px-4 py-3 text-xs">{d.contact || '—'}</td>
            <td className={`px-4 py-3 font-semibold ${scoreColor(d.safety_score)}`}>{d.safety_score}</td>
            <td className="px-4 py-3">
              {canEdit && d.status !== 'On Trip' ? (
                <select
                  className="rounded-full border-0 bg-transparent py-0.5 pl-1 pr-6 text-xs font-medium ring-1 ring-slate-300 dark:ring-slate-700 dark:bg-slate-900"
                  value={d.status}
                  onChange={(e) => setStatus(d, e.target.value)}
                  title="Toggle status"
                >
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              ) : (
                <Badge>{d.status}</Badge>
              )}
            </td>
            {canEdit && (
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button className={btnSmallGhost} onClick={() => openEdit(d)}>Edit</button>
                  <button className={btnDanger} onClick={() => remove(d)}>Delete</button>
                </div>
              </td>
            )}
          </tr>
        ))}
      </Table>

      {editing && (
        <Modal title={editing === 'new' ? 'Add driver' : `Edit ${editing.name}`} onClose={() => setEditing(null)} wide>
          <ErrorBanner message={formError} onDismiss={() => setFormError('')} />
          <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <input className={inputCls} value={form.name} onChange={set('name')} required />
            </Field>
            <Field label="License number">
              <input className={inputCls} value={form.license_no} onChange={set('license_no')} required />
            </Field>
            <Field label="License category">
              <select className={inputCls} value={form.license_category} onChange={set('license_category')}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="License expiry">
              <input type="date" className={inputCls} value={form.license_expiry} onChange={set('license_expiry')} required />
            </Field>
            <Field label="Contact number">
              <input className={inputCls} value={form.contact} onChange={set('contact')} placeholder="+91 …" />
            </Field>
            <Field label="Safety score (0–100)">
              <input type="number" min="0" max="100" className={inputCls} value={form.safety_score} onChange={set('safety_score')} />
            </Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={set('status')} disabled={form.status === 'On Trip'}>
                {form.status === 'On Trip' ? <option>On Trip</option> : STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <div className="col-span-full flex justify-end gap-2 pt-2">
              <button type="button" className={btnSecondary} onClick={() => setEditing(null)}>Cancel</button>
              <button className={btnPrimary}>{editing === 'new' ? 'Create driver' : 'Save changes'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
