

-- All seeded accounts share the demo password "password123"
-- (bcrypt hash below), so they can be logged into out of the box.

INSERT INTO locations (city, area) VALUES
    ('Dhaka', 'Mirpur'),
    ('Dhaka', 'Dhanmondi'),
    ('Dhaka', 'Gulshan'),
    ('Chittagong', 'Agrabad');

INSERT INTO hospitals (name, location_id, contact_phone, email, password_hash) VALUES
    ('Dhaka Medical College Hospital', (SELECT location_id FROM locations WHERE area = 'Mirpur'), '02-9999001', 'contact@dmch.example', '$2a$10$Jd0SHEmap4GR3NyudXNWGebicFITDeLqtj3KKhRlKiPyzUvvMWK3W'),
    ('Square Hospital', (SELECT location_id FROM locations WHERE area = 'Dhanmondi'), '02-9999002', 'contact@square.example', '$2a$10$Jd0SHEmap4GR3NyudXNWGebicFITDeLqtj3KKhRlKiPyzUvvMWK3W');


INSERT INTO donors (full_name, email, password_hash, phone, blood_group_id, location_id, date_of_birth, is_available, last_donation_date) VALUES
    ('Rafiq Islam', 'rafiq@example.com', '$2a$10$Jd0SHEmap4GR3NyudXNWGebicFITDeLqtj3KKhRlKiPyzUvvMWK3W', '01710000001', (SELECT blood_group_id FROM blood_groups WHERE group_name = 'O+'), (SELECT location_id FROM locations WHERE area = 'Mirpur'), '1998-04-12', TRUE, NULL),
    ('Nusrat Jahan', 'nusrat@example.com', '$2a$10$Jd0SHEmap4GR3NyudXNWGebicFITDeLqtj3KKhRlKiPyzUvvMWK3W', '01710000002', (SELECT blood_group_id FROM blood_groups WHERE group_name = 'O-'), (SELECT location_id FROM locations WHERE area = 'Mirpur'), '1995-11-02', TRUE, CURRENT_DATE - INTERVAL '120 days'),
    ('Kamal Hossain', 'kamal@example.com', '$2a$10$Jd0SHEmap4GR3NyudXNWGebicFITDeLqtj3KKhRlKiPyzUvvMWK3W', '01710000003', (SELECT blood_group_id FROM blood_groups WHERE group_name = 'A+'), (SELECT location_id FROM locations WHERE area = 'Dhanmondi'), '1990-07-19', TRUE, CURRENT_DATE - INTERVAL '10 days'),
    ('Sadia Rahman', 'sadia@example.com', '$2a$10$Jd0SHEmap4GR3NyudXNWGebicFITDeLqtj3KKhRlKiPyzUvvMWK3W', '01710000004', (SELECT blood_group_id FROM blood_groups WHERE group_name = 'B+'), (SELECT location_id FROM locations WHERE area = 'Gulshan'), '2000-01-30', TRUE, NULL),
    ('Tanvir Ahmed', 'tanvir@example.com', '$2a$10$Jd0SHEmap4GR3NyudXNWGebicFITDeLqtj3KKhRlKiPyzUvvMWK3W', '01710000005', (SELECT blood_group_id FROM blood_groups WHERE group_name = 'AB+'), (SELECT location_id FROM locations WHERE area = 'Mirpur'), '1993-09-05', FALSE, NULL);


INSERT INTO blood_requests (hospital_id, blood_group_id, units_needed, urgency, status, needed_by) VALUES
    ((SELECT hospital_id FROM hospitals WHERE name = 'Dhaka Medical College Hospital'), (SELECT blood_group_id FROM blood_groups WHERE group_name = 'O+'), 3, 'emergency', 'pending', CURRENT_DATE + 1),
    ((SELECT hospital_id FROM hospitals WHERE name = 'Square Hospital'), (SELECT blood_group_id FROM blood_groups WHERE group_name = 'A+'), 2, 'medium', 'pending', CURRENT_DATE + 7);

DO $$
DECLARE
    v_request_id INTEGER;
    v_donor_id   INTEGER;
BEGIN
    SELECT request_id INTO v_request_id FROM blood_requests
     WHERE blood_group_id = (SELECT blood_group_id FROM blood_groups WHERE group_name = 'O+') LIMIT 1;
    SELECT donor_id INTO v_donor_id FROM donors WHERE full_name = 'Rafiq Islam';

    CALL sp_create_match(v_request_id, v_donor_id);

    CALL sp_record_donation(v_donor_id, v_request_id, 1);
END $$;
