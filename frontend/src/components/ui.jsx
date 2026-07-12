import { useEffect } from 'react';

const STATUS_COLORS = {
  Available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  'On Trip': 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  'In Shop': 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  Retired: 'bg-slate-200 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',
  'Off Duty': 'bg-slate-200 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',
  Suspended: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  Draft: 'bg-slate-200 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',
  Dispatched: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  Completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  Cancelled: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  Open: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  Closed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
};

export function Badge({ children }) {
  const color = STATUS_COLORS[children] || 'bg-slate-200 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${color}`}>
      {children}
    </span>
  );
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-16" onClick={onClose}>
      <div
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:ring-1 dark:ring-slate-700`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800';

export const btnPrimary =
  'rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50';
export const btnSecondary =
  'rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800';
export const btnDanger =
  'rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700';
export const btnSmall =
  'rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700';
export const btnSmallGhost =
  'rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800';

export function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
      <span>{message}</span>
      {onDismiss && <button onClick={onDismiss} className="ml-3 font-bold">✕</button>}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 ${className}`}>
      {children}
    </div>
  );
}

export function Table({ headers, children }) {
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyRow({ colSpan, text = 'No records found' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-slate-400">{text}</td>
    </tr>
  );
}

export const fmtMoney = (n) =>
  n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
export const fmtNum = (n) => (n == null ? '—' : Number(n).toLocaleString('en-IN'));
