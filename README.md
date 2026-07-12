# TransitOps — Smart Transport Operations Platform

End-to-end transport operations platform: vehicles, drivers, dispatch, maintenance, fuel & expense tracking, and analytics — with role-based access control and enforced business rules.

## Stack

- **Frontend:** React 18 (Vite), Tailwind CSS v4, Recharts, React Router
- **Backend:** Node.js + Express, JWT auth (bcrypt password hashing)
- **Database:** SQLite (better-sqlite3) — zero-config, auto-seeded with demo data on first run

## Quick start

```bash
# Terminal 1 — API (port 4000)
cd server
npm install
npm run dev

# Terminal 2 — Client (port 5173, proxies /api to the API)
cd client
npm install
npm run dev
```

Open http://localhost:5173

## Demo accounts (password: `demo1234`)

| Role | Email |
|---|---|
| Fleet Manager | manager@transitops.com |
| Driver | driver@transitops.com |
| Safety Officer | safety@transitops.com |
| Financial Analyst | finance@transitops.com |

## Features

- **Auth + RBAC** — JWT login/registration; permissions enforced server-side per role (e.g. only Fleet Managers manage vehicles, Safety Officers manage drivers, Drivers/Managers operate trips).
- **Dashboard** — KPIs (active/available vehicles, in maintenance, active & pending trips, drivers on duty, fleet utilization %), filters by type/status/region, charts, expiring-license alerts.
- **Vehicle registry** — CRUD with unique registration numbers; statuses: Available / On Trip / In Shop / Retired.
- **Driver management** — CRUD with license category/expiry, safety score; statuses: Available / On Trip / Off Duty / Suspended.
- **Trip lifecycle** — Draft → Dispatched → Completed / Cancelled with automatic status transitions on vehicle + driver.
- **Maintenance workflow** — opening a record moves the vehicle to In Shop (hidden from dispatch); closing restores it to Available.
- **Fuel & expenses** — fuel logs (liters, cost, date) and other expenses; operational cost (fuel + maintenance) computed per vehicle.
- **Reports** — fuel efficiency (distance ÷ fuel), fleet utilization, operational cost, vehicle ROI = (Revenue − (Maintenance + Fuel)) ÷ Acquisition Cost; CSV export for vehicles and trips.
- **Bonus** — dark mode, charts, search/filter/sort, license-expiry alerts, responsive layout.

## Enforced business rules

1. Vehicle registration numbers are unique (409 on duplicates).
2. Retired / In Shop vehicles never appear in dispatch selection.
3. Drivers with expired licenses or Suspended status cannot be assigned to trips.
4. A vehicle or driver already On Trip cannot be double-booked.
5. Cargo weight must not exceed the vehicle's max load capacity.
6. Dispatching sets vehicle + driver to On Trip; completing restores both to Available (and updates the odometer); cancelling a dispatched trip restores both.
7. An active maintenance record forces the vehicle to In Shop; closing it restores Available (unless retired).

All rules are validated **server-side** — the UI also hides invalid options, but the API is the source of truth.