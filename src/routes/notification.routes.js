const express = require("express");
const { query } = require("../config/db");
const { requireAuth } = require("../middleware/auth.middleware");
const { addClient, removeClient } = require("../utils/notificationStore");

const router = express.Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const rows = await query(
      "SELECT id, message, type, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json({ success: true, notifications: rows });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/read", async (req, res, next) => {
  try {
    await query("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    res.json({ success: true, message: "Notification marked as read." });
  } catch (error) {
    next(error);
  }
});

router.get("/stream/connect", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  addClient(req.user.id, res);
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ message: "Live alerts enabled." })}\n\n`);

  req.on("close", () => {
    removeClient(req.user.id);
    res.end();
  });
});

module.exports = router;
