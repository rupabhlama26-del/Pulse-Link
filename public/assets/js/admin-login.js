(function () {
function createFallbackApp() {
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

  function normalizeSessionUser(payload) {
    if (!payload) return null;
    if (payload.user && payload.user.id) return payload.user;
    if (payload.id && payload.role) return payload;
    return null;
  }

  const storage = getStorage();

  function getUser() {
    const raw = (storage ? storage.getItem("pulse_user") : null) || getCookie("pulse_user");
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
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

  function encodeSessionPayload(payload) {
    return encodeURIComponent(btoa(JSON.stringify(payload)));
  }

  async function apiFetch(path, options = {}) {
    const currentUser = getUser();
    const response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(currentUser?.id ? { "X-User-Id": String(currentUser.id) } : {}),
        ...(currentUser?.role ? { "X-User-Role": currentUser.role } : {}),
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

  return {
    apiFetch,
    setSession,
    redirectByRole,
    getUser
  };
}

const App = window.PulseApp || createFallbackApp();
const {
  apiFetch,
  setSession,
  redirectByRole,
  getUser
} = App;

const adminLoginForm = document.getElementById("adminLoginForm");
const adminAuthMessage = document.getElementById("adminAuthMessage");

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function showAdminMessage(message, type = "error") {
  if (!adminAuthMessage) return;

  adminAuthMessage.textContent = message;
  adminAuthMessage.className = `mt-5 rounded-2xl border px-4 py-3 text-sm ${type === "success" ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : "border-red-400/20 bg-red-500/10 text-red-100"}`;
  adminAuthMessage.classList.remove("hidden");
}

function clearAdminMessage() {
  if (!adminAuthMessage) return;

  adminAuthMessage.textContent = "";
  adminAuthMessage.classList.add("hidden");
}

function initAdminLogin() {
  if (!adminLoginForm) return;

  const currentUser = getUser();
  if (currentUser?.role === "admin") {
    redirectByRole("admin", { user: currentUser });
    return;
  }

  adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAdminMessage();

    try {
      const formData = Object.fromEntries(new FormData(event.target).entries());
      const email = String(formData.email || "").trim();
      const password = String(formData.password || "");

      if (!isValidEmail(email)) {
        throw new Error("Please enter a valid email address.");
      }

      if (!password) {
        throw new Error("Password is required.");
      }

      const response = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      if (response.user.role !== "admin") {
        throw new Error("This page is only for admin login.");
      }

      setSession(response.user);
      showAdminMessage("Login successful. Redirecting...", "success");

      window.setTimeout(() => {
        redirectByRole("admin", { user: response.user });
      }, 250);
    } catch (error) {
      showAdminMessage(error.message);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAdminLogin);
} else {
  initAdminLogin();
}
})();
