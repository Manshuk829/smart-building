const socket = io();
const lastUpdateTimes = {};
const floorCount = 4;

const mqttStatus = document.getElementById("mqtt-status");
const alertBanner = document.getElementById("ml-alert-banner");

// ===== Update WebSocket Connection Status =====
function updateConnectionStatus(connected) {
  if (mqttStatus) {
    mqttStatus.innerHTML = `WebSocket Status: 
      <span class="${connected ? 'online' : 'offline'}" title="${connected ? 'Connected to server' : 'Disconnected'}">
        ${connected ? '🟢 Connected' : '🔴 Disconnected'}
      </span>`;
  }
}

socket.on("connect", () => updateConnectionStatus(true));
socket.on("disconnect", () => updateConnectionStatus(false));

// ===== Helper: Timestamp =====
const nowTS = () => Date.now();

// ===== Setup buttons for each floor =====
for (let floor = 1; floor <= floorCount; floor++) {
  lastUpdateTimes[floor] = null;

  // Download snapshot button
  document.querySelector(`[data-floor="${floor}"].download-snapshot`)?.addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = `/snapshot/${floor}.jpg?ts=${nowTS()}`;
    link.download = `floor_${floor}_snapshot.jpg`;
    link.click();
  });

  // Trigger alert button
  document.querySelector(`[data-floor="${floor}"].trigger-alert`)?.addEventListener("click", () => {
    fetch("/api/alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ floor }),
    })
      .then((res) => {
        if (res.ok) {
          alert(`✅ Alert triggered for Floor ${floor}`);
        } else {
          alert("❌ Failed to trigger alert");
        }
      })
      .catch((err) => {
        alert("⚠️ Error contacting server.");
        console.error(err);
      });
  });
}

// ===== Handle Incoming Sensor Data =====
socket.on("sensorUpdate", (data) => {
  const floor = data.floor;
  lastUpdateTimes[floor] = nowTS();

  // Update online status
  const statusEl = document.getElementById(`status-${floor}`);
  if (statusEl) {
    statusEl.innerHTML = `Status: <span class="online">🟢 Online</span>`;
  }

  // Update last updated timestamp
  const updatedEl = document.getElementById(`last-updated-${floor}`);
  if (updatedEl) {
    updatedEl.textContent = `Last updated: just now`;
  }

  // Refresh camera feed
  const camImg = document.getElementById(`cam-${floor}`);
  if (camImg) {
    camImg.src = `/snapshot/${floor}.jpg?ts=${nowTS()}`;
  }

  // Show intruder snapshot if present
  if (data.intruderImage) {
    const intruderBox = document.getElementById(`intruder-${floor}`);
    const intruderImg = document.getElementById(`intruder-img-${floor}`);
    if (intruderBox && intruderImg) {
      intruderImg.src = data.intruderImage;
      intruderBox.style.display = "block";

      setTimeout(() => {
        intruderBox.style.display = "none";
      }, 30000); // auto-hide after 30 seconds
    }
  }
});

// ===== Auto Mark Offline if No Update =====
setInterval(() => {
  const now = nowTS();
  for (let floor = 1; floor <= floorCount; floor++) {
    const last = lastUpdateTimes[floor];
    const updated = document.getElementById(`last-updated-${floor}`);
    const status = document.getElementById(`status-${floor}`);

    if (!last || now - last > 15000) {
      if (status) status.innerHTML = `Status: <span class="offline">🔴 Offline</span>`;
      if (updated) updated.textContent = `Last updated: more than 15 seconds ago`;
    } else {
      const secondsAgo = Math.round((now - last) / 1000);
      if (updated) updated.textContent = `Last updated: ${secondsAgo} seconds ago`;
    }
  }
}, 1000);

// ===== Handle ML Alerts =====
socket.on("ml-alert", (data) => {
  if (alertBanner) {
    alertBanner.textContent = `⚠️ ML Alert: ${data.type.toUpperCase()} detected at ${new Date(data.time).toLocaleTimeString()}`;
    alertBanner.classList.add("active");

    setTimeout(() => {
      alertBanner.classList.remove("active");
    }, 10000); // hide after 10s
  }
});

socket.on("ml-normal", () => {
  if (alertBanner) {
    alertBanner.classList.remove("active");
  }
});
