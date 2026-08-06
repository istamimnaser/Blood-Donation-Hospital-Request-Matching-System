-- Blood Donation & Hospital Request Matching System
-- Full schema per the project ERD: lookup tables, core entities, the
-- donor<->request bridge table, and the supporting history/audit tables.
-- Safe to re-run: drops and recreates everything in dependency order.

-- =======================================================================
-- PERSON 1 START
-- Summary (easy English): This part builds the basic tables of the
-- database. First it removes any old tables so the script can be run
-- again safely. Then it creates the small "lookup" tables (blood groups,
-- city/area locations, and the donor-to-recipient compatibility chart)
-- and the main tables (donors, hospitals, blood requests, the donor<->
-- request match table, and donations), with their primary keys, foreign
-- keys, and basic validation rules (CHECK constraints).
-- =======================================================================

DROP VIEW IF EXISTS v_request_fulfillment CASCADE;
DROP VIEW IF EXISTS v_hospital_summary CASCADE;
DROP VIEW IF EXISTS v_donation_history CASCADE;
DROP VIEW IF EXISTS v_pending_emergency_requests CASCADE;

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS donor_availability CASCADE;
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS request_matches CASCADE;
DROP TABLE IF EXISTS blood_requests CASCADE;
DROP TABLE IF EXISTS donors CASCADE;
DROP TABLE IF EXISTS hospitals CASCADE;
DROP TABLE IF EXISTS blood_compatibility CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS blood_groups CASCADE;

-- ---------------------------------------------------------------------
-- Lookup tables
-- ---------------------------------------------------------------------

CREATE TABLE blood_groups (
    blood_group_id  SERIAL PRIMARY KEY,
    group_name      VARCHAR(3) NOT NULL UNIQUE
                        CHECK (group_name IN ('A+','A-','B+','B-','AB+','AB-','O+','O-'))
);

CREATE TABLE locations (
    location_id  SERIAL PRIMARY KEY,
    city         VARCHAR(100) NOT NULL,
    area         VARCHAR(100) NOT NULL,
    UNIQUE (city, area)
);

-- Donor -> recipient compatibility chart, stored as data rather than
-- hard-coded in application code so eligibility queries can join on it.
CREATE TABLE blood_compatibility (
    donor_blood_group_id      INTEGER NOT NULL REFERENCES blood_groups(blood_group_id),
    recipient_blood_group_id  INTEGER NOT NULL REFERENCES blood_groups(blood_group_id),
    PRIMARY KEY (donor_blood_group_id, recipient_blood_group_id)
);

-- ---------------------------------------------------------------------
-- Core entities
-- ---------------------------------------------------------------------

