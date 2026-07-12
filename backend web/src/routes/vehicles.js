import { Router } from 'express';
import db from '../db.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();
const STATUSES = ['Available', 'On Trip', 'In Shop', 'Retired'];

router.get('/', (req, res) => {
  const { status, type, region, search } = req.query;
  let sql = 'SELECT * FROM vehicles WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (type) { sql += ' AND type = ?'; params.push(type); }
  if (region) { sql += ' AND region = ?'; params.push(region); }
  if (search) {
    sql += ' AND (reg_no LIKE ? OR name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(vehicle);
});

router.post('/', requireRole('fleet_manager'), (req, res) => {
  const { reg_no, name, type, region, max_load, odometer, acquisition_cost, status } = req.body || {};
  if (!reg_no || !name || !type || max_load == null) {
    return res.status(400).json({ error: 'reg_no, name, type and max_load are required' });
  }
  if (Number(max_load) <= 0) return res.status(400).json({ error: 'max_load must be positive' });
  if (status && !STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const dup = db.prepare('SELECT id FROM vehicles WHERE reg_no = ?').get(reg_no.trim());
  if (dup) return res.status(409).json({ error: `Registration number ${reg_no} already exists` });

  const info = db.prepare(
    `INSERT INTO vehicles (reg_no, name, type, region, max_load, odometer, acquisition_cost, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    reg_no.trim(), name, type, region || 'Central',
    Number(max_load), Number(odometer) || 0, Number(acquisition_cost) || 0,
    status || 'Available'
  );
  res.status(201).json(db.prepare('SELECT * FROM vehicles WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', requireRole('fleet_manager'), (req, res) => {
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const { reg_no, name, type, region, max_load, odometer, acquisition_cost, status } = req.body || {};
  if (status && !STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (status === 'On Trip' && vehicle.status !== 'On Trip') {
    return res.status(400).json({ error: 'On Trip status is set automatically by dispatching a trip' });
  }
  if (max_load != null && Number(max_load) <= 0) return res.status(400).json({ error: 'max_load must be positive' });

  if (reg_no && reg_no.trim() !== vehicle.reg_no) {
    const dup = db.prepare('SELECT id FROM vehicles WHERE reg_no = ? AND id != ?').get(reg_no.trim(), vehicle.id);
    if (dup) return res.status(409).json({ error: `Registration number ${reg_no} already exists` });
  }

  db.prepare(
    `UPDATE vehicles SET reg_no = ?, name = ?, type = ?, region = ?, max_load = ?, odometer = ?, acquisition_cost = ?, status = ?
     WHERE id = ?`
  ).run(
    (reg_no ?? vehicle.reg_no).trim(), name ?? vehicle.name, type ?? vehicle.type, region ?? vehicle.region,
    max_load != null ? Number(max_load) : vehicle.max_load,
    odometer != null ? Number(odometer) : vehicle.odometer,
    acquisition_cost != null ? Number(acquisition_cost) : vehicle.acquisition_cost,
    status ?? vehicle.status,
    vehicle.id
  );
  res.json(db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle.id));
});

router.delete('/:id', requireRole('fleet_manager'), (req, res) => {
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  const tripCount = db.prepare('SELECT COUNT(*) AS n FROM trips WHERE vehicle_id = ?').get(vehicle.id).n;
  if (tripCount > 0) {
    return res.status(409).json({ error: 'Vehicle has trip history; mark it Retired instead of deleting' });
  }
  db.prepare('DELETE FROM fuel_logs WHERE vehicle_id = ?').run(vehicle.id);
  db.prepare('DELETE FROM maintenance_logs WHERE vehicle_id = ?').run(vehicle.id);
  db.prepare('DELETE FROM expenses WHERE vehicle_id = ?').run(vehicle.id);
  db.prepare('DELETE FROM vehicles WHERE id = ?').run(vehicle.id);
  res.json({ ok: true });
});

export default router;
