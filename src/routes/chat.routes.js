const express = require("express");
const fileDb = require("../config/fileDb");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/:requestId", async (req, res, next) => {
  try {
    const messages = fileDb.getChatMessagesByRequestId(req.params.requestId).map((message) => {
      const sender = fileDb.getUserById(message.sender_id);
      return {
        ...message,
        sender_name: sender?.name || "Unknown User"
      };
    });

    res.json({ success: true, messages });
  } catch (error) {
    next(error);
  }
});

router.post("/:requestId", async (req, res, next) => {
  try {
    if (!req.body.message) {
      throw Object.assign(new Error("Message is required."), { status: 400 });
    }

    fileDb.createChatMessage({
      request_id: Number(req.params.requestId),
      sender_id: Number(req.user.id),
      message: String(req.body.message).trim()
    });

    res.status(201).json({ success: true, message: "Message sent." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
