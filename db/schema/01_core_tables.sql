-- Core tables: drops, lookup tables, and the main entity tables

DROP VIEW IF EXISTS v_request_fulfillment CASCADE;
DROP VIEW IF EXISTS v_hospital_summary CASCADE;
DROP VIEW IF EXISTS v_donation_history CASCADE;
DROP VIEW IF EXISTS v_pending_emergency_requests CASCADE;

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS donor_availability CASCADE;
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS donor_request_responses CASCADE;
DROP TABLE IF EXISTS donor_requests CASCADE;
DROP TABLE IF EXISTS request_matches CASCADE;
DROP TABLE IF EXISTS blood_requests CASCADE;
DROP TABLE IF EXISTS donors CASCADE;
DROP TABLE IF EXISTS hospitals CASCADE;
DROP TABLE IF EXISTS blood_compatibility CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS blood_groups CASCADE;

-- Lookup tables
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

-- Core entities

CREATE TABLE donors (
    donor_id           SERIAL PRIMARY KEY,
    full_name          VARCHAR(120) NOT NULL,
    email              VARCHAR(150) NOT NULL UNIQUE,
    password_hash      VARCHAR(255) NOT NULL,
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
    email          VARCHAR(150) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
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

-- Community Requests: the reverse direction of blood_requests -- a donor
-- broadcasts that they (or someone they know) needs blood, instead of a
-- hospital creating the request.
CREATE TABLE donor_requests (
    donor_request_id  SERIAL PRIMARY KEY,
    donor_id          INTEGER NOT NULL REFERENCES donors(donor_id),
    blood_group_id    INTEGER NOT NULL REFERENCES blood_groups(blood_group_id),
    units_needed      INTEGER NOT NULL CHECK (units_needed > 0),
    urgency           VARCHAR(10) NOT NULL DEFAULT 'medium'
                          CHECK (urgency IN ('low','medium','high','emergency')),
    reason            TEXT,
    status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','accepted','fulfilled','cancelled')),
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- A hospital's reply to a donor_request. UNIQUE(donor_request_id,
-- hospital_id) keeps one response per hospital; the partial unique index
-- below (rather than a trigger) keeps at most one 'accepted' response per
-- request, since Postgres can express "unique among a subset of rows"
-- directly as an index predicate.
CREATE TABLE donor_request_responses (
    response_id        SERIAL PRIMARY KEY,
    donor_request_id   INTEGER NOT NULL REFERENCES donor_requests(donor_request_id) ON DELETE CASCADE,
    hospital_id         INTEGER NOT NULL REFERENCES hospitals(hospital_id),
    status               VARCHAR(10) NOT NULL CHECK (status IN ('accepted','declined')),
    responded_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (donor_request_id, hospital_id)
);

CREATE UNIQUE INDEX idx_donor_request_responses_one_accepted
    ON donor_request_responses (donor_request_id)
    WHERE status = 'accepted';
