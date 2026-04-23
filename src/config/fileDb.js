const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../data");
const FILES = {
  users: "users.json",
  donors: "donors.json",
  patients: "patients.json",
  requests: "requests.json",
  donations: "donations.json",
  notifications: "notifications.json",
  chat_messages: "chat_messages.json"
};

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

function initializeFiles() {
  Object.values(FILES).forEach((filename) => {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    }
  });
}

function readCollection(filename) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function writeCollection(filename, records) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
}

function nextId(records) {
  if (!records.length) {
    return 1;
  }
  return Math.max(...records.map((record) => Number(record.id) || 0)) + 1;
}

function createRecord(filename, payload) {
  const records = readCollection(filename);
  const record = {
    id: nextId(records),
    ...payload,
    created_at: payload.created_at || nowIso()
  };
  records.push(record);
  writeCollection(filename, records);
  return record;
}

function updateRecord(filename, match, updates) {
  const records = readCollection(filename);
  const index = records.findIndex(match);
  if (index === -1) {
    return null;
  }

  records[index] = {
    ...records[index],
    ...updates
  };
  writeCollection(filename, records);
  return records[index];
}

function removeRecords(filename, match) {
  const records = readCollection(filename);
  const filtered = records.filter((record) => !match(record));
  writeCollection(filename, filtered);
  return records.length - filtered.length;
}

function sortByDateDesc(records, key = "created_at") {
  return [...records].sort((left, right) => new Date(right[key] || 0) - new Date(left[key] || 0));
}

function getAllUsers() {
  return readCollection(FILES.users);
}

function getUserById(id) {
  return getAllUsers().find((user) => Number(user.id) === Number(id)) || null;
}

function getUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  return getAllUsers().find((user) => normalizeEmail(user.email) === normalizedEmail) || null;
}

function createUser(userData) {
  return createRecord(FILES.users, {
    ...userData,
    email: normalizeEmail(userData.email)
  });
}

function updateUser(id, updates) {
  const nextUpdates = { ...updates };
  if (nextUpdates.email !== undefined) {
    nextUpdates.email = normalizeEmail(nextUpdates.email);
  }
  return updateRecord(FILES.users, (user) => Number(user.id) === Number(id), nextUpdates);
}

function getAllDonors() {
  return readCollection(FILES.donors);
}

function getDonorByUserId(userId) {
  return getAllDonors().find((donor) => Number(donor.user_id) === Number(userId)) || null;
}

function createDonor(donorData) {
  return createRecord(FILES.donors, donorData);
}

function updateDonorByUserId(userId, updates) {
  return updateRecord(FILES.donors, (donor) => Number(donor.user_id) === Number(userId), updates);
}

function getAllPatients() {
  return readCollection(FILES.patients);
}

function getPatientById(id) {
  return getAllPatients().find((patient) => Number(patient.id) === Number(id)) || null;
}

function getPatientByUserId(userId) {
  return getAllPatients().find((patient) => Number(patient.user_id) === Number(userId)) || null;
}

function createPatient(patientData) {
  return createRecord(FILES.patients, patientData);
}

function updatePatientByUserId(userId, updates) {
  return updateRecord(FILES.patients, (patient) => Number(patient.user_id) === Number(userId), updates);
}

function getAllRequests() {
  return readCollection(FILES.requests);
}

function getRequestById(id) {
  return getAllRequests().find((request) => Number(request.id) === Number(id)) || null;
}

function createRequest(requestData) {
  return createRecord(FILES.requests, requestData);
}

function updateRequest(id, updates) {
  return updateRecord(FILES.requests, (request) => Number(request.id) === Number(id), updates);
}

function getAllDonations() {
  return readCollection(FILES.donations);
}

function getDonationsByDonorId(donorId) {
  return getAllDonations().filter((donation) => Number(donation.donor_id) === Number(donorId));
}

function createDonation(donationData) {
  return createRecord(FILES.donations, donationData);
}

function getAllNotifications() {
  return readCollection(FILES.notifications);
}

function getNotificationsByUserId(userId) {
  return sortByDateDesc(
    getAllNotifications().filter((notification) => Number(notification.user_id) === Number(userId))
  );
}

function createNotification(notificationData) {
  return createRecord(FILES.notifications, {
    is_read: 0,
    ...notificationData
  });
}

function markNotificationRead(notificationId, userId) {
  return updateRecord(
    FILES.notifications,
    (notification) =>
      Number(notification.id) === Number(notificationId) &&
      Number(notification.user_id) === Number(userId),
    { is_read: 1 }
  );
}

function getAllChatMessages() {
  return readCollection(FILES.chat_messages);
}

function getChatMessagesByRequestId(requestId) {
  return [...getAllChatMessages()]
    .filter((message) => Number(message.request_id) === Number(requestId))
    .sort((left, right) => new Date(left.created_at || 0) - new Date(right.created_at || 0));
}

function createChatMessage(messageData) {
  return createRecord(FILES.chat_messages, messageData);
}

