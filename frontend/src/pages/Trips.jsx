import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import {
  Badge, Modal, Field, Table, EmptyRow, ErrorBanner,
  inputCls, btnPrimary, btnSecondary, btnSmall, btnSmallGhost, btnDanger, fmtNum, fmtMoney,
} from '../components/ui';

const EMPTY = { source: '', destination: '', vehicle_id: '', driver_id: '', cargo_weight: '', planned_distance: '', revenue: '' };

export default function Trips() {
  const { user } = useAuth();
  const canOperate = ['fleet_manager', 'dispatcher'].includes(user.role);
  const [trips, setTrips] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [completing, setCompleting] = useState(null); // trip being completed
  const [options, setOptions] = useState({ vehicles: [], drivers: [] });
  const [form, setForm] = useState(EMPTY);
  const [completeForm, setCompleteForm] = useState({ final_odometer: '', fuel_consumed: '', fuel_cost: '' });
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    api('/trips').then(setTrips).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const filtered = useMemo(
    () => (statusFilter ? trips.filter((t) => t.status === statusFilter) : trips),
    [trips, statusFilter]
  );

  const selectedVehicle = options.vehicles.find((v) => String(v.id) === String(form.vehicle_id));
  const overweight = selectedVehicle && Number(form.cargo_weight) > selectedVehicle.max_load;

  const openCreate = async () => {
    setForm(EMPTY);
    setFormError('');
    try {
      setOptions(await api('/trips/options'));
      setCreating(true);
    } catch (e) {
      setError(e.message);
    }
  };

  const createTrip = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await api('/trips', { method: 'POST', body: form });
      setCreating(false);
      load();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const action = async (trip, verb) => {
    setError('');
    try {
      await api(`/trips/${trip.id}/${verb}`, { method: 'POST' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const openComplete = (trip) => {
    setCompleteForm({ final_odometer: trip.start_odometer ?? '', fuel_consumed: '', fuel_cost: '' });
    setFormError('');
    setCompleting(trip);
  };

  const completeTrip = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await api(`/trips/${completing.id}/complete`, { method: 'POST', body: completeForm });
      setCompleting(null);
      load();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Trips</h1>
        {canOperate && <button className={btnPrimary} onClick={openCreate}>+ New trip</button>}
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <div className="flex gap-2">
        <select className={`${inputCls} max-w-44`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['Draft', 'Dispatched', 'Completed', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <Table headers={['Route', 'Vehicle', 'Driver', 'Cargo (kg)', 'Distance (km)', 'Revenue', 'Status', canOperate ? 'Actions' : ''].filter(Boolean)}>
        {filtered.length === 0 && <EmptyRow colSpan={8} />}
        {filtered.map((t) => (
          <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <td className="px-4 py-3">
              <div className="font-medium">{t.source} → {t.destination}</div>
              <div className="text-xs text-slate-400">#{t.id} · {t.created_at?.slice(0, 10)}</div>
            </td>
            <td className="px-4 py-3">
              <div>{t.vehicle_name}</div>
              <div className="font-mono text-xs text-slate-400">{t.vehicle_reg_no}</div>
            </td>
            <td className="px-4 py-3">{t.driver_name}</td>
            <td className="px-4 py-3">{fmtNum(t.cargo_weight)}</td>
            <td className="px-4 py-3">
              {t.status === 'Completed' && t.final_odometer != null
                ? `${fmtNum(t.final_odometer - t.start_odometer)} actual`
                : `${fmtNum(t.planned_distance)} planned`}
            </td>
            <td className="px-4 py-3">{fmtMoney(t.revenue)}</td>
            <td className="px-4 py-3"><Badge>{t.status}</Badge></td>
            {canOperate && (
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {t.status === 'Draft' && (
                    <>
                      <button className={btnSmall} onClick={() => action(t, 'dispatch')}>Dispatch</button>
                      <button className={btnSmallGhost} onClick={() => action(t, 'cancel')}>Cancel</button>
                    </>
                  )}
                  {t.status === 'Dispatched' && (
                    <>
                      <button className={btnSmall} onClick={() => openComplete(t)}>Complete</button>
                      <button className={btnDanger} onClick={() => action(t, 'cancel')}>Cancel</button>
                    </>
                  )}
                </div>
              </td>
            )}
          </tr>
        ))}
      </Table>

      {creating && (
        <Modal title="Create trip" onClose={() => setCreating(false)} wide>
          <ErrorBanner message={formError} onDismiss={() => setFormError('')} />
          <form onSubmit={createTrip} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Source">
              <input className={inputCls} value={form.source} onChange={set('source')} required />
            </Field>
            <Field label="Destination">
              <input className={inputCls} value={form.destination} onChange={set('destination')} required />
            </Field>
            <Field label="Vehicle (available only)">
              <select className={inputCls} value={form.vehicle_id} onChange={set('vehicle_id')} required>
                <option value="">Select vehicle…</option>
                {options.vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} · {v.reg_no} · max {v.max_load} kg</option>
                ))}
              </select>
            </Field>
            <Field label="Driver (available, valid license)">
              <select className={inputCls} value={form.driver_id} onChange={set('driver_id')} required>
                <option value="">Select driver…</option>
                {options.drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} · {d.license_no}</option>
                ))}
              </select>
            </Field>
            <Field label="Cargo weight (kg)">
              <input type="number" min="1" className={inputCls} value={form.cargo_weight} onChange={set('cargo_weight')} required />
            </Field>
            <Field label="Planned distance (km)">
              <input type="number" min="1" className={inputCls} value={form.planned_distance} onChange={set('planned_distance')} required />
            </Field>
            <Field label="Expected revenue (₹)">
              <input type="number" min="0" className={inputCls} value={form.revenue} onChange={set('revenue')} />
            </Field>
            {overweight && (
              <div className="col-span-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                ⚠ Cargo exceeds {selectedVehicle.name}'s max load of {selectedVehicle.max_load} kg
              </div>
            )}
            <div className="col-span-full flex justify-end gap-2 pt-2">
              <button type="button" className={btnSecondary} onClick={() => setCreating(false)}>Cancel</button>
              <button className={btnPrimary} disabled={overweight}>Create trip (Draft)</button>
            </div>
          </form>
        </Modal>
      )}

      {completing && (
        <Modal title={`Complete trip #${completing.id}`} onClose={() => setCompleting(null)}>
          <ErrorBanner message={formError} onDismiss={() => setFormError('')} />
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            {completing.source} → {completing.destination} · start odometer {fmtNum(completing.start_odometer)} km
          </p>
          <form onSubmit={completeTrip} className="space-y-4">
            <Field label="Final odometer (km)">
              <input
                type="number" min={completing.start_odometer} className={inputCls}
                value={completeForm.final_odometer}
                onChange={(e) => setCompleteForm({ ...completeForm, final_odometer: e.target.value })}
                required
              />
            </Field>
            <Field label="Fuel consumed (liters)">
              <input
                type="number" min="0" step="0.1" className={inputCls}
                value={completeForm.fuel_consumed}
                onChange={(e) => setCompleteForm({ ...completeForm, fuel_consumed: e.target.value })}
                required
              />
            </Field>
            <Field label="Fuel cost (₹, optional — creates a fuel log)">
              <input
                type="number" min="0" className={inputCls}
                value={completeForm.fuel_cost}
                onChange={(e) => setCompleteForm({ ...completeForm, fuel_cost: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnSecondary} onClick={() => setCompleting(null)}>Cancel</button>
              <button className={btnPrimary}>Complete trip</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
