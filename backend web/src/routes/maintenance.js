import { Router } from 'express';
import db from '../db.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();
const canManage = requireRole('fleet_manager');

const SELECT = `
  SELECT m.*, v.reg_no AS vehicle_reg_no, v.name AS vehicle_name, v.status AS vehicle_status
  FROM maintenance_logs m JOIN vehicles v ON v.id = m.vehicle_id`;

router.get('/', (req, res) => {
  const { status, vehicle_id } = req.query;
  let sql = `${SELECT} WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND m.status = ?'; params.push(status); }
  if (vehicle_id) { sql += ' AND m.vehicle_id = ?'; params.push(vehicle_id); }
  sql += ' ORDER BY m.opened_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.post('/', canManage, (req, res) => {
  const { vehicle_id, type, description, cost } = req.body || {};
  if (!vehicle_id || !type) return res.status(400).json({ error: 'vehicle_id and type are required' });

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle_id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  if (vehicle.status === 'On Trip') {
    return res.status(422).json({ error: `${vehicle.name} is on an active trip; complete or cancel the trip first` });
  }
  if (vehicle.status === 'Retired') {
    return res.status(422).json({ error: `${vehicle.name} is retired` });
  }

  let id;
  db.transaction(() => {
    const info = db.prepare(
      `INSERT INTO maintenance_logs (vehicle_id, type, description, cost, status) VALUES (?, ?, ?, ?, 'Open')`
    ).run(vehicle_id, type, description || '', Number(cost) || 0);
    id = info.lastInsertRowid;
    // Active maintenance automatically moves the vehicle to In Shop
    db.prepare(`UPDATE vehicles SET status = 'In Shop' WHERE id = ?`).run(vehicle_id);
  })();
  res.status(201).json(db.prepare(`${SELECT} WHERE m.id = ?`).get(id));
});

router.post('/:id/close', canManage, (req, res) => {
  const record = db.prepare('SELECT * FROM maintenance_logs WHERE id = ?').get(req.params.id);
  if (!record) return res.status(404).json({ error: 'Maintenance record not found' });
  if (record.status === 'Closed') return res.status(422).json({ error: 'Record is already closed' });

  const { cost } = req.body || {};
  db.transaction(() => {
    db.prepare(
      `UPDATE maintenance_logs SET status = 'Closed', closed_at = datetime('now'), cost = ? WHERE id = ?`
    ).run(cost != null ? Number(cost) : record.cost, record.id);

    // Restore vehicle to Available unless retired or still has another open record
    const openCount = db.prepare(
      `SELECT COUNT(*) AS n FROM maintenance_logs WHERE vehicle_id = ? AND status = 'Open' AND id != ?`
    ).get(record.vehicle_id, record.id).n;
    if (openCount === 0) {
      db.prepare(`UPDATE vehicles SET status = 'Available' WHERE id = ? AND status = 'In Shop'`).run(record.vehicle_id);
    }
  })();
  res.json(db.prepare(`${SELECT} WHERE m.id = ?`).get(record.id));
});

export default router;
