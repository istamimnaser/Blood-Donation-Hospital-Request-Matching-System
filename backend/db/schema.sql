-- Blood Donation & Hospital Request Matching System
-- Core schema: donor <-> hospital request matching flow.
-- Out of scope for this half: donor_availability history, notifications, audit_logs.

DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS request_matches CASCADE;
DROP TABLE IF EXISTS blood_requests CASCADE;
DROP TABLE IF EXISTS donors CASCADE;
DROP TABLE IF EXISTS hospitals CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS blood_groups CASCADE;

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

CREATE INDEX idx_donors_blood_group ON donors(blood_group_id);
CREATE INDEX idx_donors_location ON donors(location_id);
CREATE INDEX idx_requests_status ON blood_requests(status);
CREATE INDEX idx_matches_request ON request_matches(request_id);

-- After a donation is recorded: roll last_donation_date forward (eligibility queries
-- re-derive the 90-day rest period from this rather than a separate flag), and fold
-- the donated units into the parent request's fulfillment status.
CREATE OR REPLACE FUNCTION apply_donation() RETURNS TRIGGER AS $$
BEGIN
    UPDATE donors
       SET last_donation_date = NEW.donation_date
     WHERE donor_id = NEW.donor_id;

    IF NEW.request_id IS NOT NULL THEN
        UPDATE blood_requests
           SET units_fulfilled = units_fulfilled + NEW.units_donated,
               status = CASE
                            WHEN units_fulfilled + NEW.units_donated >= units_needed THEN 'fulfilled'
                            ELSE 'partially_fulfilled'
                        END
         WHERE request_id = NEW.request_id;

        UPDATE request_matches
           SET match_status = 'completed'
         WHERE request_id = NEW.request_id AND donor_id = NEW.donor_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_apply_donation
AFTER INSERT ON donations
FOR EACH ROW EXECUTE FUNCTION apply_donation();

-- Lookup data
INSERT INTO blood_groups (group_name) VALUES
    ('A+'), ('A-'), ('B+'), ('B-'), ('AB+'), ('AB-'), ('O+'), ('O-');
