(function () {
const {
  apiFetch,
  requireRole,
  attachLogout
} = window.PulseApp;

requireRole("admin");
attachLogout("adminLogoutBtn");
let latestRequests = [];

async function loadAdminDashboard() {
  const [dashboard, usersData, requestsData] = await Promise.all([
    apiFetch("/admin/dashboard"),
    apiFetch("/admin/users"),
    apiFetch("/admin/requests")
  ]);
  latestRequests = requestsData.requests;

  document.getElementById("adminDonors").textContent = dashboard.summary.totalDonors;
  document.getElementById("adminPatients").textContent = dashboard.summary.totalPatients;
  document.getElementById("adminRequests").textContent = dashboard.summary.activeRequests;
  document.getElementById("adminLivesSaved").textContent = dashboard.summary.livesSaved;

  document.getElementById("donationTrendChart").innerHTML = dashboard.donationTrends.length
    ? dashboard.donationTrends.map((item) => `
      <div class="availability-row">
        <div class="flex items-center justify-between text-sm">
          <span>${item.month_label}</span>
          <span>${item.total}</span>
        </div>
        <div class="availability-bar"><span style="width:${Math.min(item.total * 15, 100)}%"></span></div>
      </div>
    `).join("")
    : `<div class="item-card"><p>No trend data yet.</p></div>`;

  document.getElementById("mostNeededList").innerHTML = dashboard.mostNeeded.length
    ? dashboard.mostNeeded.map((item) => `
      <article class="item-card">
        <div class="flex items-center justify-between">
          <h4 class="font-semibold">${item.blood_group}</h4>
          <span>${item.total} requests</span>
        </div>
      </article>
    `).join("")
    : `<div class="item-card"><p>No blood demand data yet.</p></div>`;

  document.getElementById("userTable").innerHTML = usersData.users.map((user) => `
    <article class="item-card fade-in">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 class="font-semibold">${user.name}</h4>
          <p class="mt-2">${user.email} | ${user.role}</p>
        </div>
        <button class="secondary-btn delete-user-btn" data-id="${user.id}">Delete</button>
      </div>
    </article>
  `).join("");

  document.getElementById("adminRequestTable").innerHTML = requestsData.requests.map((request) => `
    <article class="item-card fade-in">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h4 class="font-semibold">${request.patient_name} | ${request.blood_group}</h4>
          <p class="mt-2">${request.units_needed} unit(s) | ${request.hospital_location}</p>
        </div>
        <span class="badge ${request.status === "Completed" ? "badge-green" : "badge-yellow"}">${request.status}</span>
      </div>
    </article>
  `).join("");

  document.querySelectorAll(".delete-user-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      await apiFetch(`/admin/users/${button.dataset.id}`, { method: "DELETE" });
      loadAdminDashboard();
    });
  });
}

document.getElementById("exportRequestsBtn").addEventListener("click", () => {
  const header = ["ID", "Patient", "Blood Group", "Units", "Urgency", "Status", "Hospital"];
  const rows = latestRequests.map((request) => [
    request.id,
    request.patient_name,
    request.blood_group,
    request.units_needed,
    request.urgency,
    request.status,
    request.hospital_location
  ]);
  const csv = [header, ...rows].map((row) => row.map((value) => `"${value}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "blood-requests-report.csv";
  link.click();
  URL.revokeObjectURL(url);
});

document.getElementById("broadcastForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.target).entries());
  await apiFetch("/admin/notifications/broadcast", {
    method: "POST",
    body: JSON.stringify(formData)
  });
  event.target.reset();
  alert("Broadcast sent.");
});

loadAdminDashboard().catch((error) => {
  alert(error.message);
});
})();
