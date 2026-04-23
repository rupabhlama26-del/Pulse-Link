const bcrypt = require("bcryptjs");
const { query, pool } = require("../config/db");
const { calculateEligibility } = require("../utils/eligibility");

function normalizeNullable(value) {
  return value === undefined || value === null || value === "" ? null : value;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
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

async function createUser(payload) {
  validateRegistration(payload);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const hashedPassword = await bcrypt.hash(payload.password, 10);
    const [userResult] = await connection.execute(
      "INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)",
      [payload.name, payload.email, hashedPassword, payload.role, payload.phone]
    );

    const userId = userResult.insertId;

    if (payload.role === "donor") {
      const donorDetails = {
        age: payload.age,
        weight: payload.weight,
        health_conditions: payload.health_conditions || "",
        last_donation_date: payload.last_donation_date || null
      };
      const eligibility = calculateEligibility(donorDetails);

      await connection.execute(
        `INSERT INTO donors
        (user_id, blood_group, age, weight, health_conditions, last_donation_date, eligibility_status, next_eligible_date, address, is_available)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          payload.blood_group,
          Number(payload.age),
          Number(payload.weight),
          payload.health_conditions || "",
          normalizeNullable(payload.last_donation_date),
          eligibility.eligible ? "Eligible" : "Not Eligible",
          normalizeNullable(eligibility.nextEligibleDate),
          payload.address || "",
          1
        ]
      );
    }

    if (payload.role === "patient") {
      await connection.execute(
        "INSERT INTO patients (user_id, required_blood_group, address, hospital_name) VALUES (?, ?, ?, ?)",
        [
          userId,
          normalizeNullable(payload.required_blood_group),
          payload.address || "",
          normalizeNullable(payload.hospital_name)
        ]
      );
    }

    await connection.commit();
    return userId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function loginUser(email, password) {
  if (!email || !password) {
    throw Object.assign(new Error("Email and password are required."), { status: 400 });
  }

  if (!isValidEmail(email)) {
    throw Object.assign(new Error("Please enter a valid email address."), { status: 400 });
  }

  const rows = await query("SELECT id, name, email, password, role FROM users WHERE email = ?", [email]);
  const user = rows[0];

  if (!user) {
    throw Object.assign(new Error("No account found with this email address."), { status: 404 });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw Object.assign(new Error("Incorrect password. Please try again."), { status: 401 });
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
