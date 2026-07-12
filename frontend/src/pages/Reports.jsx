import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api, downloadCsv } from '../api';
import { Card, Table, EmptyRow, ErrorBanner, btnPrimary, btnSecondary, fmtMoney, fmtNum } from '../components/ui';

export default function Reports() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/reports/vehicles'), api('/reports/summary')])
      .then(([r, s]) => { setRows(r); setSummary(s); })
      .catch((e) => setError(e.message));
  }, []);

  const roiColor = (roi) =>
    roi == null ? '' : roi >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';

  const chartData = rows
    .filter((r) => r.operational_cost > 0)
    .map((r) => ({ name: r.name, Fuel: r.total_fuel_cost, Maintenance: r.total_maintenance_cost }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <div className="flex gap-2">
          <button className={btnSecondary} onClick={() => downloadCsv('/reports/export/trips.csv', 'trip-report.csv')}>
            ⬇ Trips CSV
          </button>
          <button className={btnPrimary} onClick={() => downloadCsv('/reports/export/vehicles.csv', 'vehicle-report.csv')}>
            ⬇ Vehicle report CSV
          </button>
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card><div className="text-xs uppercase text-slate-400">Fleet fuel efficiency</div><div className="mt-1 text-2xl font-bold">{summary.fleet_fuel_efficiency ?? '—'} km/L</div></Card>
          <Card><div className="text-xs uppercase text-slate-400">Fleet utilization</div><div className="mt-1 text-2xl font-bold">{summary.fleet_utilization}%</div></Card>
          <Card><div className="text-xs uppercase text-slate-400">Operational cost</div><div className="mt-1 text-2xl font-bold">{fmtMoney(summary.operational_cost)}</div></Card>
          <Card><div className="text-xs uppercase text-slate-400">Total revenue</div><div className="mt-1 text-2xl font-bold">{fmtMoney(summary.revenue)}</div></Card>
        </div>
      )}

      {chartData.length > 0 && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">Operational cost per vehicle</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="Fuel" stackId="a" fill="#2563eb" />
              <Bar dataKey="Maintenance" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Table headers={['Vehicle', 'Trips', 'Distance (km)', 'Fuel (L)', 'Efficiency (km/L)', 'Fuel cost', 'Maintenance', 'Op. cost', 'Revenue', 'ROI']}>
        {rows.length === 0 && <EmptyRow colSpan={10} />}
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <td className="px-4 py-3">
              <div className="font-medium">{r.name}</div>
              <div className="font-mono text-xs text-slate-400">{r.reg_no}</div>
            </td>
            <td className="px-4 py-3">{r.trips_completed}</td>
            <td className="px-4 py-3">{fmtNum(r.total_distance)}</td>
            <td className="px-4 py-3">{fmtNum(r.total_fuel_liters)}</td>
            <td className="px-4 py-3">{r.fuel_efficiency ?? '—'}</td>
            <td className="px-4 py-3">{fmtMoney(r.total_fuel_cost)}</td>
            <td className="px-4 py-3">{fmtMoney(r.total_maintenance_cost)}</td>
            <td className="px-4 py-3 font-medium">{fmtMoney(r.operational_cost)}</td>
            <td className="px-4 py-3">{fmtMoney(r.total_revenue)}</td>
            <td className={`px-4 py-3 font-semibold ${roiColor(r.roi)}`}>{r.roi != null ? `${r.roi}%` : '—'}</td>
          </tr>
        ))}
      </Table>

      <p className="text-xs text-slate-400">
        ROI = (Revenue − (Maintenance + Fuel)) ÷ Acquisition Cost · Efficiency = Distance ÷ Fuel
      </p>
    </div>
  );
}
