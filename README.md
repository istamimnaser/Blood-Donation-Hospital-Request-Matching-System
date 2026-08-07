# Blood Donation & Hospital Request Matching System

DBMS-II Lab Project. PostgreSQL database design and implementation.

## Project structure

```
db/
  schema.sql   Tables, constraints, indexes, functions, triggers, procedures, views
  seed.sql     Sample data + example procedure calls
  queries.sql  Example report queries against the views/functions
backend/       Express API -- a thin wrapper around the schema (no business
               logic lives here; every route is close to a plain SELECT,
               CALL, or INSERT)
frontend/      React (Vite) demo UI -- one tab per part of the schema
```

## Database setup

Requires a running PostgreSQL server (tested against 17).

```bash
createdb -U postgres blood_donation
psql -U postgres -d blood_donation -f db/schema.sql
psql -U postgres -d blood_donation -f db/seed.sql   # optional sample data
```

`schema.sql` is safe to re-run — it drops and recreates everything.

## Running the demo app

Backend:
```bash
cd backend
npm install
cp .env.example .env   # fill in your PG connection details if not the defaults
npm run dev             # http://localhost:4000
```

Frontend:
```bash
cd frontend
npm install
npm run dev             # http://localhost:5173
```

> This folder's name contains an `&`, which breaks the `.cmd` shims npm
> generates for binaries on Windows. Both `package.json`s call
> `node node_modules/vite/bin/vite.js` (frontend) directly instead of the
> `vite`/`nodemon` shims to avoid it.

The UI has six tabs, one per part of the schema: **Donors**, **Hospitals**,
**Requests & Matching** (create a request, see `fn_eligible_donors` rank
donors, match one with `sp_create_match`, record a donation with
`sp_record_donation`), **Reports** (the four views), **Notifications**, and
**Audit Log**.

To see the triggers cascade live: open a request in the Requests & Matching
tab, match a donor, then record a donation for them. Then check the
Notifications tab (a `donation_confirmed` message appears) and the Audit Log
tab (the donor/request rows show as updated) without touching either of
those tabs directly.

## Schema

Ten tables, matching the ER diagram:

- **blood_groups** — the 8 standard groups (lookup table).
- **blood_compatibility** — donor -> recipient compatibility chart, stored
  as data instead of hard-coded in application logic.
- **locations** — city/area (lookup table).
- **donors** — profile, blood group, location, availability, last donation
  date, optional `photo_url` (set by the backend when a photo is uploaded
  through the Donors tab; files are saved to `backend/uploads/` and served
  at `/uploads/<filename>`).
- **hospitals** — profile + location.
- **blood_requests** — a hospital's request for blood: group, units needed,
  urgency, fulfillment status.
- **request_matches** — bridge table connecting donors to requests
  (many-to-many).
- **donations** — a completed donation, optionally tied to a request.
- **donor_availability** — history of a donor's availability toggles.
- **notifications** — messages to donors/hospitals (new match, emergency
  request, donation confirmation).
- **audit_logs** — generic INSERT/UPDATE/DELETE change log.

## SQL logic

**Functions**
- `fn_eligible_donors(request_id)` — the core matching query: compatible
  blood group (via `blood_compatibility`), available, past the 90-day rest
  period, ranked by same-location and exact-blood-group match first.

**Procedures**
- `sp_create_match(request_id, donor_id)` — suggests a donor for a request;
  rejects the call if the donor isn't in that request's eligible pool.
- `sp_record_donation(donor_id, request_id, units, donation_date)` —
  records a donation.

**Triggers**
- `trg_apply_donation` — after a donation is inserted: rolls the donor's
  `last_donation_date` forward, updates the request's `units_fulfilled`/
  `status`, marks the match `completed`, and notifies the donor.
- `trg_donor_availability_insert` / `trg_donor_availability_update` — log
  every availability change (including the initial one at registration)
  to `donor_availability`.
- `trg_notify_emergency_request` — notifies the hospital when one of its
  requests is created with `urgency = 'emergency'`.
- `trg_notify_new_match` — notifies a donor when they're matched to a request.
- `trg_validate_notification_recipient` — enforces that a notification's
  polymorphic `recipient_id` actually points at an existing donor/hospital
  (a plain foreign key can't express that, since it targets one of two tables).
- `trg_audit_*` (donors, hospitals, blood_requests, donations,
  request_matches) — logs every row change to `audit_logs` via one shared
  trigger function.

**Views** (`db/queries.sql` has example usage of all of these)
- `v_pending_emergency_requests`
- `v_donation_history`
- `v_hospital_summary`
- `v_request_fulfillment`

## Matching logic

- Blood-group compatibility is a join against `blood_compatibility`, not
  application code, so it's enforced consistently regardless of what calls
  the database.
- A donor is eligible for a request if their group is compatible with the
  request's, they're marked available, and it's been 90+ days since
  `last_donation_date` (or they've never donated).
- Eligible donors are ranked with same-location and exact-blood-group
  matches first.
