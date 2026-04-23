const express = require("express");
const { query } = require("../config/db");
const { requireAuth, allowRoles } = require("../middleware/auth.middleware");
const { broadcastNotification } = require("../services/notification.service");

const router = express.Router();

router.use(requireAuth, allowRoles("admin"));

router.get("/dashboard", async (_req, res, next) => {
  try {
    const [totalDonors, totalPatients, activeRequests, livesSaved, bloodStock, donationTrends, mostNeeded] = await Promise.all([
      query("SELECT COUNT(*) AS count FROM donors"),
      query("SELECT COUNT(*) AS count FROM patients"),
      query("SELECT COUNT(*) AS count FROM requests WHERE status IN ('Pending', 'Accepted')"),
      query("SELECT COUNT(*) AS count FROM donations"),
      query(
      `SELECT blood_group, COUNT(*) AS donors_count
       FROM donors
       WHERE eligibility_status = 'Eligible'
       GROUP BY blood_group
       ORDER BY donors_count DESC`
      ),
      query(
      `SELECT DATE_FORMAT(donation_date, '%Y-%m') AS month_label, COUNT(*) AS total
       FROM donations
       GROUP BY DATE_FORMAT(donation_date, '%Y-%m')
       ORDER BY month_label DESC
       LIMIT 6`
      ),
      query(
      `SELECT blood_group, COUNT(*) AS total
       FROM requests
       GROUP BY blood_group
       ORDER BY total DESC
       LIMIT 5`
      )
    ]);

    res.json({
      success: true,
      summary: {
        totalDonors: totalDonors[0].count,
        totalPatients: totalPatients[0].count,
        activeRequests: activeRequests[0].count,
        livesSaved: livesSaved[0].count
      },
      bloodStock,
      donationTrends,
      mostNeeded
    });
  } catch (error) {
    next(error);
  }
});

router.get("/users", async (_req, res, next) => {
  try {
    const users = await query(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.created_at,
              d.blood_group, d.is_available, p.required_blood_group
       FROM users u
       LEFT JOIN donors d ON d.user_id = u.id
       LEFT JOIN patients p ON p.user_id = u.id
       ORDER BY u.created_at DESC`
    );
    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
});

router.get("/requests", async (_req, res, next) => {
  try {
    const requests = await query(
      `SELECT r.id, r.blood_group, r.units_needed, r.urgency, r.status, r.hospital_location, r.created_at,
              u.name AS patient_name
       FROM requests r
       JOIN patients p ON p.id = r.patient_id
       JOIN users u ON u.id = p.user_id
       ORDER BY r.created_at DESC`
    );
    res.json({ success: true, requests });
  } catch (error) {
    next(error);
  }
});

router.get("/analytics", async (_req, res, next) => {
  try {
    const analytics = await query(
      `SELECT blood_group,
              SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_requests,
              SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_requests
       FROM requests
       GROUP BY blood_group`
    );
    res.json({ success: true, analytics });
  } catch (error) {
    next(error);
  }
});

router.delete("/users/:id", async (req, res, next) => {
  try {
    await query("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "User deleted successfully." });
  } catch (error) {
    next(error);
  }
});

router.post("/notifications/broadcast", async (req, res, next) => {
  try {
    const users = await query("SELECT id FROM users WHERE role IN ('donor', 'patient')");
    await broadcastNotification(users.map((user) => user.id), req.body.message, "broadcast");
    res.json({ success: true, message: "Broadcast sent successfully." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
