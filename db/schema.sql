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
