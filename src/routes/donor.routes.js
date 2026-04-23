const express = require("express");
const fileDb = require("../config/fileDb");
const { requireAuth, allowRoles } = require("../middleware/auth.middleware");
const { calculateEligibility } = require("../utils/eligibility");

const router = express.Router();

const urgencyRank = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1
};

router.use(requireAuth, allowRoles("donor"));

router.get("/dashboard", async (req, res, next) => {
  try {
    const donorRecord = fileDb.getDonorByUserId(req.user.id);
    if (!donorRecord) {
      throw Object.assign(new Error("Donor profile not found."), { status: 404 });
    }

    const donor = {
      ...donorRecord,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone
    };

    const eligibility = calculateEligibility(donor);
    fileDb.updateDonorByUserId(req.user.id, {
      eligibility_status: eligibility.eligible ? "Eligible" : "Not Eligible",
      next_eligible_date: eligibility.nextEligibleDate
    });

    const nearbyRequests = fileDb
      .getAllRequests()
      .filter(
        (request) =>
          ["Pending", "Accepted"].includes(request.status) &&
          request.blood_group === donor.blood_group
      )
      .map((request) => {
        const patient = fileDb.getPatientById(request.patient_id);
        const patientUser = patient ? fileDb.getUserById(patient.user_id) : null;
        return {
          ...request,
          patient_name: patientUser?.name || "Patient"
        };
      })
      .sort((left, right) => {
        const urgencyDiff = (urgencyRank[right.urgency] || 0) - (urgencyRank[left.urgency] || 0);
        if (urgencyDiff !== 0) {
          return urgencyDiff;
        }
        return new Date(right.created_at || 0) - new Date(left.created_at || 0);
      });

    const donationHistory = fileDb
      .getDonationsByDonorId(req.user.id)
      .sort((left, right) => new Date(right.donation_date || 0) - new Date(left.donation_date || 0));

    const notifications = fileDb.getNotificationsByUserId(req.user.id).slice(0, 8);

    res.json({
      success: true,
      donor: {
        ...donor,
        eligibility_status: eligibility.eligible ? "Eligible" : "Not Eligible",
        eligibility_message: eligibility.reason,
        next_eligible_date: eligibility.nextEligibleDate
      },
      nearbyRequests,
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
    fileDb.updateDonorByUserId(req.user.id, {
      blood_group: req.body.blood_group,
      age: Number(req.body.age),
      weight: Number(req.body.weight),
      health_conditions: req.body.health_conditions || "",
      last_donation_date: req.body.last_donation_date || null,
      address: req.body.address || "",
      eligibility_status: eligibility.eligible ? "Eligible" : "Not Eligible",
      next_eligible_date: eligibility.nextEligibleDate
    });
    fileDb.updateUser(req.user.id, {
      name: req.body.name,
      phone: req.body.phone
    });

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
    fileDb.updateDonorByUserId(req.user.id, {
      is_available: req.body.is_available ? 1 : 0
    });
    res.json({ success: true, message: "Availability updated." });
  } catch (error) {
    next(error);
  }
});

router.post("/history", async (req, res, next) => {
  try {
    fileDb.createDonation({
      donor_id: Number(req.user.id),
      donation_date: req.body.donation_date,
      donation_location: req.body.donation_location
    });

    const donor = fileDb.getDonorByUserId(req.user.id);
    const eligibility = calculateEligibility({
      ...donor,
      last_donation_date: req.body.donation_date
    });

    fileDb.updateDonorByUserId(req.user.id, {
      last_donation_date: req.body.donation_date,
      eligibility_status: eligibility.eligible ? "Eligible" : "Not Eligible",
      next_eligible_date: eligibility.nextEligibleDate
    });

    res.status(201).json({ success: true, message: "Donation history added." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
