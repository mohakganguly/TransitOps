import { Router } from 'express';
import db from '../db.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();
const STATUSES = ['Available', 'On Trip', 'Off Duty', 'Suspended'];
const canManage = requireRole('fleet_manager', 'safety_officer');

router.get('/', (req, res) => {
  const { status, search } = req.query;
  let sql = 'SELECT * FROM drivers WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (search) {
    sql += ' AND (name LIKE ? OR license_no LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  res.json(driver);
});

router.post('/', canManage, (req, res) => {
  const { name, license_no, license_category, license_expiry, contact, safety_score, status } = req.body || {};
  if (!name || !license_no || !license_category || !license_expiry) {
    return res.status(400).json({ error: 'name, license_no, license_category and license_expiry are required' });
  }
  if (status && !STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const dup = db.prepare('SELECT id FROM drivers WHERE license_no = ?').get(license_no.trim());
  if (dup) return res.status(409).json({ error: `License number ${license_no} already exists` });

  const score = safety_score != null ? Number(safety_score) : 100;
  if (score < 0 || score > 100) return res.status(400).json({ error: 'safety_score must be 0-100' });

  const info = db.prepare(
    `INSERT INTO drivers (name, license_no, license_category, license_expiry, contact, safety_score, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(name, license_no.trim(), license_category, license_expiry, contact || '', score, status || 'Available');
  res.status(201).json(db.prepare('SELECT * FROM drivers WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', canManage, (req, res) => {
  const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  const { name, license_no, license_category, license_expiry, contact, safety_score, status } = req.body || {};
  if (status && !STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (status === 'On Trip' && driver.status !== 'On Trip') {
    return res.status(400).json({ error: 'On Trip status is set automatically by dispatching a trip' });
  }
  if (safety_score != null && (Number(safety_score) < 0 || Number(safety_score) > 100)) {
    return res.status(400).json({ error: 'safety_score must be 0-100' });
  }
  if (license_no && license_no.trim() !== driver.license_no) {
    const dup = db.prepare('SELECT id FROM drivers WHERE license_no = ? AND id != ?').get(license_no.trim(), driver.id);
    if (dup) return res.status(409).json({ error: `License number ${license_no} already exists` });
  }

  db.prepare(
    `UPDATE drivers SET name = ?, license_no = ?, license_category = ?, license_expiry = ?, contact = ?, safety_score = ?, status = ?
     WHERE id = ?`
  ).run(
    name ?? driver.name,
    (license_no ?? driver.license_no).trim(),
    license_category ?? driver.license_category,
    license_expiry ?? driver.license_expiry,
    contact ?? driver.contact,
    safety_score != null ? Number(safety_score) : driver.safety_score,
    status ?? driver.status,
    driver.id
  );
  res.json(db.prepare('SELECT * FROM drivers WHERE id = ?').get(driver.id));
});

router.delete('/:id', canManage, (req, res) => {
  const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  const tripCount = db.prepare('SELECT COUNT(*) AS n FROM trips WHERE driver_id = ?').get(driver.id).n;
  if (tripCount > 0) {
    return res.status(409).json({ error: 'Driver has trip history; mark them Suspended or Off Duty instead' });
  }
  db.prepare('DELETE FROM drivers WHERE id = ?').run(driver.id);
  res.json({ ok: true });
});

export default router;
