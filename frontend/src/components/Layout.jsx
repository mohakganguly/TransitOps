import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS, ROLE_PAGES } from '../AuthContext';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/vehicles', label: 'Fleet', icon: '🚚' },
  { to: '/drivers', label: 'Drivers', icon: '🪪' },
  { to: '/compliance', label: 'Compliance', icon: '🛡️' },
  { to: '/trips', label: 'Trips', icon: '🗺️' },
  { to: '/maintenance', label: 'Maintenance', icon: '🔧' },
  { to: '/fuel-expenses', label: 'Fuel & Expenses', icon: '⛽' },
  { to: '/reports', label: 'Analytics', icon: '📈' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  const allowed = ROLE_PAGES[user?.role] || [];
  const nav = NAV.filter((n) => allowed.includes(n.to));

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const navLinks = nav.map(({ to, label, icon }) => (
    <NavLink
      key={to}
      to={to}
      end={to === '/'}
      onClick={() => setMenuOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
        }`
      }
    >
      <span>{icon}</span> {label}
    </NavLink>
  ));

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 px-2">
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">TransitOps</div>
          <div className="text-xs text-slate-400">Smart Transport Operations</div>
        </div>
        <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {ROLE_LABELS[user?.role]} workspace
        </div>
        <nav className="flex flex-col gap-1">{navLinks}</nav>
        <div className="mt-auto space-y-3 pt-6">
          <button onClick={toggleDark} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">
            {dark ? '☀️ Light mode' : '🌙 Dark mode'}
          </button>
          <div className="rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-800">
            <div className="font-medium">{user?.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{ROLE_LABELS[user?.role]}</div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="mt-2 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">TransitOps</div>
          <div className="flex items-center gap-2">
            <button onClick={toggleDark} className="rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-slate-700">
              {dark ? '☀️' : '🌙'}
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-lg border border-slate-300 px-3 py-1 dark:border-slate-700">☰</button>
          </div>
        </header>
        {menuOpen && (
          <nav className="flex flex-col gap-1 border-b border-slate-200 bg-white p-3 md:hidden dark:border-slate-800 dark:bg-slate-900">
            {navLinks}
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="mt-1 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 dark:text-red-400"
            >
              Sign out ({user?.name})
            </button>
          </nav>
        )}
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
