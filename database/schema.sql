CREATE DATABASE IF NOT EXISTS blood_bank_db;
USE blood_bank_db;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('donor', 'patient', 'admin') NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS donors (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  age INT NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  health_conditions TEXT,
  last_donation_date DATE NULL,
  eligibility_status ENUM('Eligible', 'Not Eligible') DEFAULT 'Eligible',
  next_eligible_date DATE NULL,
  address VARCHAR(255),
  is_available TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_donor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS patients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  required_blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NULL,
  address VARCHAR(255),
  hospital_name VARCHAR(120),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_patient_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patient_id INT NOT NULL,
  blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  units_needed INT NOT NULL,
  urgency ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL,
  status ENUM('Pending', 'Accepted', 'Completed', 'Cancelled') DEFAULT 'Pending',
  hospital_location VARCHAR(255) NOT NULL,
  notes TEXT,
  emergency_mode TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_request_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS donations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  donor_id INT NOT NULL,
  donation_date DATE NOT NULL,
  donation_location VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_donation_user FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(30) DEFAULT 'info',
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  request_id INT NOT NULL,
  sender_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_request FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);
