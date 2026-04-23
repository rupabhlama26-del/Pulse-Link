(function () {
const { apiFetch } = window.PulseApp;

async function loadLandingData() {
  try {
    const [statsData, availabilityData] = await Promise.all([
      apiFetch("/meta/stats"),
      apiFetch("/meta/blood-availability")
    ]);

    document.getElementById("totalDonors").textContent = statsData.stats.totalDonors;
    document.getElementById("livesSaved").textContent = statsData.stats.livesSaved;
    document.getElementById("activeRequests").textContent = statsData.stats.activeRequests;

    const chart = document.getElementById("availabilityChart");
    const max = Math.max(...availabilityData.availability.map((item) => item.available_count), 1);
    chart.innerHTML = availabilityData.availability.map((item, index) => `
      <div class="availability-row fade-in" style="animation-delay:${index * 80}ms">
        <div class="flex items-center justify-between text-sm">
          <span>${item.blood_group}</span>
          <span>${item.available_count} donors</span>
        </div>
        <div class="availability-bar">
          <span style="width:${(item.available_count / max) * 100}%"></span>
        </div>
      </div>
    `).join("");
    const message = document.getElementById("landingDataMessage");
    if (message) {
      message.classList.add("hidden");
      message.textContent = "";
    }
  } catch (error) {
    console.error(error);
    const message = document.getElementById("landingDataMessage");
    if (message) {
      message.textContent = "Could not load live homepage data.";
      message.classList.remove("hidden");
    }
  }
}

document.getElementById("emergencyCTA")?.addEventListener("click", () => {
  window.location.href = "/auth.html?role=patient";
});

loadLandingData();
})();
