const express = require("express");
const { query } = require("../config/db");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/:requestId", async (req, res, next) => {
  try {
    const messages = await query(
      `SELECT cm.id, cm.request_id, cm.sender_id, cm.message, cm.created_at, u.name AS sender_name
       FROM chat_messages cm
       JOIN users u ON u.id = cm.sender_id
       WHERE cm.request_id = ?
       ORDER BY cm.created_at ASC`,
      [req.params.requestId]
    );
    res.json({ success: true, messages });
  } catch (error) {
    next(error);
  }
});

router.post("/:requestId", async (req, res, next) => {
  try {
    await query(
      "INSERT INTO chat_messages (request_id, sender_id, message) VALUES (?, ?, ?)",
      [req.params.requestId, req.user.id, req.body.message]
    );
    res.status(201).json({ success: true, message: "Message sent." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
