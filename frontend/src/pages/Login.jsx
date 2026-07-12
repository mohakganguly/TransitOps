import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '../AuthContext';
import { Field, inputCls, btnPrimary, ErrorBanner } from '../components/ui';

const DEMO_ACCOUNTS = [
  { email: 'manager@transitops.com', role: 'Fleet Manager', scope: 'Fleet · Maintenance' },
  { email: 'dispatch@transitops.com', role: 'Dispatcher', scope: 'Dashboard · Trips' },
  { email: 'safety@transitops.com', role: 'Safety Officer', scope: 'Drivers · Compliance' },
  { email: 'finance@transitops.com', role: 'Financial Analyst', scope: 'Fuel & Expenses · Analytics' },
];

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'fleet_manager' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">TransitOps</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Smart Transport Operations Platform</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="mb-5 flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium capitalize transition ${
                  mode === m ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500'
                }`}
              >
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <ErrorBanner message={error} onDismiss={() => setError('')} />

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <Field label="Full name">
                <input className={inputCls} value={form.name} onChange={set('name')} required />
              </Field>
            )}
            <Field label="Email">
              <input type="email" className={inputCls} value={form.email} onChange={set('email')} required />
            </Field>
            <Field label="Password">
              <input type="password" className={inputCls} value={form.password} onChange={set('password')} required minLength={6} />
            </Field>
            {mode === 'register' && (
              <Field label="Role">
                <select className={inputCls} value={form.role} onChange={set('role')}>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
            )}
            <button className={`${btnPrimary} w-full`} disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>

        <div className="mt-4 rounded-xl bg-white p-4 text-xs text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800">
          <div className="mb-2 font-semibold text-slate-600 dark:text-slate-300">Demo accounts (password: demo1234)</div>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-left hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                onClick={() => setForm({ ...form, email: a.email, password: 'demo1234' })}
              >
                <div className="font-medium text-slate-700 dark:text-slate-200">{a.role}</div>
                <div className="truncate">{a.email}</div>
                <div className="truncate text-[10px] text-slate-400">{a.scope}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
