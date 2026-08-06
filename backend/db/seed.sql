-- Sample data for local testing/demo. Safe to re-run after schema.sql (which drops tables).

INSERT INTO locations (city, area) VALUES
    ('Dhaka', 'Mirpur'),
    ('Dhaka', 'Dhanmondi'),
    ('Dhaka', 'Gulshan'),
    ('Chittagong', 'Agrabad');

INSERT INTO hospitals (name, location_id, contact_phone, email) VALUES
    ('Dhaka Medical College Hospital', (SELECT location_id FROM locations WHERE area = 'Mirpur'), '02-9999001', 'contact@dmch.example'),
    ('Square Hospital', (SELECT location_id FROM locations WHERE area = 'Dhanmondi'), '02-9999002', 'contact@square.example');

INSERT INTO donors (full_name, email, phone, blood_group_id, location_id, date_of_birth, is_available, last_donation_date) VALUES
    ('Rafiq Islam', 'rafiq@example.com', '01710000001', (SELECT blood_group_id FROM blood_groups WHERE group_name = 'O+'), (SELECT location_id FROM locations WHERE area = 'Mirpur'), '1998-04-12', TRUE, NULL),
    ('Nusrat Jahan', 'nusrat@example.com', '01710000002', (SELECT blood_group_id FROM blood_groups WHERE group_name = 'O-'), (SELECT location_id FROM locations WHERE area = 'Mirpur'), '1995-11-02', TRUE, CURRENT_DATE - INTERVAL '120 days'),
    ('Kamal Hossain', 'kamal@example.com', '01710000003', (SELECT blood_group_id FROM blood_groups WHERE group_name = 'A+'), (SELECT location_id FROM locations WHERE area = 'Dhanmondi'), '1990-07-19', TRUE, CURRENT_DATE - INTERVAL '10 days'),
    ('Sadia Rahman', 'sadia@example.com', '01710000004', (SELECT blood_group_id FROM blood_groups WHERE group_name = 'B+'), (SELECT location_id FROM locations WHERE area = 'Gulshan'), '2000-01-30', TRUE, NULL),
    ('Tanvir Ahmed', 'tanvir@example.com', '01710000005', (SELECT blood_group_id FROM blood_groups WHERE group_name = 'AB+'), (SELECT location_id FROM locations WHERE area = 'Mirpur'), '1993-09-05', FALSE, NULL);
