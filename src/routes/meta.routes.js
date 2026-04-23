const express = require("express");
const { query } = require("../config/db");

const router = express.Router();

router.get("/stats", async (_req, res, next) => {
  try {
    const [donors, patients, activeRequests, livesSaved] = await Promise.all([
      query("SELECT COUNT(*) AS totalDonors FROM donors"),
      query("SELECT COUNT(*) AS totalPatients FROM patients"),
      query("SELECT COUNT(*) AS activeRequests FROM requests WHERE status IN ('Pending', 'Accepted')"),
      query("SELECT COUNT(*) AS livesSaved FROM donations")
    ]);

    res.json({
      success: true,
      stats: {
        totalDonors: donors[0].totalDonors,
        totalPatients: patients[0].totalPatients,
        activeRequests: activeRequests[0].activeRequests,
        livesSaved: livesSaved[0].livesSaved
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/blood-availability", async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT blood_group, COUNT(*) AS available_count
       FROM donors
       WHERE is_available = 1 AND eligibility_status = 'Eligible'
       GROUP BY blood_group
       ORDER BY available_count DESC`
    );

    res.json({ success: true, availability: rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
