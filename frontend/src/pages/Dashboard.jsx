import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts';
import { api } from '../api';
import { Card, inputCls, ErrorBanner } from '../components/ui';

const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#94a3b8', '#ef4444', '#8b5cf6'];

function Kpi({ label, value, accent }) {
  return (
    <Card>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${accent || ''}`}>{value}</div>
    </Card>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ type: '', status: '', region: '' });
  const [options, setOptions] = useState({ types: [], regions: [], statuses: [] });
  const [error, setError] = useState('');

  useEffect(() => {
    api('/dashboard/filters').then(setOptions).catch(() => {});
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
    api(`/dashboard${qs ? `?${qs}` : ''}`).then(setData).catch((e) => setError(e.message));
  }, [filters]);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <div className="text-slate-400">Loading dashboard…</div>;

  const { kpis, charts, expiringLicenses } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <select className={inputCls} value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">All types</option>
            {options.types.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select className={inputCls} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            {options.statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className={inputCls} value={filters.region} onChange={(e) => setFilters({ ...filters, region: e.target.value })}>
            <option value="">All regions</option>
            {options.regions.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Kpi label="Active Vehicles" value={kpis.active_vehicles} />
        <Kpi label="Available" value={kpis.available_vehicles} accent="text-emerald-600 dark:text-emerald-400" />
        <Kpi label="In Maintenance" value={kpis.in_maintenance} accent="text-amber-600 dark:text-amber-400" />
        <Kpi label="Fleet Utilization" value={`${kpis.fleet_utilization}%`} accent="text-blue-600 dark:text-blue-400" />
        <Kpi label="Active Trips" value={kpis.active_trips} accent="text-blue-600 dark:text-blue-400" />
        <Kpi label="Pending Trips" value={kpis.pending_trips} />
        <Kpi label="Drivers On Duty" value={kpis.drivers_on_duty} />
        <Kpi label="Completed Trips" value={kpis.completed_trips} accent="text-emerald-600 dark:text-emerald-400" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">Monthly operational cost (fuel + maintenance)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={charts.monthlyCost}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="fuel" name="Fuel" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="maintenance" name="Maintenance" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">Fleet by status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={charts.vehiclesByStatus} dataKey="count" nameKey="status" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {charts.vehiclesByStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {expiringLicenses.length > 0 && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-amber-600 dark:text-amber-400">
            ⚠ Licenses expiring within 60 days
          </h3>
          <div className="flex flex-wrap gap-2">
            {expiringLicenses.map((d) => (
              <div key={d.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
                <span className="font-medium">{d.name}</span>
                <span className="text-slate-500 dark:text-slate-400"> · {d.license_no} · expires {d.license_expiry}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
