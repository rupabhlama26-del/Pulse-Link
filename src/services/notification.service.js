const fileDb = require("../config/fileDb");
const { pushEvent } = require("../utils/notificationStore");

async function createNotification(userId, message, type = "info") {
  const notification = fileDb.createNotification({
    user_id: Number(userId),
    message,
    type,
    is_read: 0
  });

  pushEvent(userId, "notification", {
    id: notification.id,
    message,
    type,
    is_read: 0,
    createdAt: notification.created_at
  });

  return notification;
}

async function broadcastNotification(userIds, message, type = "broadcast") {
  await Promise.all(userIds.map((userId) => createNotification(userId, message, type)));
}

module.exports = {
  createNotification,
  broadcastNotification
};
