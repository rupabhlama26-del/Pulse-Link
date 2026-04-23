const express = require("express");
const { query } = require("../config/db");
const { requireAuth, allowRoles } = require("../middleware/auth.middleware");
const { createNotification } = require("../services/notification.service");

const router = express.Router();

router.use(requireAuth, allowRoles("patient"));

router.get("/dashboard", async (req, res, next) => {
  try {
    const patientRows = await query(
      `SELECT p.*, u.name, u.email, u.phone
       FROM patients p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = ?`,
      [req.user.id]
    );
    const requests = await query(
      `SELECT id, blood_group, units_needed, urgency, status, hospital_location, created_at
       FROM requests
       WHERE patient_id = (SELECT id FROM patients WHERE user_id = ?)
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    const notifications = await query(
      "SELECT id, message, type, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 8",
      [req.user.id]
    );

    res.json({
      success: true,
      patient: patientRows[0],
      requests,
      notifications
    });
  } catch (error) {
    next(error);
  }
});

router.get("/search", async (req, res, next) => {
  try {
    const { bloodGroup } = req.query;
    const rows = await query(
      `SELECT u.id AS user_id, u.name, u.phone, d.blood_group, d.is_available, d.eligibility_status,
              d.last_donation_date, COALESCE(history.total_donations, 0) AS completed_donations
       FROM donors d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN (
         SELECT donor_id, COUNT(*) AS total_donations
         FROM donations
         GROUP BY donor_id
       ) history ON history.donor_id = d.user_id
       WHERE d.blood_group = ?
         AND d.eligibility_status = 'Eligible'
       ORDER BY d.is_available DESC, completed_donations DESC, u.name ASC`,
      [bloodGroup]
    );

    res.json({
      success: true,
      donors: rows
    });
  } catch (error) {
    next(error);
  }
});

router.post("/requests", async (req, res, next) => {
  try {
    const patientRows = await query("SELECT id FROM patients WHERE user_id = ?", [req.user.id]);
    const patient = patientRows[0];

    const result = await query(
      `INSERT INTO requests
       (patient_id, blood_group, units_needed, urgency, status, hospital_location, notes, emergency_mode)
       VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?)`,
      [
        patient.id,
        req.body.blood_group,
        req.body.units_needed,
        req.body.urgency,
        req.body.hospital_location,
        req.body.notes || "",
        req.body.emergency_mode ? 1 : 0
      ]
    );

    const matchingDonors = await query(
      `SELECT user_id
       FROM donors
       WHERE blood_group = ?
         AND is_available = 1
         AND eligibility_status = 'Eligible'`,
      [req.body.blood_group]
    );

    const label = req.body.emergency_mode ? "Emergency request" : "Blood request";
    await Promise.all(
      matchingDonors.map((donor) =>
        createNotification(
          donor.user_id,
          `${label}: ${req.body.blood_group} needed near ${req.body.hospital_location}.`,
          req.body.emergency_mode ? "emergency" : "request"
        )
      )
    );

    res.status(201).json({
      success: true,
      message: "Blood request created successfully.",
      requestId: result.insertId
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/requests/:id/status", async (req, res, next) => {
  try {
    await query("UPDATE requests SET status = ? WHERE id = ?", [req.body.status, req.params.id]);
    res.json({ success: true, message: "Request status updated." });
  } catch (error) {
    next(error);
  }
});

router.put("/profile", async (req, res, next) => {
  try {
    await query(
      `UPDATE patients
       SET required_blood_group = ?, address = ?, hospital_name = ?
      WHERE user_id = ?`,
      [
        req.body.required_blood_group || null,
        req.body.address || "",
        req.body.hospital_name || null,
        req.user.id
      ]
    );
    await query("UPDATE users SET name = ?, phone = ? WHERE id = ?", [req.body.name, req.body.phone, req.user.id]);
    res.json({ success: true, message: "Patient profile updated." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
