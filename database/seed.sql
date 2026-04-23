USE blood_bank_db;

INSERT INTO users (name, email, password, role, phone) VALUES
('Admin User', 'admin@pulselink.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', '9999999999'),
('Riya Sharma', 'riya@pulselink.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'donor', '9876543210'),
('Aman Verma', 'aman@pulselink.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'patient', '9123456780');

INSERT INTO donors (user_id, blood_group, age, weight, health_conditions, last_donation_date, eligibility_status, next_eligible_date, address, is_available) VALUES
(2, 'O+', 24, 58, '', '2026-01-01', 'Eligible', '2026-04-01', 'Connaught Place, New Delhi', 1);

INSERT INTO patients (user_id, required_blood_group, address, hospital_name) VALUES
(3, 'O+', 'New Delhi', 'City Care Hospital');

INSERT INTO requests (patient_id, blood_group, units_needed, urgency, status, hospital_location, notes, emergency_mode) VALUES
(1, 'O+', 2, 'High', 'Pending', 'City Care Hospital, New Delhi', 'Urgent surgery requirement', 1);

INSERT INTO donations (donor_id, donation_date, donation_location) VALUES
(2, '2026-01-01', 'Red Cross Camp, Delhi');
