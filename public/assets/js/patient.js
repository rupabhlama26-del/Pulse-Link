(function () {
const {
  apiFetch,
  requireRole,
  formatDate,
  renderNotificationList,
  attachLogout,
  connectNotifications
} = window.PulseApp;

requireRole("patient");
attachLogout("patientLogoutBtn");

let emergencyMode = false;

async function loadPatientDashboard() {
  const data = await apiFetch("/patient/dashboard");
  document.getElementById("patientWelcome").textContent = `Welcome, ${data.patient.name}`;

  const requestsEl = document.getElementById("patientRequests");
  requestsEl.innerHTML = data.requests.length
    ? data.requests.map((request) => `
      <article class="item-card fade-in">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h4 class="font-semibold">${request.blood_group} request</h4>
            <p class="mt-2">${request.units_needed} unit(s) | ${request.hospital_location}</p>
            <p class="mt-1">${formatDate(request.created_at)}</p>
          </div>
          <span class="badge ${request.status === "Completed" ? "badge-green" : request.status === "Accepted" ? "badge-yellow" : "badge-red"}">${request.status}</span>
        </div>
      </article>
    `).join("")
    : `<div class="item-card"><p>No requests created yet.</p></div>`;

  renderNotificationList(document.getElementById("patientNotifications"), data.notifications);
}

async function loadPatientChatMessages() {
  const requestId = document.querySelector('#patientChatForm [name="request_id"]').value;
  if (!requestId) return;
  const response = await apiFetch(`/chat/${requestId}`);
  document.getElementById("patientChatMessages").innerHTML = response.messages.length
    ? response.messages.map((message) => `
      <article class="item-card">
        <h4 class="font-semibold">${message.sender_name}</h4>
        <p class="mt-2">${message.message}</p>
      </article>
    `).join("")
    : `<div class="item-card"><p>No chat messages yet.</p></div>`;
}

document.getElementById("searchForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.target).entries());
  const response = await apiFetch(`/patient/search?bloodGroup=${encodeURIComponent(formData.bloodGroup)}`);
  const searchResults = document.getElementById("searchResults");
  searchResults.innerHTML = response.donors.length
    ? response.donors.map((donor) => `
      <article class="item-card fade-in">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h4 class="font-semibold">${donor.name}</h4>
            <p class="mt-2">${donor.blood_group} | ${donor.completed_donations} completed donation(s)</p>
            <p class="mt-1">${donor.phone}</p>
          </div>
          <span class="badge ${donor.is_available ? "badge-green" : "badge-red"}">${donor.is_available ? "Available" : "Unavailable"}</span>
        </div>
      </article>
    `).join("")
    : `<div class="item-card"><p>No matching donors found right now.</p></div>`;
});

document.getElementById("requestForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.target).entries());
  formData.emergency_mode = emergencyMode;
  await apiFetch("/patient/requests", {
    method: "POST",
    body: JSON.stringify(formData)
  });
  event.target.reset();
  loadPatientDashboard();
});

document.getElementById("emergencyModeBtn").addEventListener("click", () => {
  emergencyMode = !emergencyMode;
  const button = document.getElementById("emergencyModeBtn");
  button.textContent = emergencyMode ? "Emergency Mode Enabled" : "Emergency Mode";
});

document.getElementById("voiceSearchBtn").addEventListener("click", () => {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    alert("Voice search is not supported in this browser.");
    return;
  }
  const recognition = new Recognition();
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.toUpperCase().replace(/\s+/g, "");
    document.querySelector('#searchForm [name="bloodGroup"]').value = transcript;
  };
  recognition.start();
});

document.getElementById("refreshSearchBtn").addEventListener("click", loadPatientDashboard);
document.getElementById("loadPatientChatBtn").addEventListener("click", loadPatientChatMessages);

document.getElementById("patientChatForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.target).entries());
  await apiFetch(`/chat/${formData.request_id}`, {
    method: "POST",
    body: JSON.stringify({ message: formData.message })
  });
  event.target.elements.message.value = "";
  loadPatientChatMessages();
});

loadPatientDashboard().catch((error) => {
  alert(error.message);
});

connectNotifications(async () => {
  await loadPatientDashboard();
});
})();
