-- Triggers and trigger functions

-- After a donation is recorded: roll last_donation_date forward, fold the
-- donated units into the parent request's fulfillment status, mark the
-- donor's match completed, and notify the donor.
CREATE OR REPLACE FUNCTION fn_apply_donation() RETURNS TRIGGER AS $$
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

    INSERT INTO notifications (recipient_type, recipient_id, request_id, notification_type, message)
    VALUES ('donor', NEW.donor_id, NEW.request_id, 'donation_confirmed',
            'Thank you for your donation of ' || NEW.units_donated || ' unit(s).');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_apply_donation
AFTER INSERT ON donations
FOR EACH ROW EXECUTE FUNCTION fn_apply_donation();

-- Every change to donors.is_available is logged as a history row, so an
-- initial row is also written on registration (OLD is NULL there).
CREATE OR REPLACE FUNCTION fn_log_donor_availability() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR OLD.is_available IS DISTINCT FROM NEW.is_available THEN
        INSERT INTO donor_availability (donor_id, is_available, note)
        VALUES (NEW.donor_id, NEW.is_available,
                CASE WHEN TG_OP = 'INSERT' THEN 'initial registration' ELSE 'status changed' END);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_donor_availability_insert
AFTER INSERT ON donors
FOR EACH ROW EXECUTE FUNCTION fn_log_donor_availability();

CREATE TRIGGER trg_donor_availability_update
AFTER UPDATE OF is_available ON donors
FOR EACH ROW EXECUTE FUNCTION fn_log_donor_availability();

-- Notify the hospital when one of its requests is created as an emergency.
CREATE OR REPLACE FUNCTION fn_notify_emergency_request() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (recipient_type, recipient_id, request_id, notification_type, message)
    VALUES ('hospital', NEW.hospital_id, NEW.request_id, 'request_created',
            'Emergency request created for ' ||
            (SELECT group_name FROM blood_groups WHERE blood_group_id = NEW.blood_group_id) ||
            ' (' || NEW.units_needed || ' unit(s)).');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_emergency_request
AFTER INSERT ON blood_requests
FOR EACH ROW WHEN (NEW.urgency = 'emergency')
EXECUTE FUNCTION fn_notify_emergency_request();

-- Notify the donor whenever they're suggested for a request.
CREATE OR REPLACE FUNCTION fn_notify_new_match() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (recipient_type, recipient_id, request_id, match_id, notification_type, message)
    VALUES ('donor', NEW.donor_id, NEW.request_id, NEW.match_id, 'match_suggested',
            'You have been matched to a blood request.');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_new_match
AFTER INSERT ON request_matches
FOR EACH ROW EXECUTE FUNCTION fn_notify_new_match();

-- recipient_id is polymorphic (donor_id or hospital_id depending on
-- recipient_type), which a foreign key can't express directly.
CREATE OR REPLACE FUNCTION fn_validate_notification_recipient() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.recipient_type = 'donor' AND NOT EXISTS (SELECT 1 FROM donors WHERE donor_id = NEW.recipient_id) THEN
        RAISE EXCEPTION 'notifications.recipient_id % does not match an existing donor', NEW.recipient_id;
    ELSIF NEW.recipient_type = 'hospital' AND NOT EXISTS (SELECT 1 FROM hospitals WHERE hospital_id = NEW.recipient_id) THEN
        RAISE EXCEPTION 'notifications.recipient_id % does not match an existing hospital', NEW.recipient_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_notification_recipient
BEFORE INSERT OR UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION fn_validate_notification_recipient();

-- Generic row-change logger, attached per-table below with the primary
-- key column name passed in as the trigger argument.
CREATE OR REPLACE FUNCTION fn_audit_row_change() RETURNS TRIGGER AS $$
DECLARE
    v_record_id INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_record_id := (row_to_json(OLD)->>(TG_ARGV[0]))::INTEGER;
        INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, v_record_id, TG_OP, to_jsonb(OLD) - 'password_hash', NULL);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        v_record_id := (row_to_json(NEW)->>(TG_ARGV[0]))::INTEGER;
        INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, v_record_id, TG_OP, to_jsonb(OLD) - 'password_hash', to_jsonb(NEW) - 'password_hash');
        RETURN NEW;
    ELSE
        v_record_id := (row_to_json(NEW)->>(TG_ARGV[0]))::INTEGER;
        INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, v_record_id, TG_OP, NULL, to_jsonb(NEW) - 'password_hash');
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_donors
AFTER INSERT OR UPDATE OR DELETE ON donors
FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change('donor_id');

CREATE TRIGGER trg_audit_hospitals
AFTER INSERT OR UPDATE OR DELETE ON hospitals
FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change('hospital_id');

CREATE TRIGGER trg_audit_blood_requests
AFTER INSERT OR UPDATE OR DELETE ON blood_requests
FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change('request_id');

CREATE TRIGGER trg_audit_donations
AFTER INSERT OR UPDATE OR DELETE ON donations
FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change('donation_id');

CREATE TRIGGER trg_audit_request_matches
AFTER INSERT OR UPDATE OR DELETE ON request_matches
FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change('match_id');
