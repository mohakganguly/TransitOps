import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Badge, Card, Table, EmptyRow, ErrorBanner, btnSmall, btnDanger } from '../components/ui';

const today = () => new Date(new Date().toISOString().slice(0, 10));
const isExpired = (d) => new Date(d) < today();
const daysLeft = (d) => Math.ceil((new Date(d) - today()) / 86400000);

function licenseState(d) {
  if (isExpired(d.license_expiry)) return { label: 'Expired', cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' };
  if (daysLeft(d.license_expiry) <= 60) return { label: `Expires in ${daysLeft(d.license_expiry)}d`, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' };
  return { label: 'Valid', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' };
}

export default function Compliance() {
  const [drivers, setDrivers] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api('/drivers').then(setDrivers).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const expired = drivers.filter((d) => isExpired(d.license_expiry));
  const expiring = drivers.filter((d) => !isExpired(d.license_expiry) && daysLeft(d.license_expiry) <= 60);
  const suspended = drivers.filter((d) => d.status === 'Suspended');
  const lowScore = drivers.filter((d) => d.safety_score < 60);
  const avgScore = drivers.length
    ? Math.round(drivers.reduce((s, d) => s + d.safety_score, 0) / drivers.length)
    : 0;

  const setStatus = async (d, status) => {
    setError('');
    try {
      await api(`/drivers/${d.id}`, { method: 'PUT', body: { status } });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  // Sort: expired first, then expiring soon, then the rest
  const sorted = [...drivers].sort((a, b) => {
    const rank = (d) => (isExpired(d.license_expiry) ? 0 : daysLeft(d.license_expiry) <= 60 ? 1 : 2);
    return rank(a) - rank(b) || a.safety_score - b.safety_score;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Compliance</h1>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card><div className="text-xs uppercase text-slate-400">Expired licenses</div><div className={`mt-1 text-3xl font-bold ${expired.length ? 'text-red-600 dark:text-red-400' : ''}`}>{expired.length}</div></Card>
        <Card><div className="text-xs uppercase text-slate-400">Expiring ≤ 60 days</div><div className={`mt-1 text-3xl font-bold ${expiring.length ? 'text-amber-600 dark:text-amber-400' : ''}`}>{expiring.length}</div></Card>
        <Card><div className="text-xs uppercase text-slate-400">Suspended</div><div className="mt-1 text-3xl font-bold">{suspended.length}</div></Card>
        <Card><div className="text-xs uppercase text-slate-400">Safety score &lt; 60</div><div className={`mt-1 text-3xl font-bold ${lowScore.length ? 'text-red-600 dark:text-red-400' : ''}`}>{lowScore.length}</div></Card>
        <Card><div className="text-xs uppercase text-slate-400">Avg safety score</div><div className="mt-1 text-3xl font-bold">{avgScore}</div></Card>
      </div>

      <Table headers={['Driver', 'License', 'Expiry', 'License state', 'Safety score', 'Status', 'Actions']}>
        {sorted.length === 0 && <EmptyRow colSpan={7} />}
        {sorted.map((d) => {
          const ls = licenseState(d);
          return (
            <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="px-4 py-3 font-medium">{d.name}</td>
              <td className="px-4 py-3 font-mono text-xs">{d.license_no} · {d.license_category}</td>
              <td className="px-4 py-3">{d.license_expiry}</td>
              <td className="px-4 py-3">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${ls.cls}`}>{ls.label}</span>
              </td>
              <td className={`px-4 py-3 font-semibold ${d.safety_score >= 80 ? 'text-emerald-600 dark:text-emerald-400' : d.safety_score >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                {d.safety_score}
              </td>
              <td className="px-4 py-3"><Badge>{d.status}</Badge></td>
              <td className="px-4 py-3">
                {d.status === 'Suspended' ? (
                  <button className={btnSmall} onClick={() => setStatus(d, 'Available')}>Reinstate</button>
                ) : d.status !== 'On Trip' ? (
                  <button className={btnDanger} onClick={() => setStatus(d, 'Suspended')}>Suspend</button>
                ) : (
                  <span className="text-xs text-slate-400">On trip</span>
                )}
              </td>
            </tr>
          );
        })}
      </Table>

      <p className="text-xs text-slate-400">
        Suspended drivers and drivers with expired licenses are automatically blocked from trip assignment.
      </p>
    </div>
  );
}