function deleteUserCascade(userId) {
  const numericUserId = Number(userId);
  const patientRecords = getAllPatients().filter((patient) => Number(patient.user_id) === numericUserId);
  const patientIds = new Set(patientRecords.map((patient) => Number(patient.id)));
  const requestIds = new Set(
    getAllRequests()
      .filter((request) => patientIds.has(Number(request.patient_id)))
      .map((request) => Number(request.id))
  );

  removeRecords(FILES.users, (user) => Number(user.id) === numericUserId);
  removeRecords(FILES.donors, (donor) => Number(donor.user_id) === numericUserId);
  removeRecords(FILES.patients, (patient) => Number(patient.user_id) === numericUserId);
  removeRecords(FILES.requests, (request) => patientIds.has(Number(request.patient_id)));
  removeRecords(FILES.donations, (donation) => Number(donation.donor_id) === numericUserId);
  removeRecords(FILES.notifications, (notification) => Number(notification.user_id) === numericUserId);
  removeRecords(
    FILES.chat_messages,
    (message) => Number(message.sender_id) === numericUserId || requestIds.has(Number(message.request_id))
  );
}

function ensureDemoUsers() {
  const users = getAllUsers();
  const defaultUsers = [
    {
      name: "Admin User",
      email: "admin@example.com",
      password: "password123",
      role: "admin",
      phone: "1234567890"
    },
    {
      name: "Rupabh",
      email: "rupabh@pulselink.com",
      password: "password123",
      role: "admin",
      phone: "9000000000"
    },
    {
      name: "John Donor",
      email: "donor@example.com",
      password: "password123",
      role: "donor",
      phone: "9876543210"
    },
    {
      name: "Jane Patient",
      email: "patient@example.com",
      password: "password123",
      role: "patient",
      phone: "5551234567"
    }
  ];

  let changed = false;
  defaultUsers.forEach((defaultUser) => {
    const existingIndex = users.findIndex(
      (user) => normalizeEmail(user.email) === normalizeEmail(defaultUser.email)
    );

    if (existingIndex === -1) {
      users.push({
        id: nextId(users),
        ...defaultUser,
        email: normalizeEmail(defaultUser.email),
        created_at: nowIso()
      });
      changed = true;
      return;
    }

    users[existingIndex] = {
      ...users[existingIndex],
      ...defaultUser,
      email: normalizeEmail(defaultUser.email),
      created_at: users[existingIndex].created_at || nowIso()
    };
    changed = true;
  });

  if (changed) {
    writeCollection(FILES.users, users);
  }
}

function ensureDemoProfiles() {
  const donorUser = getUserByEmail("donor@example.com");
  const patientUser = getUserByEmail("patient@example.com");

  if (donorUser && !getDonorByUserId(donorUser.id)) {
    createDonor({
      user_id: donorUser.id,
      blood_group: "O+",
      age: 28,
      weight: 75.5,
      health_conditions: "",
      last_donation_date: "2026-01-10",
      eligibility_status: "Eligible",
      next_eligible_date: "2026-04-10",
      address: "123 Main St, City",
      is_available: 1
    });
  }

  if (patientUser && !getPatientByUserId(patientUser.id)) {
    createPatient({
      user_id: patientUser.id,
      required_blood_group: "O+",
      address: "456 Hospital Ave, City",
      hospital_name: "Central Hospital"
    });
  }
}

function ensureDemoActivity() {
  const donorUser = getUserByEmail("donor@example.com");
  const patient = getPatientByUserId(getUserByEmail("patient@example.com")?.id);

  if (donorUser && getAllDonations().length === 0) {
    createDonation({
      donor_id: donorUser.id,
      donation_date: "2026-01-10",
      donation_location: "PulseLink Community Camp"
    });
  }

  if (patient && getAllRequests().length === 0) {
    createRequest({
      patient_id: patient.id,
      blood_group: "O+",
      units_needed: 2,
      urgency: "High",
      status: "Pending",
      hospital_location: "Central Hospital",
      notes: "Sample request for local dashboard testing.",
      emergency_mode: 1
    });
  }
}

function initializeData() {
  initializeFiles();
  ensureDemoUsers();
  ensureDemoProfiles();
  ensureDemoActivity();
}

initializeData();

module.exports = {
  DATA_DIR,
  getAllUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  getAllDonors,
  getDonorByUserId,
  createDonor,
  updateDonorByUserId,
  getAllPatients,
  getPatientById,
  getPatientByUserId,
  createPatient,
  updatePatientByUserId,
  getAllRequests,
  getRequestById,
  createRequest,
  updateRequest,
  getAllDonations,
  getDonationsByDonorId,
  createDonation,
  getAllNotifications,
  getNotificationsByUserId,
  createNotification,
  markNotificationRead,
  getAllChatMessages,
  getChatMessagesByRequestId,
  createChatMessage,
  deleteUserCascade,
  initializeData
};
