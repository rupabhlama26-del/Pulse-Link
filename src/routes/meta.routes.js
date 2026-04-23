const express = require("express");
const fileDb = require("../config/fileDb");

const router = express.Router();

router.get("/stats", async (_req, res, next) => {
  try {
    const activeRequests = fileDb
      .getAllRequests()
      .filter((request) => ["Pending", "Accepted"].includes(request.status)).length;

    res.json({
      success: true,
      stats: {
        totalDonors: fileDb.getAllDonors().length,
        totalPatients: fileDb.getAllPatients().length,
        activeRequests,
        livesSaved: fileDb.getAllDonations().length
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/blood-availability", async (_req, res, next) => {
  try {
    const availabilityMap = fileDb
      .getAllDonors()
      .filter((donor) => Number(donor.is_available) === 1 && donor.eligibility_status === "Eligible")
      .reduce((result, donor) => {
        result[donor.blood_group] = (result[donor.blood_group] || 0) + 1;
        return result;
      }, {});

    const availability = Object.entries(availabilityMap)
      .map(([blood_group, available_count]) => ({ blood_group, available_count }))
      .sort((left, right) => right.available_count - left.available_count);

    res.json({ success: true, availability });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
