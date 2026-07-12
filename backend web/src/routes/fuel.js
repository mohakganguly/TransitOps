import { Router } from 'express';
import db from '../db.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();
const canLog = requireRole('fleet_manager', 'dispatcher', 'financial_analyst');

const SELECT = `
  SELECT f.*, v.reg_no AS vehicle_reg_no, v.name AS vehicle_name
  FROM fuel_logs f JOIN vehicles v ON v.id = f.vehicle_id`;

router.get('/', (req, res) => {
  const { vehicle_id } = req.query;
  let sql = `${SELECT} WHERE 1=1`;
  const params = [];
  if (vehicle_id) { sql += ' AND f.vehicle_id = ?'; params.push(vehicle_id); }
  sql += ' ORDER BY f.date DESC, f.id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.post('/', canLog, (req, res) => {
  const { vehicle_id, trip_id, liters, cost, date } = req.body || {};
  if (!vehicle_id || liters == null || cost == null || !date) {
    return res.status(400).json({ error: 'vehicle_id, liters, cost and date are required' });
  }
  if (Number(liters) <= 0) return res.status(400).json({ error: 'liters must be positive' });
  if (Number(cost) < 0) return res.status(400).json({ error: 'cost cannot be negative' });
  const vehicle = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(vehicle_id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const info = db.prepare(
    'INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost, date) VALUES (?, ?, ?, ?, ?)'
  ).run(vehicle_id, trip_id || null, Number(liters), Number(cost), date);
  res.status(201).json(db.prepare(`${SELECT} WHERE f.id = ?`).get(info.lastInsertRowid));
});

router.delete('/:id', canLog, (req, res) => {
  const row = db.prepare('SELECT id FROM fuel_logs WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Fuel log not found' });
  db.prepare('DELETE FROM fuel_logs WHERE id = ?').run(row.id);
  res.json({ ok: true });
});

export default router;
