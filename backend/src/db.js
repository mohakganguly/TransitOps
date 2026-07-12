import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '..', 'transitops.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('fleet_manager','dispatcher','safety_officer','financial_analyst')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reg_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'Central',
  max_load REAL NOT NULL,
  odometer REAL NOT NULL DEFAULT 0,
  acquisition_cost REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available','On Trip','In Shop','Retired')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS drivers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  license_no TEXT NOT NULL UNIQUE,
  license_category TEXT NOT NULL,
  license_expiry TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',
  safety_score INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available','On Trip','Off Duty','Suspended')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  destination TEXT NOT NULL,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  driver_id INTEGER NOT NULL REFERENCES drivers(id),
  cargo_weight REAL NOT NULL,
  planned_distance REAL NOT NULL,
  revenue REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Dispatched','Completed','Cancelled')),
  start_odometer REAL,
  final_odometer REAL,
  fuel_consumed REAL,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  dispatched_at TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cost REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','Closed')),
  opened_at TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS fuel_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  trip_id INTEGER REFERENCES trips(id),
  liters REAL NOT NULL,
  cost REAL NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER REFERENCES vehicles(id),
  trip_id INTEGER REFERENCES trips(id),
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

export function seedIfEmpty() {
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (userCount > 0) return;

  const hash = bcrypt.hashSync('demo1234', 10);
  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  );
  insertUser.run('Fiona Fleet', 'manager@transitops.com', hash, 'fleet_manager');
  insertUser.run('Dev Dispatch', 'dispatch@transitops.com', hash, 'dispatcher');
  insertUser.run('Sam Safety', 'safety@transitops.com', hash, 'safety_officer');
  insertUser.run('Fin Analyst', 'finance@transitops.com', hash, 'financial_analyst');

  const insertVehicle = db.prepare(
    `INSERT INTO vehicles (reg_no, name, type, region, max_load, odometer, acquisition_cost, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const vehicles = [
    ['MH12AB1001', 'Van-01', 'Van', 'West', 800, 45210, 1200000, 'Available'],
    ['MH12AB1002', 'Van-02', 'Van', 'West', 800, 61780, 1150000, 'Available'],
    ['DL08CD2001', 'Truck-01', 'Truck', 'North', 5000, 128400, 3800000, 'Available'],
    ['DL08CD2002', 'Truck-02', 'Truck', 'North', 5000, 98750, 3650000, 'In Shop'],
    ['KA05EF3001', 'Mini-01', 'Mini Truck', 'South', 1500, 30120, 900000, 'Available'],
    ['KA05EF3002', 'Mini-02', 'Mini Truck', 'South', 1500, 84210, 850000, 'Available'],
    ['TN10GH4001', 'Trailer-01', 'Trailer', 'South', 12000, 210500, 6200000, 'Available'],
    ['MH14IJ5001', 'Van-03', 'Van', 'West', 750, 152300, 700000, 'Retired'],
  ];
  for (const v of vehicles) insertVehicle.run(...v);

  const insertDriver = db.prepare(
    `INSERT INTO drivers (name, license_no, license_category, license_expiry, contact, safety_score, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const drivers = [
    ['Alex Kumar', 'LIC-9001', 'LMV', '2027-05-14', '+91 98200 11001', 92, 'Available'],
    ['Bhavna Shah', 'LIC-9002', 'HMV', '2026-11-02', '+91 98200 11002', 88, 'Available'],
    ['Chirag Patel', 'LIC-9003', 'HMV', '2028-01-20', '+91 98200 11003', 95, 'Available'],
    ['Divya Nair', 'LIC-9004', 'LMV', '2026-03-01', '+91 98200 11004', 74, 'Off Duty'],
    ['Imran Sheikh', 'LIC-9005', 'HMV', '2025-12-30', '+91 98200 11005', 61, 'Available'],
    ['Kiran Rao', 'LIC-9006', 'LMV', '2027-08-19', '+91 98200 11006', 45, 'Suspended'],
  ];
  for (const d of drivers) insertDriver.run(...d);

  const insertTrip = db.prepare(
    `INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance,
      revenue, status, start_odometer, final_odometer, fuel_consumed, created_by, created_at, dispatched_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  // Completed trips (history for reports)
  insertTrip.run('Mumbai', 'Pune', 1, 1, 620, 150, 18000, 'Completed', 44900, 45060, 21, 2, '2026-06-20 08:00:00', '2026-06-20 09:00:00', '2026-06-20 15:30:00');
  insertTrip.run('Pune', 'Nashik', 1, 1, 500, 210, 22000, 'Completed', 45060, 45210, 26, 2, '2026-06-28 07:30:00', '2026-06-28 08:10:00', '2026-06-28 16:00:00');
  insertTrip.run('Delhi', 'Jaipur', 3, 2, 4200, 280, 65000, 'Completed', 128000, 128400, 92, 2, '2026-07-01 06:00:00', '2026-07-01 06:45:00', '2026-07-01 18:20:00');
  insertTrip.run('Bengaluru', 'Chennai', 5, 3, 1100, 350, 40000, 'Completed', 29700, 30120, 55, 2, '2026-07-05 05:30:00', '2026-07-05 06:00:00', '2026-07-05 19:00:00');
  // A cancelled one
  insertTrip.run('Mumbai', 'Surat', 2, 1, 640, 290, 0, 'Cancelled', null, null, null, 2, '2026-07-06 10:00:00', '2026-07-06 11:00:00', null);
  // Draft trip pending dispatch
  insertTrip.run('Chennai', 'Coimbatore', 6, 3, 900, 510, 52000, 'Draft', null, null, null, 2, '2026-07-10 09:00:00', null, null);

  const insertMaint = db.prepare(
    `INSERT INTO maintenance_logs (vehicle_id, type, description, cost, status, opened_at, closed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  insertMaint.run(1, 'Oil Change', 'Scheduled 45k km service', 4500, 'Closed', '2026-06-22 10:00:00', '2026-06-23 12:00:00');
  insertMaint.run(3, 'Brake Pads', 'Front brake pads replaced', 12800, 'Closed', '2026-06-15 09:00:00', '2026-06-17 17:00:00');
  insertMaint.run(4, 'Engine Overhaul', 'Coolant leak + head gasket', 86500, 'Open', '2026-07-08 08:30:00', null);

  const insertFuel = db.prepare(
    'INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost, date) VALUES (?, ?, ?, ?, ?)'
  );
  insertFuel.run(1, 1, 21, 2100, '2026-06-20');
  insertFuel.run(1, 2, 26, 2620, '2026-06-28');
  insertFuel.run(3, 3, 92, 9350, '2026-07-01');
  insertFuel.run(5, 4, 55, 5500, '2026-07-05');
  insertFuel.run(6, null, 40, 4050, '2026-07-09');

  const insertExpense = db.prepare(
    'INSERT INTO expenses (vehicle_id, trip_id, category, amount, date, notes) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insertExpense.run(1, 1, 'Toll', 850, '2026-06-20', 'Mumbai-Pune expressway');
  insertExpense.run(3, 3, 'Toll', 1400, '2026-07-01', 'NH48 tolls');
  insertExpense.run(5, 4, 'Parking', 300, '2026-07-05', 'Overnight yard parking');
  insertExpense.run(3, null, 'Permit', 5600, '2026-06-10', 'Interstate permit renewal');
}

export default db;
