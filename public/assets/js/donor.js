(function () {
const {
  apiFetch,
  requireRole,
  formatDate,
  renderNotificationList,
  attachLogout,
  connectNotifications
} = window.PulseApp;

requireRole("donor");
attachLogout("logoutBtn");

function formatDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

async function loadDonorDashboard() {
  const data = await apiFetch("/donor/dashboard");
  document.getElementById("donorWelcome").textContent = `Welcome, ${data.donor.name}`;
  document.getElementById("eligibilityStatus").textContent = data.donor.eligibility_status;
  document.getElementById("eligibilityMessage").textContent = data.donor.eligibility_message;
  document.getElementById("lastDonationDate").textContent = formatDate(data.donor.last_donation_date);
  document.getElementById("nextEligibleDate").textContent = formatDate(data.donor.next_eligible_date);

  const form = document.getElementById("donorProfileForm");
  ["name", "phone", "age", "weight", "blood_group", "last_donation_date", "address", "health_conditions"].forEach((field) => {
    if (form.elements[field]) {
      form.elements[field].value = field === "last_donation_date"
        ? formatDateInputValue(data.donor[field])
        : (data.donor[field] || "");
    }
  });

  const requestContainer = document.getElementById("nearbyRequests");
  requestContainer.innerHTML = data.nearbyRequests.length
    ? data.nearbyRequests.map((request) => `
      <article class="item-card fade-in">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h4 class="text-lg font-semibold">${request.patient_name} needs ${request.blood_group}</h4>
            <p class="mt-2">${request.units_needed} unit(s) | ${request.hospital_location}</p>
          </div>
          <span class="badge ${request.urgency === "Critical" ? "badge-red" : "badge-yellow"}">${request.urgency}</span>
        </div>
      </article>
    `).join("")
    : `<div class="item-card"><p>No matching requests right now.</p></div>`;

  const historyContainer = document.getElementById("donationHistory");
  historyContainer.innerHTML = data.donationHistory.length
    ? data.donationHistory.map((entry) => `
      <article class="item-card">
        <h4 class="font-semibold">${formatDate(entry.donation_date)}</h4>
        <p class="mt-2">${entry.donation_location}</p>
      </article>
    `).join("")
    : `<div class="item-card"><p>No donations added yet.</p></div>`;

  renderNotificationList(document.getElementById("donorNotifications"), data.notifications);
}

async function loadDonorChatMessages() {
  const requestId = document.querySelector('#donorChatForm [name="request_id"]').value;
  if (!requestId) return;
  const response = await apiFetch(`/chat/${requestId}`);
  document.getElementById("donorChatMessages").innerHTML = response.messages.length
    ? response.messages.map((message) => `
      <article class="item-card">
        <h4 class="font-semibold">${message.sender_name}</h4>
        <p class="mt-2">${message.message}</p>
      </article>
    `).join("")
    : `<div class="item-card"><p>No chat messages yet.</p></div>`;
}

document.getElementById("donorProfileForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.target).entries());
  await apiFetch("/donor/profile", {
    method: "PUT",
    body: JSON.stringify(formData)
  });
  loadDonorDashboard();
});

document.getElementById("toggleAvailabilityBtn").addEventListener("click", async () => {
  const isAvailable = confirm("Set yourself as available for blood donation?");
  await apiFetch("/donor/availability", {
    method: "PATCH",
    body: JSON.stringify({ is_available: isAvailable })
  });
  loadDonorDashboard();
});

document.getElementById("donationHistoryForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.target).entries());
  await apiFetch("/donor/history", {
    method: "POST",
    body: JSON.stringify(formData)
  });
  event.target.reset();
  loadDonorDashboard();
});

document.getElementById("refreshDonorBtn").addEventListener("click", loadDonorDashboard);
document.getElementById("loadDonorChatBtn").addEventListener("click", loadDonorChatMessages);

document.getElementById("donorChatForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.target).entries());
  await apiFetch(`/chat/${formData.request_id}`, {
    method: "POST",
    body: JSON.stringify({ message: formData.message })
  });
  event.target.elements.message.value = "";
  loadDonorChatMessages();
});

loadDonorDashboard().catch((error) => {
  alert(error.message);
});

connectNotifications(async (notification) => {
  const container = document.getElementById("donorNotifications");
  const existing = container.innerHTML;
  renderNotificationList(container, [notification, ...(existing ? [] : [])]);
  await loadDonorDashboard();
});
})();
