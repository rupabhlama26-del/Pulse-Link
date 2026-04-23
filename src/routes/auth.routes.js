const express = require("express");
const { createUser, loginUser } = require("../services/user.service");

const router = express.Router();

router.post("/register", async (req, res, next) => {
  try {
    const userId = await createUser(req.body);
    res.status(201).json({
      success: true,
      message: "Registration successful.",
      userId
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      error.status = 409;
      error.message = "Email already exists.";
    }
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const result = await loginUser(req.body.email, req.body.password, req.body.role);
    res.json({
      success: true,
      message: "Login successful.",
      ...result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