CREATE TABLE donors (
    donor_id           SERIAL PRIMARY KEY,
    full_name          VARCHAR(120) NOT NULL,
    email              VARCHAR(150) UNIQUE,
    phone              VARCHAR(20) NOT NULL,
    blood_group_id     INTEGER NOT NULL REFERENCES blood_groups(blood_group_id),
    location_id        INTEGER NOT NULL REFERENCES locations(location_id),
    date_of_birth      DATE,
    is_available       BOOLEAN NOT NULL DEFAULT TRUE,
    last_donation_date DATE,
    created_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE hospitals (
    hospital_id    SERIAL PRIMARY KEY,
    name           VARCHAR(150) NOT NULL,
    location_id    INTEGER NOT NULL REFERENCES locations(location_id),
    contact_phone  VARCHAR(20) NOT NULL,
    email          VARCHAR(150),
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE blood_requests (
    request_id      SERIAL PRIMARY KEY,
    hospital_id     INTEGER NOT NULL REFERENCES hospitals(hospital_id),
    blood_group_id  INTEGER NOT NULL REFERENCES blood_groups(blood_group_id),
    units_needed    INTEGER NOT NULL CHECK (units_needed > 0),
    units_fulfilled INTEGER NOT NULL DEFAULT 0 CHECK (units_fulfilled >= 0),
    urgency         VARCHAR(10) NOT NULL DEFAULT 'medium'
                        CHECK (urgency IN ('low','medium','high','emergency')),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','partially_fulfilled','fulfilled','cancelled')),
    needed_by       DATE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Bridge table: many-to-many between donors and blood_requests.
CREATE TABLE request_matches (
    match_id      SERIAL PRIMARY KEY,
    request_id    INTEGER NOT NULL REFERENCES blood_requests(request_id) ON DELETE CASCADE,
    donor_id      INTEGER NOT NULL REFERENCES donors(donor_id),
    match_status  VARCHAR(20) NOT NULL DEFAULT 'suggested'
                      CHECK (match_status IN ('suggested','accepted','declined','completed')),
    matched_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (request_id, donor_id)
);

CREATE TABLE donations (
    donation_id     SERIAL PRIMARY KEY,
    donor_id        INTEGER NOT NULL REFERENCES donors(donor_id),
    request_id      INTEGER REFERENCES blood_requests(request_id),
    units_donated   INTEGER NOT NULL DEFAULT 1 CHECK (units_donated > 0),
    donation_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =======================================================================
-- PERSON 1 END
-- =======================================================================

-- =======================================================================
-- PERSON 2 START
-- Summary (easy English): This part adds the extra tables that keep a
-- history of what happens in the system: donor_availability (logs every
-- time a donor turns their availability on/off), notifications (messages
-- sent to donors/hospitals), and audit_logs (a record of every insert,
-- update, and delete on the important tables). It also adds indexes so
-- common lookups run faster, and writes the main matching function,
-- fn_eligible_donors, which finds and ranks the donors who qualify for a
-- given blood request.
-- =======================================================================

-- ---------------------------------------------------------------------
-- Supporting tables (history / notifications / audit)
-- ---------------------------------------------------------------------

-- History of availability toggles, so "was this donor available on date X"
-- is answerable instead of only the current donors.is_available flag.
CREATE TABLE donor_availability (
    availability_id  SERIAL PRIMARY KEY,
    donor_id         INTEGER NOT NULL REFERENCES donors(donor_id) ON DELETE CASCADE,
    is_available     BOOLEAN NOT NULL,
    changed_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    note             VARCHAR(200)
);

-- recipient_type + recipient_id is a polymorphic reference (donor or
-- hospital); fn_validate_notification_recipient() below enforces it
-- actually points at an existing row, since a plain FK can't span two
-- target tables.
CREATE TABLE notifications (
    notification_id    SERIAL PRIMARY KEY,
    recipient_type      VARCHAR(10) NOT NULL CHECK (recipient_type IN ('donor','hospital')),
    recipient_id         INTEGER NOT NULL,
    request_id          INTEGER REFERENCES blood_requests(request_id) ON DELETE CASCADE,
    match_id            INTEGER REFERENCES request_matches(match_id) ON DELETE CASCADE,
    notification_type   VARCHAR(30) NOT NULL
                             CHECK (notification_type IN ('request_created','match_suggested','donation_confirmed')),
    message              TEXT NOT NULL,
    is_read              BOOLEAN NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    audit_id     BIGSERIAL PRIMARY KEY,
    table_name   VARCHAR(50) NOT NULL,
    record_id    INTEGER NOT NULL,
    action       VARCHAR(10) NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
    old_data     JSONB,
    new_data     JSONB,
    changed_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------

CREATE INDEX idx_donors_blood_group ON donors(blood_group_id);
CREATE INDEX idx_donors_location ON donors(location_id);
CREATE INDEX idx_requests_status ON blood_requests(status);
CREATE INDEX idx_requests_urgency ON blood_requests(urgency);
CREATE INDEX idx_matches_request ON request_matches(request_id);
CREATE INDEX idx_donations_donor ON donations(donor_id);
CREATE INDEX idx_donor_availability_donor ON donor_availability(donor_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_type, recipient_id);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);

-- ---------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------

-- Ranked donor pool for a given request: compatible blood group, available,
-- and past the 90-day rest period. Same-location and exact-blood-group
-- matches are ranked first.
CREATE OR REPLACE FUNCTION fn_eligible_donors(p_request_id INTEGER)
RETURNS TABLE (
    donor_id             INTEGER,
    full_name            VARCHAR,
    phone                VARCHAR,
    blood_group          VARCHAR,
    city                 VARCHAR,
    area                 VARCHAR,
    last_donation_date   DATE,
    same_location        BOOLEAN,
    exact_blood_group    BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT d.donor_id, d.full_name, d.phone, bg.group_name, l.city, l.area,
           d.last_donation_date,
           (d.location_id = h.location_id) AS same_location,
           (d.blood_group_id = r.blood_group_id) AS exact_blood_group
    FROM blood_requests r
    JOIN hospitals h ON h.hospital_id = r.hospital_id
    JOIN blood_compatibility bc ON bc.recipient_blood_group_id = r.blood_group_id
    JOIN donors d ON d.blood_group_id = bc.donor_blood_group_id
    JOIN blood_groups bg ON bg.blood_group_id = d.blood_group_id
    JOIN locations l ON l.location_id = d.location_id
    WHERE r.request_id = p_request_id
      AND d.is_available = TRUE
      AND (d.last_donation_date IS NULL OR d.last_donation_date <= CURRENT_DATE - INTERVAL '90 days')
    ORDER BY same_location DESC, exact_blood_group DESC, d.last_donation_date NULLS FIRST;
END;
$$ LANGUAGE plpgsql;


-- =======================================================================
-- PERSON 2 END
-- =======================================================================

-- =======================================================================
-- PERSON 3 START
-- Summary (easy English): This part makes the database react on its own
-- when data changes (triggers). When a donation is added, it updates the
-- donor's last donation date, updates how much of the request is
-- fulfilled, marks the match as completed, and sends the donor a thank-you
-- notification. It also logs every time a donor's availability changes,
-- notifies a hospital when an emergency request is created, notifies a
-- donor when they are matched to a request, checks that every
-- notification is actually sent to a real donor or hospital, and keeps an
-- audit trail of every insert/update/delete on the main tables.
-- =======================================================================



-- =======================================================================
-- PERSON 3 END
-- =======================================================================

-- =======================================================================
-- PERSON 4 START
-- Summary (easy English): This part adds easy, safe ways to use the
-- system and to see reports from it. sp_create_match matches a donor to a
-- request (and refuses to do it if the donor isn't actually eligible).
-- sp_record_donation records a donation. The four views turn raw table
-- data into ready-to-read reports: emergency requests still waiting for
-- blood, full donation history, a summary per hospital, and how far each
-- request is toward being fulfilled. At the end, it fills in the starting
-- data: the 8 blood groups and the standard donor-to-recipient
-- compatibility chart.
-- =======================================================================

-- ---------------------------------------------------------------------
-- Procedures
-- ---------------------------------------------------------------------


-- =======================================================================
-- PERSON 4 END
-- =======================================================================
