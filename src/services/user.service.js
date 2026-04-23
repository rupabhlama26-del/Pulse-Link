const bcrypt = require("bcryptjs");
const { calculateEligibility } = require("../utils/eligibility");
const fileDb = require("../config/fileDb");

function normalizeNullable(value) {
  return value === undefined || value === null || value === "" ? null : value;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function validateRegistration(payload) {
  if (!payload.name || !payload.email || !payload.password || !payload.role || !payload.phone) {
    throw Object.assign(new Error("Please fill in all required fields."), { status: 400 });
  }

  if (!isValidEmail(payload.email)) {
    throw Object.assign(new Error("Please enter a valid email address."), { status: 400 });
  }

  if (String(payload.password).length < 6) {
    throw Object.assign(new Error("Password must be at least 6 characters long."), { status: 400 });
  }

  if (!payload.address) {
    throw Object.assign(new Error("Address is required."), { status: 400 });
  }

  if (payload.role === "donor") {
    if (!payload.blood_group || normalizeNullable(payload.age) === null || normalizeNullable(payload.weight) === null) {
      throw Object.assign(new Error("Donor age, weight, and blood group are required."), { status: 400 });
    }
  }
}

async function comparePassword(inputPassword, storedPassword) {
  if (!storedPassword) {
    return false;
  }

  if (String(storedPassword) === String(inputPassword)) {
    return true;
  }

  if (!String(storedPassword).startsWith("$2")) {
    return false;
  }

  try {
    return await bcrypt.compare(String(inputPassword), String(storedPassword));
  } catch (_error) {
    return false;
  }
}

async function createUser(payload) {
  validateRegistration(payload);

  const normalizedEmail = normalizeEmail(payload.email);
  if (fileDb.getUserByEmail(normalizedEmail)) {
    const error = new Error("Email already exists.");
    error.code = "ER_DUP_ENTRY";
    error.status = 409;
    throw error;
  }

  const user = fileDb.createUser({
    name: payload.name,
    email: normalizedEmail,
    password: String(payload.password),
    role: payload.role,
    phone: payload.phone
  });

  if (payload.role === "donor") {
    const donorDetails = {
      age: payload.age,
      weight: payload.weight,
      health_conditions: payload.health_conditions || "",
      last_donation_date: payload.last_donation_date || null
    };
    const eligibility = calculateEligibility(donorDetails);

    fileDb.createDonor({
      user_id: user.id,
      blood_group: payload.blood_group,
      age: Number(payload.age),
      weight: Number(payload.weight),
      health_conditions: payload.health_conditions || "",
      last_donation_date: normalizeNullable(payload.last_donation_date),
      eligibility_status: eligibility.eligible ? "Eligible" : "Not Eligible",
      next_eligible_date: normalizeNullable(eligibility.nextEligibleDate),
      address: payload.address || "",
      is_available: 1
    });
  }

  if (payload.role === "patient") {
    fileDb.createPatient({
      user_id: user.id,
      required_blood_group: normalizeNullable(payload.required_blood_group),
      address: payload.address || "",
      hospital_name: normalizeNullable(payload.hospital_name)
    });
  }

  return user.id;
}

async function loginUser(email, password, role) {
  if (!email || !password) {
    throw Object.assign(new Error("Email and password are required."), { status: 400 });
  }

  if (!isValidEmail(email)) {
    throw Object.assign(new Error("Please enter a valid email address."), { status: 400 });
  }

  const normalizedEmail = normalizeEmail(email);
  const user = fileDb.getUserByEmail(normalizedEmail);

  if (!user) {
    throw Object.assign(new Error("Role, email, or password does not match."), { status: 401 });
  }

  if (role && user.role !== role) {
    throw Object.assign(new Error("Role, email, or password does not match."), { status: 401 });
  }

  const isValidPassword = await comparePassword(password, user.password);
  if (!isValidPassword) {
    throw Object.assign(new Error("Role, email, or password does not match."), { status: 401 });
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
}

module.exports = {
  createUser,
  loginUser
};
