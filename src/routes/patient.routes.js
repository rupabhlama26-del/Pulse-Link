const express = require("express");
const fileDb = require("../config/fileDb");
const { requireAuth, allowRoles } = require("../middleware/auth.middleware");
const { createNotification } = require("../services/notification.service");

const router = express.Router();

router.use(requireAuth, allowRoles("patient"));

router.get("/dashboard", async (req, res, next) => {
  try {
    const patientRecord = fileDb.getPatientByUserId(req.user.id);
    if (!patientRecord) {
      throw Object.assign(new Error("Patient profile not found."), { status: 404 });
    }

    const requests = fileDb
      .getAllRequests()
      .filter((request) => Number(request.patient_id) === Number(patientRecord.id))
      .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0));

    const notifications = fileDb.getNotificationsByUserId(req.user.id).slice(0, 8);

    res.json({
      success: true,
      patient: {
        ...patientRecord,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone
      },
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
    const donationCounts = fileDb.getAllDonations().reduce((result, donation) => {
      const donorId = Number(donation.donor_id);
      result[donorId] = (result[donorId] || 0) + 1;
      return result;
    }, {});

    const donors = fileDb
      .getAllDonors()
      .filter((donor) => donor.blood_group === bloodGroup && donor.eligibility_status === "Eligible")
      .map((donor) => {
        const user = fileDb.getUserById(donor.user_id);
        return {
          user_id: donor.user_id,
          name: user?.name || "Unknown Donor",
          phone: user?.phone || "",
          blood_group: donor.blood_group,
          is_available: donor.is_available,
          eligibility_status: donor.eligibility_status,
          last_donation_date: donor.last_donation_date,
          completed_donations: donationCounts[Number(donor.user_id)] || 0
        };
      })
      .sort((left, right) => {
        if (Number(right.is_available) !== Number(left.is_available)) {
          return Number(right.is_available) - Number(left.is_available);
        }
        if (right.completed_donations !== left.completed_donations) {
          return right.completed_donations - left.completed_donations;
        }
        return left.name.localeCompare(right.name);
      });

    res.json({
      success: true,
      donors
    });
  } catch (error) {
    next(error);
  }
});

router.post("/requests", async (req, res, next) => {
  try {
    const patientRecord = fileDb.getPatientByUserId(req.user.id);
    if (!patientRecord) {
      throw Object.assign(new Error("Patient profile not found."), { status: 404 });
    }

    const request = fileDb.createRequest({
      patient_id: patientRecord.id,
      blood_group: req.body.blood_group,
      units_needed: Number(req.body.units_needed),
      urgency: req.body.urgency,
      status: "Pending",
      hospital_location: req.body.hospital_location,
      notes: req.body.notes || "",
      emergency_mode: req.body.emergency_mode ? 1 : 0
    });

    const matchingDonors = fileDb
      .getAllDonors()
      .filter(
        (donor) =>
          donor.blood_group === req.body.blood_group &&
          Number(donor.is_available) === 1 &&
          donor.eligibility_status === "Eligible"
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
      requestId: request.id
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/requests/:id/status", async (req, res, next) => {
  try {
    const patientRecord = fileDb.getPatientByUserId(req.user.id);
    const request = fileDb.getRequestById(req.params.id);

    if (!request || Number(request.patient_id) !== Number(patientRecord?.id)) {
      throw Object.assign(new Error("Request not found."), { status: 404 });
    }

    fileDb.updateRequest(req.params.id, { status: req.body.status });
    res.json({ success: true, message: "Request status updated." });
  } catch (error) {
    next(error);
  }
});

router.put("/profile", async (req, res, next) => {
  try {
    fileDb.updatePatientByUserId(req.user.id, {
      required_blood_group: req.body.required_blood_group || null,
      address: req.body.address || "",
      hospital_name: req.body.hospital_name || null
    });
    fileDb.updateUser(req.user.id, {
      name: req.body.name,
      phone: req.body.phone
    });
    res.json({ success: true, message: "Patient profile updated." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
