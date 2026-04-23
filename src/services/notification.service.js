const { query } = require("../config/db");
const { pushEvent } = require("../utils/notificationStore");

async function createNotification(userId, message, type = "info") {
  await query(
    "INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)",
    [userId, message, type]
  );

  pushEvent(userId, "notification", {
    message,
    type,
    createdAt: new Date().toISOString()
  });
}

async function broadcastNotification(userIds, message, type = "broadcast") {
  await Promise.all(userIds.map((userId) => createNotification(userId, message, type)));
}

module.exports = {
  createNotification,
  broadcastNotification
};
