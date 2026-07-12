import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, ROLE_PAGES, roleHome } from './AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import FleetTrackingMap from './components/FleetTrackingMap';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Compliance from './pages/Compliance';
import Trips from './pages/Trips';
import Maintenance from './pages/Maintenance';
import FuelExpenses from './pages/FuelExpenses';
import Reports from './pages/Reports';

// Renders the page only if the user's role is scoped to this path
function Guarded({ path, children }) {
  const { user } = useAuth();
  const allowed = (ROLE_PAGES[user.role] || []).includes(path);
  return allowed ? children : <Navigate to={roleHome(user.role)} replace />;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading TransitOps…</div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Guarded path="/"><Dashboard /></Guarded>} />
        <Route path="/vehicles" element={<Guarded path="/vehicles"><Vehicles /></Guarded>} />
        <Route path="/tracking" element={<Guarded path="/tracking"><FleetTrackingMap /></Guarded>} />
        <Route path="/drivers" element={<Guarded path="/drivers"><Drivers /></Guarded>} />
        <Route path="/compliance" element={<Guarded path="/compliance"><Compliance /></Guarded>} />
        <Route path="/trips" element={<Guarded path="/trips"><Trips /></Guarded>} />
        <Route path="/maintenance" element={<Guarded path="/maintenance"><Maintenance /></Guarded>} />
        <Route path="/fuel-expenses" element={<Guarded path="/fuel-expenses"><FuelExpenses /></Guarded>} />
        <Route path="/reports" element={<Guarded path="/reports"><Reports /></Guarded>} />
        <Route path="/login" element={<Navigate to={roleHome(user.role)} replace />} />
        <Route path="*" element={<Navigate to={roleHome(user.role)} replace />} />
      </Route>
    </Routes>
  );
}
