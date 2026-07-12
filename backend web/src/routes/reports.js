import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Per-vehicle report: distance, fuel, efficiency, costs, revenue, ROI
function vehicleReport() {
  return db.prepare(`
    SELECT
      v.id, v.reg_no, v.name, v.type, v.status, v.acquisition_cost,
      COALESCE(t.trips_completed, 0) AS trips_completed,
      COALESCE(t.distance, 0) AS total_distance,
      COALESCE(t.revenue, 0) AS total_revenue,
      COALESCE(f.liters, 0) AS total_fuel_liters,
      COALESCE(f.cost, 0) AS total_fuel_cost,
      COALESCE(m.cost, 0) AS total_maintenance_cost,
      COALESCE(e.amount, 0) AS total_other_expenses
    FROM vehicles v
    LEFT JOIN (
      SELECT vehicle_id, COUNT(*) AS trips_completed,
             SUM(COALESCE(final_odometer - start_odometer, planned_distance)) AS distance,
             SUM(revenue) AS revenue
      FROM trips WHERE status = 'Completed' GROUP BY vehicle_id
    ) t ON t.vehicle_id = v.id
    LEFT JOIN (SELECT vehicle_id, SUM(liters) AS liters, SUM(cost) AS cost FROM fuel_logs GROUP BY vehicle_id) f
      ON f.vehicle_id = v.id
    LEFT JOIN (SELECT vehicle_id, SUM(cost) AS cost FROM maintenance_logs GROUP BY vehicle_id) m
      ON m.vehicle_id = v.id
    LEFT JOIN (SELECT vehicle_id, SUM(amount) AS amount FROM expenses WHERE vehicle_id IS NOT NULL GROUP BY vehicle_id) e
      ON e.vehicle_id = v.id
    ORDER BY v.name
  `).all().map((r) => {
    const operational_cost = r.total_fuel_cost + r.total_maintenance_cost;
    return {
      ...r,
      fuel_efficiency: r.total_fuel_liters > 0 ? Math.round((r.total_distance / r.total_fuel_liters) * 100) / 100 : null,
      operational_cost,
      roi: r.acquisition_cost > 0
        ? Math.round(((r.total_revenue - operational_cost) / r.acquisition_cost) * 10000) / 100
        : null,
    };
  });
}

router.get('/vehicles', (req, res) => {
  res.json(vehicleReport());
});

router.get('/summary', (req, res) => {
  const rows = vehicleReport();
  const active = rows.filter((r) => r.status !== 'Retired');
  const totals = rows.reduce(
    (acc, r) => ({
      distance: acc.distance + r.total_distance,
      fuel_liters: acc.fuel_liters + r.total_fuel_liters,
      fuel_cost: acc.fuel_cost + r.total_fuel_cost,
      maintenance_cost: acc.maintenance_cost + r.total_maintenance_cost,
      other_expenses: acc.other_expenses + r.total_other_expenses,
      revenue: acc.revenue + r.total_revenue,
    }),
    { distance: 0, fuel_liters: 0, fuel_cost: 0, maintenance_cost: 0, other_expenses: 0, revenue: 0 }
  );
  const onTrip = active.filter((r) => r.status === 'On Trip').length;
  res.json({
    ...totals,
    operational_cost: totals.fuel_cost + totals.maintenance_cost,
    fleet_fuel_efficiency: totals.fuel_liters > 0 ? Math.round((totals.distance / totals.fuel_liters) * 100) / 100 : null,
    fleet_utilization: active.length > 0 ? Math.round((onTrip / active.length) * 1000) / 10 : 0,
  });
});

function toCsv(rows, columns) {
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => c.label).join(',');
  const body = rows.map((r) => columns.map((c) => esc(r[c.key])).join(',')).join('\n');
  return `${header}\n${body}`;
}

router.get('/export/vehicles.csv', (req, res) => {
  const csv = toCsv(vehicleReport(), [
    { key: 'reg_no', label: 'Registration' },
    { key: 'name', label: 'Vehicle' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'trips_completed', label: 'Trips Completed' },
    { key: 'total_distance', label: 'Distance (km)' },
    { key: 'total_fuel_liters', label: 'Fuel (L)' },
    { key: 'fuel_efficiency', label: 'Efficiency (km/L)' },
    { key: 'total_fuel_cost', label: 'Fuel Cost' },
    { key: 'total_maintenance_cost', label: 'Maintenance Cost' },
    { key: 'operational_cost', label: 'Operational Cost' },
    { key: 'total_revenue', label: 'Revenue' },
    { key: 'acquisition_cost', label: 'Acquisition Cost' },
    { key: 'roi', label: 'ROI (%)' },
  ]);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="vehicle-report.csv"');
  res.send(csv);
});

router.get('/export/trips.csv', (req, res) => {
  const rows = db.prepare(`
    SELECT t.id, t.source, t.destination, v.reg_no AS vehicle, d.name AS driver,
           t.cargo_weight, t.planned_distance, t.status, t.revenue,
           t.start_odometer, t.final_odometer, t.fuel_consumed, t.created_at
    FROM trips t JOIN vehicles v ON v.id = t.vehicle_id JOIN drivers d ON d.id = t.driver_id
    ORDER BY t.created_at DESC`).all();
  const csv = toCsv(rows, [
    { key: 'id', label: 'Trip ID' },
    { key: 'source', label: 'Source' },
    { key: 'destination', label: 'Destination' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'driver', label: 'Driver' },
    { key: 'cargo_weight', label: 'Cargo (kg)' },
    { key: 'planned_distance', label: 'Planned Distance (km)' },
    { key: 'status', label: 'Status' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'start_odometer', label: 'Start Odometer' },
    { key: 'final_odometer', label: 'Final Odometer' },
    { key: 'fuel_consumed', label: 'Fuel Consumed (L)' },
    { key: 'created_at', label: 'Created At' },
  ]);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="trip-report.csv"');
  res.send(csv);
});

export default router;
