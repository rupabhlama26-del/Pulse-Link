const API_BASE = "/api";

function setCookie(name, value, days = 1) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  const prefix = `${name}=`;
  const parts = document.cookie.split(";").map((part) => part.trim());
  const match = parts.find((part) => part.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

function clearCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

function encodeSessionPayload(payload) {
  return encodeURIComponent(btoa(JSON.stringify(payload)));
}

function decodeSessionPayload(raw) {
  try {
    return JSON.parse(atob(decodeURIComponent(raw)));
  } catch (_error) {
    return null;
  }
}

function getStorage() {
  try {
    const testKey = "__pulse_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch (_error) {
    try {
      const testKey = "__pulse_test__";
      window.sessionStorage.setItem(testKey, "1");
      window.sessionStorage.removeItem(testKey);
      return window.sessionStorage;
    } catch (_errorTwo) {
      return null;
    }
  }
}

function parseUser(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

function normalizeSessionUser(payload) {
  if (!payload) return null;
  if (payload.user && payload.user.id) return payload.user;
  if (payload.id && payload.role) return payload;
  return null;
}

const storage = getStorage();

function getToken() {
  return null;
}

function getUser() {
  return parseUser((storage ? storage.getItem("pulse_user") : null) || getCookie("pulse_user"));
}

function clearLegacyToken() {
  if (storage) {
    storage.removeItem("pulse_token");
  }
  clearCookie("pulse_token");
}

function setSession(userOrLegacyToken, maybeUser) {
  const user = normalizeSessionUser(maybeUser || userOrLegacyToken);
  if (!user) return;

  const serialized = JSON.stringify(user);
  if (storage) {
    storage.setItem("pulse_user", serialized);
    storage.removeItem("pulse_token");
  }

  setCookie("pulse_user", serialized);
  clearCookie("pulse_token");
}

function clearSession() {
  if (storage) {
    storage.removeItem("pulse_user");
    storage.removeItem("pulse_token");
  }

  clearCookie("pulse_user");
  clearCookie("pulse_token");
}

function hydrateSessionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const sessionParam = params.get("session");
  if (!sessionParam) return;

  const user = normalizeSessionUser(decodeSessionPayload(sessionParam));
  if (user) {
    setSession(user);
  }

  params.delete("session");
  const nextQuery = params.toString();
  const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash || ""}`;
  window.history.replaceState({}, "", nextUrl);
}

function buildAuthHeaders() {
  const user = getUser();
  if (!user?.id) {
    return {};
  }

  return {
    "X-User-Id": String(user.id),
    ...(user.role ? { "X-User-Role": user.role } : {})
  };
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(),
      ...(options.headers || {})
    }
  });

  let data;
  try {
    data = await response.json();
  } catch (_error) {
    throw new Error("Server returned an invalid response.");
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
    }
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

function redirectByRole(role, sessionPayload = null) {
  const user = normalizeSessionUser(sessionPayload);
  const sessionQuery = user ? `?session=${encodeSessionPayload({ user })}` : "";

  if (role === "donor") window.location.href = `/donor-dashboard.html${sessionQuery}`;
  if (role === "patient") window.location.href = `/patient-dashboard.html${sessionQuery}`;
  if (role === "admin") window.location.href = `/admin-dashboard.html${sessionQuery}`;
}

function requireRole(expectedRole) {
  const user = getUser();
  if (!user || user.role !== expectedRole) {
    if (expectedRole === "admin") {
      window.location.href = "/admin-login.html";
    } else {
      window.location.href = `/auth.html?role=${expectedRole}`;
    }
    return null;
  }
  return user;
}

function formatDate(value) {
  if (!value) return "--";
  return new Date(value).toLocaleDateString();
}

function renderNotificationList(container, notifications = []) {
  if (!container) return;
  if (!notifications.length) {
    container.innerHTML = `<div class="item-card"><p>No notifications yet.</p></div>`;
    return;
  }

  container.innerHTML = notifications.map((item) => `
    <article class="item-card fade-in">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h4 class="font-semibold capitalize">${item.type}</h4>
          <p class="mt-2">${item.message}</p>
        </div>
        <span class="text-xs text-slate-400">${formatDate(item.createdAt || item.created_at)}</span>
      </div>
    </article>
  `).join("");
}

function initTheme() {
  const savedTheme = storage ? storage.getItem("pulse_theme") : null;
  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
  }

  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("light-mode");
      if (storage) {
        storage.setItem("pulse_theme", document.body.classList.contains("light-mode") ? "light" : "dark");
      }
    });
  }
}

function initLanguageToggle() {
  const btn = document.getElementById("langToggle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const translated = btn.dataset.lang === "hi";
    document.documentElement.lang = translated ? "en" : "hi";
    btn.dataset.lang = translated ? "en" : "hi";
    btn.textContent = translated ? "EN / HI" : "HI / EN";
  });
}

function attachLogout(buttonId) {
  const button = document.getElementById(buttonId);
  if (!button) return;

  button.addEventListener("click", () => {
    clearSession();
    window.location.href = "/";
  });
}

function connectNotifications(onMessage) {
  const user = getUser();
  if (!user?.id || typeof EventSource === "undefined") return null;

  const params = new URLSearchParams({
    userId: String(user.id),
    ...(user.role ? { role: user.role } : {})
  });

  const eventSource = new EventSource(`/api/notifications/stream/connect?${params.toString()}`);
  eventSource.addEventListener("notification", (event) => {
    onMessage(JSON.parse(event.data));
  });
  return eventSource;
}

window.PulseApp = {
  apiFetch,
  setSession,
  getUser,
  getToken,
  clearSession,
  redirectByRole,
  requireRole,
  hydrateSessionFromUrl,
  formatDate,
  renderNotificationList,
  initTheme,
  initLanguageToggle,
  attachLogout,
  connectNotifications
};

window.addEventListener("error", (event) => {
  console.error("Frontend error:", event.error || event.message);
});

clearLegacyToken();
hydrateSessionFromUrl();
initTheme();
initLanguageToggle();
