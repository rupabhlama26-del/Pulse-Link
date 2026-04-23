const express = require("express");
const fileDb = require("../config/fileDb");
const { requireAuth } = require("../middleware/auth.middleware");
const { addClient, removeClient } = require("../utils/notificationStore");

const router = express.Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const notifications = fileDb.getNotificationsByUserId(req.user.id);
    res.json({ success: true, notifications });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/read", async (req, res, next) => {
  try {
    fileDb.markNotificationRead(req.params.id, req.user.id);
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
  res.write("event: connected\n");
  res.write(`data: ${JSON.stringify({ message: "Live alerts enabled." })}\n\n`);

  req.on("close", () => {
    removeClient(req.user.id);
    res.end();
  });
});

module.exports = router;
