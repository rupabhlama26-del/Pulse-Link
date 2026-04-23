const express = require("express");
const fileDb = require("../config/fileDb");
const { requireAuth, allowRoles } = require("../middleware/auth.middleware");
const { broadcastNotification } = require("../services/notification.service");

const router = express.Router();

function monthLabel(value) {
  if (!value) {
    return "Unknown";
  }
  return String(value).slice(0, 7);
}

router.use(requireAuth, allowRoles("admin"));

router.get("/dashboard", async (_req, res, next) => {
  try {
    const donors = fileDb.getAllDonors();
    const patients = fileDb.getAllPatients();
    const requests = fileDb.getAllRequests();
    const donations = fileDb.getAllDonations();

    const bloodStock = Object.entries(
      donors
        .filter((donor) => donor.eligibility_status === "Eligible")
        .reduce((result, donor) => {
          result[donor.blood_group] = (result[donor.blood_group] || 0) + 1;
          return result;
        }, {})
    )
      .map(([blood_group, donors_count]) => ({ blood_group, donors_count }))
      .sort((left, right) => right.donors_count - left.donors_count);

    const donationTrends = Object.entries(
      donations.reduce((result, donation) => {
        const key = monthLabel(donation.donation_date);
        result[key] = (result[key] || 0) + 1;
        return result;
      }, {})
    )
      .map(([month_label, total]) => ({ month_label, total }))
      .sort((left, right) => right.month_label.localeCompare(left.month_label))
      .slice(0, 6);

    const mostNeeded = Object.entries(
      requests.reduce((result, request) => {
        result[request.blood_group] = (result[request.blood_group] || 0) + 1;
        return result;
      }, {})
    )
      .map(([blood_group, total]) => ({ blood_group, total }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 5);

    res.json({
      success: true,
      summary: {
        totalDonors: donors.length,
        totalPatients: patients.length,
        activeRequests: requests.filter((request) => ["Pending", "Accepted"].includes(request.status)).length,
        livesSaved: donations.length
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
    const users = fileDb
      .getAllUsers()
      .map((user) => {
        const donor = fileDb.getDonorByUserId(user.id);
        const patient = fileDb.getPatientByUserId(user.id);
        return {
          ...user,
          blood_group: donor?.blood_group || null,
          is_available: donor?.is_available ?? null,
          required_blood_group: patient?.required_blood_group || null
        };
      })
      .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0));

    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
});

router.get("/requests", async (_req, res, next) => {
  try {
    const requests = fileDb
      .getAllRequests()
      .map((request) => {
        const patient = fileDb.getPatientById(request.patient_id);
        const user = patient ? fileDb.getUserById(patient.user_id) : null;
        return {
          ...request,
          patient_name: user?.name || "Patient"
        };
      })
      .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0));

    res.json({ success: true, requests });
  } catch (error) {
    next(error);
  }
});

router.get("/analytics", async (_req, res, next) => {
  try {
    const analyticsMap = fileDb.getAllRequests().reduce((result, request) => {
      if (!result[request.blood_group]) {
        result[request.blood_group] = {
          blood_group: request.blood_group,
          completed_requests: 0,
          pending_requests: 0
        };
      }

      if (request.status === "Completed") {
        result[request.blood_group].completed_requests += 1;
      }

      if (request.status === "Pending") {
        result[request.blood_group].pending_requests += 1;
      }

      return result;
    }, {});

    res.json({
      success: true,
      analytics: Object.values(analyticsMap)
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/users/:id", async (req, res, next) => {
  try {
    fileDb.deleteUserCascade(req.params.id);
    res.json({ success: true, message: "User deleted successfully." });
  } catch (error) {
    next(error);
  }
});

router.post("/notifications/broadcast", async (req, res, next) => {
  try {
    const users = fileDb
      .getAllUsers()
      .filter((user) => ["donor", "patient"].includes(user.role))
      .map((user) => user.id);

    await broadcastNotification(users, req.body.message, "broadcast");
    res.json({ success: true, message: "Broadcast sent successfully." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
