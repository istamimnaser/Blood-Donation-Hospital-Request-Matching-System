# Blood Donation & Hospital Request Matching System

DBMS-II Lab Project. PostgreSQL database design and implementation.

## Project structure

```
db/
  schema.sql                       Entry point -- includes the files below in order
  schema/
    01_core_tables.sql             Drops + core tables (blood_groups, locations, donors, hospitals, blood_requests, ...)
    02_support_and_functions.sql   Supporting tables (donor_availability, notifications, audit_logs), indexes, fn_eligible_donors
    03_triggers.sql                Triggers + trigger functions
    04_procedures_views_data.sql   Procedures, reporting views, lookup data
  seed.sql                         Sample data + example procedure calls
  queries.sql                      Example report queries against the views/functions
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

## Accounts

Donors and hospitals are separate account types, each with their own
signup/login (email + password, JWT-based). Every seeded account (see
`db/seed.sql`) uses the demo password **`password123`** — e.g. log in as
donor `rafiq@example.com` or hospital `contact@dmch.example`.

- **Donor dashboard** — edit phone/location/availability/last donation
  date, view matches suggested by hospitals, accept or decline them.
- **Hospital dashboard** — create blood requests, view `fn_eligible_donors`
  for a request, suggest a match (`sp_create_match`), and record a
  donation (`sp_record_donation`) once a donor has accepted.
- **Reports**, **Notifications**, and **Audit Log** tabs stay available
  to any logged-in account (Notifications is scoped to the logged-in
  donor/hospital).

To see the triggers cascade live: as a hospital, open a request, suggest a
match, then log in as that donor and accept it. Back in the hospital
dashboard, record a donation for them. Then check the Notifications tab
(a `donation_confirmed` message appears) and the Audit Log tab (the
donor/request rows show as updated) without touching either of those tabs
directly.

## Schema

Ten tables, matching the ER diagram:

- **blood_groups** — the 8 standard groups (lookup table).
- **blood_compatibility** — donor -> recipient compatibility chart, stored
  as data instead of hard-coded in application logic.
- **locations** — city/area (lookup table).
- **donors** — profile, login credentials (`email` + bcrypt `password_hash`),
  blood group, location, availability, last donation date.
- **hospitals** — profile, login credentials, location.
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
  trigger function (`password_hash` is stripped out before logging).

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
