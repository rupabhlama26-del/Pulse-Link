require("dotenv").config();

const bcrypt = require("bcryptjs");
const { pool } = require("../src/config/db");
const { calculateEligibility } = require("../src/utils/eligibility");

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const urgencies = ["Low", "Medium", "High", "Critical"];
const requestStatuses = ["Pending", "Accepted", "Completed"];

function pickBloodGroup(index) {
  return bloodGroups[index % bloodGroups.length];
}

async function ensureAdmin(connection) {
  const [existing] = await connection.execute(
    "SELECT id FROM users WHERE role = 'admin' AND email = ? LIMIT 1",
    ["rupabh@pulselink.com"]
  );

  if (existing.length) {
    await connection.execute(
      "UPDATE users SET name = ? WHERE id = ?",
      ["Rupabh", existing[0].id]
    );
    return;
  }

  const hashedPassword = await bcrypt.hash("password", 10);
  await connection.execute(
    "INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, 'admin', ?)",
    ["Rupabh", "rupabh@pulselink.com", hashedPassword, "9000000000"]
  );
}

async function createDonor(connection, index) {
  const email = `donor${index}@pulselink.com`;
  const [existing] = await connection.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  if (existing.length) {
    return;
  }

  const hashedPassword = await bcrypt.hash("password", 10);
  const age = 21 + (index % 18);
  const weight = 52 + (index % 20);
  const lastDonationDate = new Date(2026, (index % 6), 1 + (index % 20));
  const donorDetails = {
    age,
    weight,
    health_conditions: "",
    last_donation_date: lastDonationDate.toISOString().slice(0, 10)
  };
  const eligibility = calculateEligibility(donorDetails);

  const [userResult] = await connection.execute(
    "INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, 'donor', ?)",
    [`Donor ${index}`, email, hashedPassword, `98${String(index).padStart(8, "0")}`]
  );

  await connection.execute(
    `INSERT INTO donors
    (user_id, blood_group, age, weight, health_conditions, last_donation_date, eligibility_status, next_eligible_date, address, is_available)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userResult.insertId,
      pickBloodGroup(index),
      age,
      weight,
      "",
      donorDetails.last_donation_date,
      eligibility.eligible ? "Eligible" : "Not Eligible",
      eligibility.nextEligibleDate,
      `Sector ${index}, Demo City`,
      index % 5 === 0 ? 0 : 1
    ]
  );
}

async function createPatient(connection, index) {
  const email = `patient${index}@pulselink.com`;
  const [existing] = await connection.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  if (existing.length) {
    return;
  }

  const hashedPassword = await bcrypt.hash("password", 10);
  const [userResult] = await connection.execute(
    "INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, 'patient', ?)",
    [`Patient ${index}`, email, hashedPassword, `97${String(index).padStart(8, "0")}`]
  );

  await connection.execute(
    "INSERT INTO patients (user_id, required_blood_group, address, hospital_name) VALUES (?, ?, ?, ?)",
    [
      userResult.insertId,
      pickBloodGroup(index + 3),
      `Block ${index}, Demo City`,
      `Hospital ${index}`
    ]
  );
}

async function seedDonations(connection) {
  const [donors] = await connection.execute("SELECT user_id FROM donors ORDER BY user_id ASC");

  for (let index = 0; index < donors.length; index += 1) {
    const donationCount = index < 12 ? 2 : index < 24 ? 1 : 0;

    for (let donationIndex = 0; donationIndex < donationCount; donationIndex += 1) {
      const donationDate = new Date(2026, (index + donationIndex) % 6, 5 + ((index + donationIndex) % 20))
        .toISOString()
        .slice(0, 10);
      const locationLabel = donationIndex === 0 ? "PulseLink Blood Drive" : "City Hospital Camp";

      await connection.execute(
        `INSERT INTO donations (donor_id, donation_date, donation_location)
         SELECT ?, ?, ?
         FROM DUAL
         WHERE NOT EXISTS (
           SELECT 1 FROM donations
           WHERE donor_id = ? AND donation_date = ? AND donation_location = ?
         )`,
        [donors[index].user_id, donationDate, locationLabel, donors[index].user_id, donationDate, locationLabel]
      );
    }
  }
}

async function seedRequests(connection) {
  const [patients] = await connection.execute(
    "SELECT id, required_blood_group, hospital_name, address FROM patients ORDER BY id ASC LIMIT 18"
  );

  for (let index = 0; index < patients.length; index += 1) {
    const patient = patients[index];
    const bloodGroup = patient.required_blood_group || pickBloodGroup(index);
    const hospitalLocation = patient.hospital_name || patient.address || `Hospital ${index + 1}`;

    await connection.execute(
      `INSERT INTO requests (patient_id, blood_group, units_needed, urgency, status, hospital_location, notes, emergency_mode)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?
       FROM DUAL
       WHERE NOT EXISTS (
         SELECT 1 FROM requests
         WHERE patient_id = ? AND blood_group = ? AND hospital_location = ?
       )`,
      [
        patient.id,
        bloodGroup,
        1 + (index % 3),
        urgencies[index % urgencies.length],
        requestStatuses[index % requestStatuses.length],
        hospitalLocation,
        `Demo request ${index + 1} for dashboard testing.`,
        index % 4 === 0 ? 1 : 0,
        patient.id,
        bloodGroup,
        hospitalLocation
      ]
    );
  }
}

async function main() {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await ensureAdmin(connection);

    for (let index = 1; index <= 50; index += 1) {
      await createDonor(connection, index);
      await createPatient(connection, index);
    }

    await seedDonations(connection);
    await seedRequests(connection);

    await connection.commit();

    const [summary] = await connection.execute(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE role = 'donor') AS donors,
         (SELECT COUNT(*) FROM users WHERE role = 'patient') AS patients,
         (SELECT COUNT(*) FROM requests) AS requests,
         (SELECT COUNT(*) FROM donations) AS donations`
    );
    console.log(JSON.stringify(summary[0], null, 2));
  } catch (error) {
    await connection.rollback();
    console.error(error);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

main();
