const fileDb = require("../config/fileDb");

function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex === -1) {
        return cookies;
      }

      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function readIdentityFromCookie(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  if (!cookies.pulse_user) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(cookies.pulse_user);
    return {
      id: Number(parsedUser.id),
      role: parsedUser.role || null
    };
  } catch (_error) {
    return null;
  }
}

function readIdentity(req) {
  const headerId = req.headers["x-user-id"];
  const headerRole = req.headers["x-user-role"];
  const queryId = req.query?.userId;
  const queryRole = req.query?.role;

  if (headerId || queryId) {
    return {
      id: Number(headerId || queryId),
      role: String(headerRole || queryRole || "").trim() || null
    };
  }

  return readIdentityFromCookie(req);
}

function attachUserIfPresent(req, _res, next) {
  if (!req.path.startsWith("/api")) {
    req.user = null;
    return next();
  }

  const identity = readIdentity(req);
  if (!identity?.id) {
    req.user = null;
    return next();
  }

  const user = fileDb.getUserById(identity.id);

  if (!user) {
    req.user = null;
    return next();
  }

  if (identity.role && identity.role !== user.role) {
    req.user = null;
    return next();
  }

  req.user = user;
  return next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }

  return next();
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    return next();
  };
}

module.exports = {
  attachUserIfPresent,
  requireAuth,
  allowRoles
};
