const express = require("express");
const { query } = require("../config/db");
const { requireAuth, allowRoles } = require("../middleware/auth.middleware");
const { calculateEligibility } = require("../utils/eligibility");

const router = express.Router();

router.use(requireAuth, allowRoles("donor"));

router.get("/dashboard", async (req, res, next) => {
  try {
    const donors = await query(
      `SELECT u.name, u.email, u.phone, d.*
       FROM donors d
       JOIN users u ON u.id = d.user_id
       WHERE d.user_id = ?`,
      [req.user.id]
    );
    const donor = donors[0];
    const eligibility = calculateEligibility(donor);
    const matchingRequests = await query(
      `SELECT r.id, r.blood_group, r.units_needed, r.urgency, r.status, r.hospital_location,
              u.name AS patient_name, r.created_at
       FROM requests r
       JOIN patients p ON p.id = r.patient_id
       JOIN users u ON u.id = p.user_id
       WHERE r.status IN ('Pending', 'Accepted')
         AND r.blood_group = ?
       ORDER BY FIELD(r.urgency, 'Critical', 'High', 'Medium', 'Low'), r.created_at DESC`,
      [donor.blood_group]
    );
    const donationHistory = await query(
      "SELECT donation_date, donation_location FROM donations WHERE donor_id = ? ORDER BY donation_date DESC",
      [req.user.id]
    );
    const notifications = await query(
      "SELECT id, message, type, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 8",
      [req.user.id]
    );

    await query(
      "UPDATE donors SET eligibility_status = ?, next_eligible_date = ? WHERE user_id = ?",
      [eligibility.eligible ? "Eligible" : "Not Eligible", eligibility.nextEligibleDate, req.user.id]
    );

    res.json({
      success: true,
      donor: {
        ...donor,
        eligibility_status: eligibility.eligible ? "Eligible" : "Not Eligible",
        eligibility_message: eligibility.reason,
        next_eligible_date: eligibility.nextEligibleDate
      },
      nearbyRequests: matchingRequests,
      donationHistory,
      notifications
    });
  } catch (error) {
    next(error);
  }
});

router.put("/profile", async (req, res, next) => {
  try {
    const eligibility = calculateEligibility(req.body);
    await query(
      `UPDATE donors
       SET blood_group = ?, age = ?, weight = ?, health_conditions = ?, last_donation_date = ?,
           address = ?, eligibility_status = ?, next_eligible_date = ?
       WHERE user_id = ?`,
      [
        req.body.blood_group,
        req.body.age,
        req.body.weight,
        req.body.health_conditions || "",
        req.body.last_donation_date || null,
        req.body.address || "",
        eligibility.eligible ? "Eligible" : "Not Eligible",
        eligibility.nextEligibleDate,
        req.user.id
      ]
    );
    await query("UPDATE users SET name = ?, phone = ? WHERE id = ?", [req.body.name, req.body.phone, req.user.id]);

    res.json({
      success: true,
      message: "Donor profile updated successfully.",
      eligibility
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/availability", async (req, res, next) => {
  try {
    await query("UPDATE donors SET is_available = ? WHERE user_id = ?", [req.body.is_available ? 1 : 0, req.user.id]);
    res.json({ success: true, message: "Availability updated." });
  } catch (error) {
    next(error);
  }
});

router.post("/history", async (req, res, next) => {
  try {
    await query(
      "INSERT INTO donations (donor_id, donation_date, donation_location) VALUES (?, ?, ?)",
      [req.user.id, req.body.donation_date, req.body.donation_location]
    );
    await query(
      "UPDATE donors SET last_donation_date = ? WHERE user_id = ?",
      [req.body.donation_date, req.user.id]
    );
    res.status(201).json({ success: true, message: "Donation history added." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
