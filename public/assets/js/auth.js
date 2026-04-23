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

function showMessage(message, type = "error") {
  const messageBox = document.getElementById("authMessage");
  if (!messageBox) return;

  messageBox.textContent = message;
  messageBox.className = `mt-5 rounded-2xl border px-4 py-3 text-sm ${type === "success" ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : "border-red-400/20 bg-red-500/10 text-red-100"}`;
  messageBox.classList.remove("hidden");
}

function clearMessage() {
  const messageBox = document.getElementById("authMessage");
  if (!messageBox) return;

  messageBox.textContent = "";
  messageBox.classList.add("hidden");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("hidden", panel.id !== `${tabName}Form`);
  });

  clearMessage();
}

function updateUrl(tabName, role) {
  const params = new URLSearchParams(window.location.search);
  params.set("tab", tabName);
  params.set("role", role);
  window.history.replaceState({}, "", `/auth.html?${params.toString()}`);
}

function applyRoleConfig(role) {
  const heading = document.getElementById("authHeading");
  const subheading = document.getElementById("authSubheading");
  const donorFields = document.getElementById("donorFields");
  const patientFields = document.getElementById("patientFields");
  const registerForm = document.getElementById("registerForm");

  const config = {
    donor: {
      title: "Donor Authentication",
      subtitle: "Register as a donor, manage your profile, and receive matching emergency requests."
    },
    patient: {
      title: "Patient Authentication",
      subtitle: "Create an account to search for matching blood donors and track requests."
    }
  };

  const currentConfig = config[role] || config.donor;
  if (heading) heading.textContent = currentConfig.title;
  if (subheading) subheading.textContent = currentConfig.subtitle;

  donorFields?.classList.toggle("hidden", role !== "donor");
  patientFields?.classList.toggle("hidden", role !== "patient");

  if (!registerForm) return;

  const donorAge = registerForm.querySelector('[name="age"]');
  const donorWeight = registerForm.querySelector('[name="weight"]');
  const donorBlood = registerForm.querySelector('[name="blood_group"]');
  const patientBlood = registerForm.querySelector('[name="required_blood_group"]');

  if (donorAge) donorAge.required = role === "donor";
  if (donorWeight) donorWeight.required = role === "donor";
  if (donorBlood) donorBlood.required = role === "donor";
  if (patientBlood) patientBlood.required = role === "patient";
}

async function handleLogin(event) {
  event.preventDefault();
  clearMessage();

  const formData = Object.fromEntries(new FormData(event.target).entries());
  const email = String(formData.email || "").trim();
  const password = String(formData.password || "");

  if (!isValidEmail(email)) {
    showMessage("Please enter a valid email address.");
    return;
  }

  if (!password) {
    showMessage("Password is required.");
    return;
  }

  try {
    const response = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, role })
    });

    setSession(response.user);
    showMessage("Login successful. Redirecting...", "success");

    window.setTimeout(() => {
      redirectByRole(response.user.role, { user: response.user });
    }, 250);
  } catch (error) {
    showMessage(error.message);
  }
}

async function handleRegister(event, role) {
  event.preventDefault();
  clearMessage();

  const formData = Object.fromEntries(new FormData(event.target).entries());
  const payload = {
    ...formData,
    role,
    email: String(formData.email || "").trim()
  };

  if (!isValidEmail(payload.email)) {
    showMessage("Please enter a valid email address.");
    return;
  }

  if (String(payload.password || "").length < 6) {
    showMessage("Password must be at least 6 characters long.");
    return;
  }

  try {
    await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const loginResponse = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
        role
      })
    });

    setSession(loginResponse.user);
    showMessage("Registration successful. Redirecting...", "success");

    window.setTimeout(() => {
      redirectByRole(loginResponse.user.role, { user: loginResponse.user });
    }, 250);
  } catch (error) {
    showMessage(error.message);
  }
}

function initAuth() {
  const params = new URLSearchParams(window.location.search);
  const role = params.get("role") || "donor";
  const tab = params.get("tab") || "login";
  const currentUser = getUser();

  if (role === "admin") {
    window.location.href = "/admin-login.html";
    return;
  }

  if (currentUser?.role === role) {
    redirectByRole(role, { user: currentUser });
    return;
  }

  applyRoleConfig(role);
  switchTab(tab);

  const loginTabButton = document.getElementById("loginTabLink");
  const registerTabButton = document.getElementById("registerTabLink");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const forgotButton = document.getElementById("forgotPasswordBtn");
  const forgotPanel = document.getElementById("forgotPasswordPanel");

  loginTabButton?.addEventListener("click", () => {
    updateUrl("login", role);
    switchTab("login");
  });

  registerTabButton?.addEventListener("click", () => {
    updateUrl("register", role);
    switchTab("register");
  });

  loginForm?.addEventListener("submit", handleLogin);
  registerForm?.addEventListener("submit", (event) => handleRegister(event, role));

  forgotButton?.addEventListener("click", () => {
    forgotPanel?.classList.toggle("hidden");
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuth);
} else {
  initAuth();
}
})();
