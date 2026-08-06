-- Sample data for local testing/demo. Safe to re-run after schema.sql
-- (which drops and recreates all tables, including blood_groups and
-- blood_compatibility, so those don't need to be repeated here).

INSERT INTO locations (city, area) VALUES
    ('Dhaka', 'Mirpur'),
    ('Dhaka', 'Dhanmondi'),
    ('Dhaka', 'Gulshan'),
    ('Chittagong', 'Agrabad');

INSERT INTO hospitals (name, location_id, contact_phone, email) VALUES
    ('Dhaka Medical College Hospital', (SELECT location_id FROM locations WHERE area = 'Mirpur'), '02-9999001', 'contact@dmch.example'),
    ('Square Hospital', (SELECT location_id FROM locations WHERE area = 'Dhanmondi'), '02-9999002', 'contact@square.example');

-- donors: trg_donor_availability_insert logs an initial donor_availability
-- row for each of these automatically.
INSERT INTO donors (full_name, email, phone, blood_group_id, location_id, date_of_birth, is_available, last_donation_date) VALUES
    ('Rafiq Islam', 'rafiq@example.com', '01710000001', (SELECT blood_group_id FROM blood_groups WHERE group_name = 'O+'), (SELECT location_id FROM locations WHERE area = 'Mirpur'), '1998-04-12', TRUE, NULL),
    ('Nusrat Jahan', 'nusrat@example.com', '01710000002', (SELECT blood_group_id FROM blood_groups WHERE group_name = 'O-'), (SELECT location_id FROM locations WHERE area = 'Mirpur'), '1995-11-02', TRUE, CURRENT_DATE - INTERVAL '120 days'),
    ('Kamal Hossain', 'kamal@example.com', '01710000003', (SELECT blood_group_id FROM blood_groups WHERE group_name = 'A+'), (SELECT location_id FROM locations WHERE area = 'Dhanmondi'), '1990-07-19', TRUE, CURRENT_DATE - INTERVAL '10 days'),
    ('Sadia Rahman', 'sadia@example.com', '01710000004', (SELECT blood_group_id FROM blood_groups WHERE group_name = 'B+'), (SELECT location_id FROM locations WHERE area = 'Gulshan'), '2000-01-30', TRUE, NULL),
    ('Tanvir Ahmed', 'tanvir@example.com', '01710000005', (SELECT blood_group_id FROM blood_groups WHERE group_name = 'AB+'), (SELECT location_id FROM locations WHERE area = 'Mirpur'), '1993-09-05', FALSE, NULL);

-- blood_requests: the emergency one fires trg_notify_emergency_request
-- and lands a row in notifications automatically.
INSERT INTO blood_requests (hospital_id, blood_group_id, units_needed, urgency, status, needed_by) VALUES
    ((SELECT hospital_id FROM hospitals WHERE name = 'Dhaka Medical College Hospital'), (SELECT blood_group_id FROM blood_groups WHERE group_name = 'O+'), 3, 'emergency', 'pending', CURRENT_DATE + 1),
    ((SELECT hospital_id FROM hospitals WHERE name = 'Square Hospital'), (SELECT blood_group_id FROM blood_groups WHERE group_name = 'A+'), 2, 'medium', 'pending', CURRENT_DATE + 7);

-- sp_create_match validates eligibility (fn_eligible_donors) before
-- inserting, and trg_notify_new_match notifies the matched donor.
CALL sp_create_match(
    (SELECT request_id FROM blood_requests WHERE blood_group_id = (SELECT blood_group_id FROM blood_groups WHERE group_name = 'O+') LIMIT 1),
    (SELECT donor_id FROM donors WHERE full_name = 'Rafiq Islam')
);

-- sp_record_donation inserts the donation; trg_apply_donation then rolls
-- the donor's last_donation_date and the request's fulfillment forward.
CALL sp_record_donation(
    (SELECT donor_id FROM donors WHERE full_name = 'Rafiq Islam'),
    (SELECT request_id FROM blood_requests WHERE blood_group_id = (SELECT blood_group_id FROM blood_groups WHERE group_name = 'O+') LIMIT 1),
    1
);
