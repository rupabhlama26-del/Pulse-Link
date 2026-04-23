const clients = new Map();

function addClient(userId, res) {
  clients.set(String(userId), res);
}

function removeClient(userId) {
  clients.delete(String(userId));
}

function pushEvent(userId, event, payload) {
  const res = clients.get(String(userId));
  if (!res) return;
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

module.exports = {
  addClient,
  removeClient,
  pushEvent
};
