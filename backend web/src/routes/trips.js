import { Router } from 'express';
import db from '../db.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();
const canOperate = requireRole('fleet_manager', 'dispatcher');

const TRIP_SELECT = `
  SELECT t.*,
         v.reg_no AS vehicle_reg_no, v.name AS vehicle_name, v.max_load AS vehicle_max_load,
         d.name AS driver_name, d.license_no AS driver_license_no
  FROM trips t
  JOIN vehicles v ON v.id = t.vehicle_id
  JOIN drivers d ON d.id = t.driver_id`;

function getTrip(id) {
  return db.prepare(`${TRIP_SELECT} WHERE t.id = ?`).get(id);
}

// Validates vehicle + driver eligibility for assignment. Returns error string or null.
function validateAssignment(vehicle, driver, cargoWeight, { excludeTripId } = {}) {
  if (!vehicle) return 'Vehicle not found';
  if (!driver) return 'Driver not found';
  if (vehicle.status === 'Retired') return `${vehicle.name} is retired and cannot be dispatched`;
  if (vehicle.status === 'In Shop') return `${vehicle.name} is in the shop and cannot be dispatched`;
  if (vehicle.status === 'On Trip') return `${vehicle.name} is already on a trip`;
  if (driver.status === 'Suspended') return `${driver.name} is suspended and cannot be assigned`;
  if (driver.status === 'On Trip') return `${driver.name} is already on a trip`;
  if (driver.status === 'Off Duty') return `${driver.name} is off duty`;
  if (new Date(driver.license_expiry) < new Date(new Date().toISOString().slice(0, 10))) {
    return `${driver.name}'s license expired on ${driver.license_expiry}`;
  }
  if (Number(cargoWeight) > vehicle.max_load) {
    return `Cargo weight ${cargoWeight} kg exceeds ${vehicle.name}'s max load of ${vehicle.max_load} kg`;
  }
  return null;
}

router.get('/', (req, res) => {
  const { status, vehicle_id, driver_id } = req.query;
  let sql = `${TRIP_SELECT} WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  if (vehicle_id) { sql += ' AND t.vehicle_id = ?'; params.push(vehicle_id); }
  if (driver_id) { sql += ' AND t.driver_id = ?'; params.push(driver_id); }
  sql += ' ORDER BY t.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// Eligible vehicles/drivers for the trip form
router.get('/options', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const vehicles = db.prepare(`SELECT * FROM vehicles WHERE status = 'Available' ORDER BY name`).all();
  const drivers = db.prepare(
    `SELECT * FROM drivers WHERE status = 'Available' AND date(license_expiry) >= date(?) ORDER BY name`
  ).all(today);
  res.json({ vehicles, drivers });
});

router.get('/:id', (req, res) => {
  const trip = getTrip(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  res.json(trip);
});

router.post('/', canOperate, (req, res) => {
  const { source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, revenue } = req.body || {};
  if (!source || !destination || !vehicle_id || !driver_id || cargo_weight == null || planned_distance == null) {
    return res.status(400).json({ error: 'source, destination, vehicle_id, driver_id, cargo_weight and planned_distance are required' });
  }
  if (Number(cargo_weight) <= 0) return res.status(400).json({ error: 'cargo_weight must be positive' });
  if (Number(planned_distance) <= 0) return res.status(400).json({ error: 'planned_distance must be positive' });

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle_id);
  const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(driver_id);
  const error = validateAssignment(vehicle, driver, cargo_weight);
  if (error) return res.status(422).json({ error });

  const info = db.prepare(
    `INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, revenue, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Draft', ?)`
  ).run(source, destination, vehicle_id, driver_id, Number(cargo_weight), Number(planned_distance), Number(revenue) || 0, req.user.id);
  res.status(201).json(getTrip(info.lastInsertRowid));
});

router.post('/:id/dispatch', canOperate, (req, res) => {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status !== 'Draft') return res.status(422).json({ error: `Only Draft trips can be dispatched (current: ${trip.status})` });

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(trip.vehicle_id);
  const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(trip.driver_id);
  const error = validateAssignment(vehicle, driver, trip.cargo_weight);
  if (error) return res.status(422).json({ error });

  db.transaction(() => {
    db.prepare(
      `UPDATE trips SET status = 'Dispatched', dispatched_at = datetime('now'), start_odometer = ? WHERE id = ?`
    ).run(vehicle.odometer, trip.id);
    db.prepare(`UPDATE vehicles SET status = 'On Trip' WHERE id = ?`).run(vehicle.id);
    db.prepare(`UPDATE drivers SET status = 'On Trip' WHERE id = ?`).run(driver.id);
  })();
  res.json(getTrip(trip.id));
});

router.post('/:id/complete', canOperate, (req, res) => {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status !== 'Dispatched') return res.status(422).json({ error: `Only Dispatched trips can be completed (current: ${trip.status})` });

  const { final_odometer, fuel_consumed, fuel_cost } = req.body || {};
  if (final_odometer == null || fuel_consumed == null) {
    return res.status(400).json({ error: 'final_odometer and fuel_consumed are required' });
  }
  if (Number(final_odometer) < trip.start_odometer) {
    return res.status(422).json({ error: `Final odometer must be >= start odometer (${trip.start_odometer})` });
  }
  if (Number(fuel_consumed) < 0) return res.status(400).json({ error: 'fuel_consumed cannot be negative' });

  db.transaction(() => {
    db.prepare(
      `UPDATE trips SET status = 'Completed', completed_at = datetime('now'), final_odometer = ?, fuel_consumed = ? WHERE id = ?`
    ).run(Number(final_odometer), Number(fuel_consumed), trip.id);
    db.prepare(`UPDATE vehicles SET status = 'Available', odometer = ? WHERE id = ?`).run(Number(final_odometer), trip.vehicle_id);
    db.prepare(`UPDATE drivers SET status = 'Available' WHERE id = ?`).run(trip.driver_id);
    if (Number(fuel_consumed) > 0) {
      db.prepare(
        `INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost, date) VALUES (?, ?, ?, ?, date('now'))`
      ).run(trip.vehicle_id, trip.id, Number(fuel_consumed), Number(fuel_cost) || 0);
    }
  })();
  res.json(getTrip(trip.id));
});

router.post('/:id/cancel', canOperate, (req, res) => {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (!['Draft', 'Dispatched'].includes(trip.status)) {
    return res.status(422).json({ error: `Only Draft or Dispatched trips can be cancelled (current: ${trip.status})` });
  }

  db.transaction(() => {
    db.prepare(`UPDATE trips SET status = 'Cancelled' WHERE id = ?`).run(trip.id);
    if (trip.status === 'Dispatched') {
      // Restore only if still On Trip (a maintenance record may have moved the vehicle to In Shop)
      db.prepare(`UPDATE vehicles SET status = 'Available' WHERE id = ? AND status = 'On Trip'`).run(trip.vehicle_id);
      db.prepare(`UPDATE drivers SET status = 'Available' WHERE id = ? AND status = 'On Trip'`).run(trip.driver_id);
    }
  })();
  res.json(getTrip(trip.id));
});

export default router;
