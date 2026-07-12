import { Router } from 'express';
import db from '../db.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();
const canLog = requireRole('fleet_manager', 'dispatcher', 'financial_analyst');

const SELECT = `
  SELECT e.*, v.reg_no AS vehicle_reg_no, v.name AS vehicle_name
  FROM expenses e LEFT JOIN vehicles v ON v.id = e.vehicle_id`;

router.get('/', (req, res) => {
  const { vehicle_id, category } = req.query;
  let sql = `${SELECT} WHERE 1=1`;
  const params = [];
  if (vehicle_id) { sql += ' AND e.vehicle_id = ?'; params.push(vehicle_id); }
  if (category) { sql += ' AND e.category = ?'; params.push(category); }
  sql += ' ORDER BY e.date DESC, e.id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.post('/', canLog, (req, res) => {
  const { vehicle_id, trip_id, category, amount, date, notes } = req.body || {};
  if (!category || amount == null || !date) {
    return res.status(400).json({ error: 'category, amount and date are required' });
  }
  if (Number(amount) <= 0) return res.status(400).json({ error: 'amount must be positive' });
  if (vehicle_id) {
    const vehicle = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(vehicle_id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  }

  const info = db.prepare(
    'INSERT INTO expenses (vehicle_id, trip_id, category, amount, date, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(vehicle_id || null, trip_id || null, category, Number(amount), date, notes || '');
  res.status(201).json(db.prepare(`${SELECT} WHERE e.id = ?`).get(info.lastInsertRowid));
});

router.delete('/:id', canLog, (req, res) => {
  const row = db.prepare('SELECT id FROM expenses WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Expense not found' });
  db.prepare('DELETE FROM expenses WHERE id = ?').run(row.id);
  res.json({ ok: true });
});

export default router;
