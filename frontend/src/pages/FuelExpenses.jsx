import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import {
  Modal, Field, Table, EmptyRow, ErrorBanner, Card,
  inputCls, btnPrimary, btnSecondary, btnDanger, fmtMoney, fmtNum,
} from '../components/ui';

const FUEL_EMPTY = { vehicle_id: '', liters: '', cost: '', date: new Date().toISOString().slice(0, 10) };
const EXP_EMPTY = { vehicle_id: '', category: 'Toll', amount: '', date: new Date().toISOString().slice(0, 10), notes: '' };
const CATEGORIES = ['Toll', 'Parking', 'Permit', 'Fine', 'Insurance', 'Other'];

export default function FuelExpenses() {
  const { user } = useAuth();
  const canLog = ['fleet_manager', 'dispatcher', 'financial_analyst'].includes(user.role);
  const [tab, setTab] = useState('fuel');
  const [fuel, setFuel] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(FUEL_EMPTY);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    Promise.all([api('/fuel'), api('/expenses'), api('/vehicles')])
      .then(([f, e, v]) => { setFuel(f); setExpenses(e); setVehicles(v); })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const openAdd = () => {
    setForm(tab === 'fuel' ? FUEL_EMPTY : EXP_EMPTY);
    setFormError('');
    setAdding(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await api(tab === 'fuel' ? '/fuel' : '/expenses', { method: 'POST', body: form });
      setAdding(false);
      load();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const remove = async (path, id) => {
    if (!confirm('Delete this record?')) return;
    try {
      await api(`${path}/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const totalFuelCost = fuel.reduce((s, f) => s + f.cost, 0);
  const totalLiters = fuel.reduce((s, f) => s + f.liters, 0);
  const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Fuel & Expenses</h1>
        {canLog && <button className={btnPrimary} onClick={openAdd}>+ Add {tab === 'fuel' ? 'fuel log' : 'expense'}</button>}
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card><div className="text-xs uppercase text-slate-400">Total fuel cost</div><div className="mt-1 text-2xl font-bold">{fmtMoney(totalFuelCost)}</div></Card>
        <Card><div className="text-xs uppercase text-slate-400">Total fuel volume</div><div className="mt-1 text-2xl font-bold">{fmtNum(totalLiters)} L</div></Card>
        <Card><div className="text-xs uppercase text-slate-400">Other expenses</div><div className="mt-1 text-2xl font-bold">{fmtMoney(totalExpenses)}</div></Card>
      </div>

      <div className="flex rounded-lg bg-slate-200 p-1 dark:bg-slate-800 w-fit">
        {[['fuel', 'Fuel logs'], ['expenses', 'Other expenses']].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${tab === k ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'fuel' ? (
        <Table headers={['Date', 'Vehicle', 'Liters', 'Cost', 'Trip', canLog ? 'Actions' : ''].filter(Boolean)}>
          {fuel.length === 0 && <EmptyRow colSpan={6} />}
          {fuel.map((f) => (
            <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="px-4 py-3">{f.date}</td>
              <td className="px-4 py-3">
                <div className="font-medium">{f.vehicle_name}</div>
                <div className="font-mono text-xs text-slate-400">{f.vehicle_reg_no}</div>
              </td>
              <td className="px-4 py-3">{fmtNum(f.liters)} L</td>
              <td className="px-4 py-3">{fmtMoney(f.cost)}</td>
              <td className="px-4 py-3 text-xs">{f.trip_id ? `Trip #${f.trip_id}` : '—'}</td>
              {canLog && (
                <td className="px-4 py-3"><button className={btnDanger} onClick={() => remove('/fuel', f.id)}>Delete</button></td>
              )}
            </tr>
          ))}
        </Table>
      ) : (
        <Table headers={['Date', 'Category', 'Vehicle', 'Amount', 'Notes', canLog ? 'Actions' : ''].filter(Boolean)}>
          {expenses.length === 0 && <EmptyRow colSpan={6} />}
          {expenses.map((x) => (
            <tr key={x.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="px-4 py-3">{x.date}</td>
              <td className="px-4 py-3 font-medium">{x.category}</td>
              <td className="px-4 py-3">{x.vehicle_name || '—'}</td>
              <td className="px-4 py-3">{fmtMoney(x.amount)}</td>
              <td className="px-4 py-3 max-w-52 truncate text-slate-500 dark:text-slate-400">{x.notes || '—'}</td>
              {canLog && (
                <td className="px-4 py-3"><button className={btnDanger} onClick={() => remove('/expenses', x.id)}>Delete</button></td>
              )}
            </tr>
          ))}
        </Table>
      )}

      {adding && (
        <Modal title={tab === 'fuel' ? 'Add fuel log' : 'Add expense'} onClose={() => setAdding(false)}>
          <ErrorBanner message={formError} onDismiss={() => setFormError('')} />
          <form onSubmit={save} className="space-y-4">
            <Field label={tab === 'fuel' ? 'Vehicle' : 'Vehicle (optional)'}>
              <select className={inputCls} value={form.vehicle_id} onChange={set('vehicle_id')} required={tab === 'fuel'}>
                <option value="">Select vehicle…</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name} · {v.reg_no}</option>)}
              </select>
            </Field>
            {tab === 'fuel' ? (
              <>
                <Field label="Liters">
                  <input type="number" min="0.1" step="0.1" className={inputCls} value={form.liters} onChange={set('liters')} required />
                </Field>
                <Field label="Cost (₹)">
                  <input type="number" min="0" className={inputCls} value={form.cost} onChange={set('cost')} required />
                </Field>
              </>
            ) : (
              <>
                <Field label="Category">
                  <select className={inputCls} value={form.category} onChange={set('category')}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Amount (₹)">
                  <input type="number" min="1" className={inputCls} value={form.amount} onChange={set('amount')} required />
                </Field>
                <Field label="Notes">
                  <input className={inputCls} value={form.notes} onChange={set('notes')} />
                </Field>
              </>
            )}
            <Field label="Date">
              <input type="date" className={inputCls} value={form.date} onChange={set('date')} required />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnSecondary} onClick={() => setAdding(false)}>Cancel</button>
              <button className={btnPrimary}>Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
