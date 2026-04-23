require("dotenv").config();

const fileDb = require("../src/config/fileDb");
const { calculateEligibility } = require("../src/utils/eligibility");

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const urgencies = ["Low", "Medium", "High", "Critical"];
const requestStatuses = ["Pending", "Accepted", "Completed"];

function pickBloodGroup(index) {
  return bloodGroups[index % bloodGroups.length];
}

function createDemoDonor(index) {
  const email = `donor${index}@pulselink.com`;
  if (fileDb.getUserByEmail(email)) {
    return;
  }

  const age = 21 + (index % 18);
  const weight = 52 + (index % 20);
  const lastDonationDate = new Date(2026, index % 3, 5 + (index % 20)).toISOString().slice(0, 10);
  const eligibility = calculateEligibility({
    age,
    weight,
    health_conditions: "",
    last_donation_date: lastDonationDate
  });

  const user = fileDb.createUser({
    name: `Donor ${index}`,
    email,
    password: "password123",
    role: "donor",
    phone: `98${String(index).padStart(8, "0")}`
  });

  fileDb.createDonor({
    user_id: user.id,
    blood_group: pickBloodGroup(index),
    age,
    weight,
    health_conditions: "",
    last_donation_date: lastDonationDate,
    eligibility_status: eligibility.eligible ? "Eligible" : "Not Eligible",
    next_eligible_date: eligibility.nextEligibleDate,
    address: `Sector ${index}, Demo City`,
    is_available: index % 5 === 0 ? 0 : 1
  });

  if (index <= 8) {
    fileDb.createDonation({
      donor_id: user.id,
      donation_date: lastDonationDate,
      donation_location: "PulseLink Blood Drive"
    });
  }
}

function createDemoPatient(index) {
  const email = `patient${index}@pulselink.com`;
  if (fileDb.getUserByEmail(email)) {
    return;
  }

  const user = fileDb.createUser({
    name: `Patient ${index}`,
    email,
    password: "password123",
    role: "patient",
    phone: `97${String(index).padStart(8, "0")}`
  });

  const patient = fileDb.createPatient({
    user_id: user.id,
    required_blood_group: pickBloodGroup(index + 3),
    address: `Block ${index}, Demo City`,
    hospital_name: `Hospital ${index}`
  });

  if (index <= 8) {
    fileDb.createRequest({
      patient_id: patient.id,
      blood_group: patient.required_blood_group,
      units_needed: 1 + (index % 3),
      urgency: urgencies[index % urgencies.length],
      status: requestStatuses[index % requestStatuses.length],
      hospital_location: patient.hospital_name,
      notes: `Demo request ${index} for dashboard testing.`,
      emergency_mode: index % 4 === 0 ? 1 : 0
    });
  }
}

function main() {
  fileDb.initializeData();

  for (let index = 1; index <= 12; index += 1) {
    createDemoDonor(index);
    createDemoPatient(index);
  }

  const summary = {
    donors: fileDb.getAllDonors().length,
    patients: fileDb.getAllPatients().length,
    requests: fileDb.getAllRequests().length,
    donations: fileDb.getAllDonations().length
  };

  console.log("Seeded local JSON demo data:");
  console.log(JSON.stringify(summary, null, 2));
}

main();
