# Blood Donation & Hospital Request Matching System

DBMS-II Lab Project. PostgreSQL database design and implementation.

## Status

The project was reset to start fresh from the full ER diagram in the lab
presentation. Only the database layer exists right now — no backend/frontend
app code yet.

## Project structure

```
db/
  schema.sql   Tables, constraints, indexes, functions, triggers, procedures, views
  seed.sql     Sample data + example procedure calls
  queries.sql  Example report queries against the views/functions
```

## Database setup

Requires a running PostgreSQL server (tested against 17).

```bash
createdb -U postgres blood_donation
psql -U postgres -d blood_donation -f db/schema.sql
psql -U postgres -d blood_donation -f db/seed.sql   # optional sample data
```

`schema.sql` is safe to re-run — it drops and recreates everything.

## Schema

Ten tables, matching the ER diagram:

- **blood_groups** — the 8 standard groups (lookup table).
- **blood_compatibility** — donor -> recipient compatibility chart, stored
  as data instead of hard-coded in application logic.
- **locations** — city/area (lookup table).
- **donors** — profile, blood group, location, availability, last donation date.
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
