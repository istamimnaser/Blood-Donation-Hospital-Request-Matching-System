-- Supporting tables (history / notifications / audit)

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

-- Indexes

CREATE INDEX idx_donors_blood_group ON donors(blood_group_id);
CREATE INDEX idx_donors_location ON donors(location_id);
CREATE INDEX idx_requests_status ON blood_requests(status);
CREATE INDEX idx_requests_urgency ON blood_requests(urgency);
CREATE INDEX idx_matches_request ON request_matches(request_id);
CREATE INDEX idx_donations_donor ON donations(donor_id);
CREATE INDEX idx_donor_availability_donor ON donor_availability(donor_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_type, recipient_id);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);

-- Functions

-- CREATE OR REPLACE can't change a RETURNS TABLE signature, so this is
-- dropped up front to keep schema.sql safe to re-run.
DROP FUNCTION IF EXISTS fn_eligible_donors(INTEGER);

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
