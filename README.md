# Blood Donation & Hospital Request Matching System

4th Semester DBMS-II Lab Project. PostgreSQL + Node.js/Express + React.

## Scope of this implementation (half of the full design)

Implemented: the core donor <-> hospital request matching flow end-to-end —
donor registration, hospital & request creation, blood-group/location/availability/
rest-period eligibility matching, match accept/decline, donation recording, and a
Postgres trigger that rolls fulfillment and donor history forward automatically.

Not implemented (left for the other half): `donor_availability` history table,
`notifications`, `audit_logs`, authentication, and a reporting UI (the
`/api/reports/*` endpoints exist on the backend but have no frontend screen yet).

## Project structure

```
backend/   Express API + PostgreSQL schema
frontend/  React (Vite) UI
```

## Database setup

Requires a running PostgreSQL server (tested against 17). Create the database and
load the schema:

```bash
createdb -U postgres blood_donation
psql -U postgres -d blood_donation -f backend/db/schema.sql
psql -U postgres -d blood_donation -f backend/db/seed.sql   # optional sample data
```

`schema.sql` is safe to re-run — it drops and recreates all tables.

## Backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in your PG connection details
npm run dev            # starts the API on http://localhost:4000
```

Key endpoints:
- `GET/POST /api/donors`, `PATCH /api/donors/:id`
- `GET/POST /api/hospitals`
- `GET/POST /api/blood-requests`, `GET /api/blood-requests/:id/eligible-donors`
- `GET/POST /api/matches`, `PATCH /api/matches/:id`
- `GET/POST /api/donations`
- `GET /api/reports/emergency-requests`, `GET /api/reports/hospital-summary`

## Frontend

```bash
cd frontend
npm install
npm run dev             # starts the UI on http://localhost:5173
```

The UI has three tabs: **Donors** (register + list), **Hospitals** (register + list),
and **Requests** (create a request, view eligible donors ranked by location/exact
blood-group match, suggest/accept/decline matches, and record donations).

> Note: this project's folder name contains an `&`, which breaks the `.cmd` shims
> npm generates for binaries on Windows. The frontend's `package.json` scripts
> call `node node_modules/vite/bin/vite.js` directly instead of `vite` to avoid it.

## Matching logic

- Blood-group compatibility uses the standard 8-group donor→recipient chart
  (`backend/src/matching.js`), not a database join, since it's a fixed lookup.
- A donor is eligible for a request if their group is compatible, they're marked
  available, and it's been 90+ days since `last_donation_date` (or they've never
  donated).
- Eligible donors are ranked with same-location and exact-blood-group matches first.
- Recording a donation (`apply_donation()` trigger in `schema.sql`) updates the
  donor's `last_donation_date`, increments the request's `units_fulfilled`, flips
  its `status` to `partially_fulfilled`/`fulfilled`, and marks the donor's match
  `completed`.
