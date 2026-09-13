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
    05_bloodbank.sql               Per-hospital blood bank inventory, stock procedures, ledger
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
  date, see an "eligible again" countdown badge based on the 90-day rest
  period, one-tap "I can help" on open hospital requests you're eligible
  for, and view/respond to matches suggested by hospitals.
- **Hospital dashboard** — create blood requests, view `fn_eligible_donors`
  for a request, suggest a match (`sp_create_match`), and record a
  donation (`sp_record_donation`) once a donor has accepted. Also shows the
  hospital's blood bank: current stock by blood group, a manual "add stock"
  form, and a "use for this request" withdrawal form that draws stock down
  against a selected request.
- **Community Requests** tab — the reverse direction: donors broadcast
  that they need blood (optionally with a reason), hospitals browse and
  accept/decline open requests, and each side gets a small "Community
  updates" notification feed scoped to this feature.
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

Fourteen tables, matching the ER diagram:

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
  request, donation confirmation, community request created/responded to).
- **audit_logs** — generic INSERT/UPDATE/DELETE change log.
- **donor_requests** — a donor's own broadcast that they need blood: group,
  units, urgency, optional reason, status.
- **donor_request_responses** — bridge table: a hospital's accept/decline
  against a donor_request (at most one `accepted` row per request).
- **bloodbank_stock** — a hospital's current blood bank inventory: running
  total of units on hand per blood group.
- **bloodbank_transactions** — the full ledger behind that total: every
  addition (from a donation or manual entry) and withdrawal.

## SQL logic

**Functions**
- `fn_eligible_donors(request_id)` — the core matching query: compatible
  blood group (via `blood_compatibility`), available, past the 90-day rest
  period, ranked by same-location and exact-blood-group match first.

**Procedures**
- `sp_create_match(request_id, donor_id, initial_status = 'suggested')` —
  suggests a donor for a request; rejects the call if the donor isn't in
  that request's eligible pool. The donor's own "I can help" self-nomination
  passes `initial_status = 'accepted'`, since there's no one else left to
  accept on their behalf.
- `sp_record_donation(donor_id, request_id, units, donation_date)` —
  records a donation.
- `sp_fulfill_donor_request(donor_request_id)` — the donor_request
  equivalent of `sp_record_donation`'s completion step: closes out a
  donor_request once the hospital that accepted it has taken the donation.
- `sp_bloodbank_add_stock(hospital_id, blood_group_id, units, note)` —
  manual stock addition (e.g. external supply).
- `sp_bloodbank_withdraw(hospital_id, blood_group_id, units, request_id, note)` —
  draws stock down when a hospital uses banked blood for one of its own
  requests; rejects the call if the request isn't theirs or there isn't
  enough on hand.

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
- `trg_notify_donor_request` — notifies every hospital when a donor
  broadcasts a new donor_request (there's no single owning hospital to
  target, unlike `trg_notify_emergency_request`).
- `trg_check_donor_request_open` — blocks a hospital from responding to a
  donor_request that's no longer `pending`.
- `trg_apply_donor_request_response` — when a hospital accepts a
  donor_request, moves it out of `pending` and notifies the donor.
- `trg_validate_notification_recipient` — enforces that a notification's
  polymorphic `recipient_id` actually points at an existing donor/hospital
  (a plain foreign key can't express that, since it targets one of two tables).
- `trg_audit_*` (donors, hospitals, blood_requests, donations,
  request_matches, donor_requests, donor_request_responses) — logs every
  row change to `audit_logs` via one shared trigger function
  (`password_hash` is stripped out before logging).
- `trg_bloodbank_add_from_donation` — after a donation tied to a request is
  inserted: adds its units to that request's hospital's blood bank stock
  (banked under the donor's own blood group) and logs a `donation_in`
  transaction.

**Views** (`db/queries.sql` has example usage of all of these)
- `v_pending_emergency_requests`
- `v_donation_history`
- `v_hospital_summary`
- `v_request_fulfillment`
- `v_bloodbank_inventory` — current stock (> 0 units) per hospital/blood group.
- `v_bloodbank_transactions` — the full add/withdraw ledger, newest first.

## Matching logic

- Blood-group compatibility is a join against `blood_compatibility`, not
  application code, so it's enforced consistently regardless of what calls
  the database.
- A donor is eligible for a request if their group is compatible with the
  request's, they're marked available, and it's been 90+ days since
  `last_donation_date` (or they've never donated).
- Eligible donors are ranked with same-location and exact-blood-group
  matches first.

## Community Requests

The reverse direction of the hospital -> donor flow above: a donor can
broadcast that they need blood, and any hospital can respond.

- `POST /api/donor-requests` (donor) — post a request; fires
  `trg_notify_donor_request` to notify every hospital.
- `GET /api/donor-requests/mine` (donor) — the donor's own requests, plus
  whichever hospital accepted (if any).
- `GET /api/donor-requests` (hospital) — open (`pending`) requests,
  optionally filtered by `blood_group_id`.
- `POST /api/donor-requests/:id/respond` (hospital) — accept or decline;
  `trg_check_donor_request_open` rejects it once the request has left
  `pending`, and accepting fires `trg_apply_donor_request_response`.
- `GET /api/donor-requests/accepted-by-me` (hospital) — the hospital's own
  accepted-but-not-yet-fulfilled requests.
- `POST /api/donor-requests/:id/fulfill` (hospital) — calls
  `sp_fulfill_donor_request` once the donation has actually happened.

## Blood Bank

Each hospital has its own blood bank inventory, separate from the
request/matching flow above:

- `GET /api/bloodbank/mine` (hospital) — current stock by blood group.
- `POST /api/bloodbank/stock` (hospital) — manually add stock (`sp_bloodbank_add_stock`).
- `POST /api/bloodbank/withdraw` (hospital) — use stock against one of the
  hospital's own requests (`sp_bloodbank_withdraw`); fails if the request
  isn't theirs or there isn't enough on hand.
- `GET /api/bloodbank/transactions` (hospital) — the full add/withdraw
  ledger for that hospital, newest first.

Stock fills up two ways: automatically, whenever `sp_record_donation` is
called with a `request_id` (`trg_bloodbank_add_from_donation` banks the
donated units under the donor's blood group), or manually via the "add
stock" form on the hospital dashboard (e.g. external supply). It only
drains through an explicit withdrawal tied to a request — nothing removes
stock on its own.

The donor dashboard also has a symmetric "I can help" flow for the
*existing* hospital -> donor direction: `GET /api/blood-requests/open-for-me`
lists open blood_requests the logged-in donor is eligible for (the
donor's-eye-view mirror of `fn_eligible_donors`), and
`POST /api/matches/self-nominate` lets them match themselves to one
directly, rather than waiting for a hospital to suggest it.
