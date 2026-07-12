import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const { type, status, region } = req.query;
  let where = 'WHERE 1=1';
  const params = [];
  if (type) { where += ' AND type = ?'; params.push(type); }
  if (status) { where += ' AND status = ?'; params.push(status); }
  if (region) { where += ' AND region = ?'; params.push(region); }

  const vehicles = db.prepare(`SELECT status, COUNT(*) AS n FROM vehicles ${where} GROUP BY status`).all(...params);
  const byStatus = Object.fromEntries(vehicles.map((r) => [r.status, r.n]));
  const totalVehicles = vehicles.reduce((s, r) => s + r.n, 0);
  const activeFleet = totalVehicles - (byStatus['Retired'] || 0);
  const onTrip = byStatus['On Trip'] || 0;

  const kpis = {
    total_vehicles: totalVehicles,
    active_vehicles: activeFleet,
    available_vehicles: byStatus['Available'] || 0,
    in_maintenance: byStatus['In Shop'] || 0,
    on_trip_vehicles: onTrip,
    retired_vehicles: byStatus['Retired'] || 0,
    active_trips: db.prepare(`SELECT COUNT(*) AS n FROM trips WHERE status = 'Dispatched'`).get().n,
    pending_trips: db.prepare(`SELECT COUNT(*) AS n FROM trips WHERE status = 'Draft'`).get().n,
    completed_trips: db.prepare(`SELECT COUNT(*) AS n FROM trips WHERE status = 'Completed'`).get().n,
    drivers_on_duty: db.prepare(`SELECT COUNT(*) AS n FROM drivers WHERE status IN ('Available','On Trip')`).get().n,
    total_drivers: db.prepare('SELECT COUNT(*) AS n FROM drivers').get().n,
    fleet_utilization: activeFleet > 0 ? Math.round((onTrip / activeFleet) * 1000) / 10 : 0,
  };

  // Chart datasets
  const vehiclesByType = db.prepare(`SELECT type, COUNT(*) AS count FROM vehicles ${where} GROUP BY type`).all(...params);
  const vehiclesByStatus = db.prepare(`SELECT status, COUNT(*) AS count FROM vehicles ${where} GROUP BY status`).all(...params);
  const tripsByStatus = db.prepare('SELECT status, COUNT(*) AS count FROM trips GROUP BY status').all();
  const monthlyCost = db.prepare(`
    SELECT month, SUM(fuel) AS fuel, SUM(maintenance) AS maintenance FROM (
      SELECT strftime('%Y-%m', date) AS month, cost AS fuel, 0 AS maintenance FROM fuel_logs
      UNION ALL
      SELECT strftime('%Y-%m', opened_at) AS month, 0 AS fuel, cost AS maintenance FROM maintenance_logs
    ) GROUP BY month ORDER BY month`).all();

  const expiringLicenses = db.prepare(`
    SELECT id, name, license_no, license_expiry FROM drivers
    WHERE date(license_expiry) <= date('now', '+60 days') AND status != 'Suspended'
    ORDER BY license_expiry`).all();

  res.json({ kpis, charts: { vehiclesByType, vehiclesByStatus, tripsByStatus, monthlyCost }, expiringLicenses });
});

router.get('/filters', (req, res) => {
  res.json({
    types: db.prepare('SELECT DISTINCT type FROM vehicles ORDER BY type').all().map((r) => r.type),
    regions: db.prepare('SELECT DISTINCT region FROM vehicles ORDER BY region').all().map((r) => r.region),
    statuses: ['Available', 'On Trip', 'In Shop', 'Retired'],
  });
});

export default router;
