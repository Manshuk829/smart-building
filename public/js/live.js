const socket = io();
const lastUpdateTimes = {};
const floorCount = 4;

// MQTT/WebSocket Status
const mqttStatus = document.getElementById("mqtt-status");

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

// Initialize listeners for each floor
for (let floor = 1; floor <= floorCount; floor++) {
  lastUpdateTimes[floor] = null;

  // Download snapshot
  document.querySelector(`[data-floor="${floor}"].download-snapshot`)?.addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = `/snapshot/${floor}.jpg?ts=${Date.now()}`;
    link.download = `floor_${floor}_snapshot.jpg`;
    link.click();
  });

  // Trigger alert
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

// Handle incoming sensor updates
socket.on("sensorUpdate", (data) => {
  const floor = data.floor;
  lastUpdateTimes[floor] = Date.now();

  // Update online status
  const statusEl = document.getElementById(`status-${floor}`);
  if (statusEl) {
    statusEl.innerHTML = `Status: <span class="online">🟢 Online</span>`;
  }

  // Update last updated
  const updatedEl = document.getElementById(`last-updated-${floor}`);
  if (updatedEl) {
    updatedEl.textContent = `Last updated: just now`;
  }

  // Refresh camera snapshot
  const cam = document.getElementById(`cam-${floor}`);
  if (cam) {
    cam.src = `/snapshot/${floor}.jpg?ts=${Date.now()}`;
  }

  // Show intruder image
  if (data.intruderImage) {
    const intruderBox = document.getElementById(`intruder-${floor}`);
    const intruderImg = document.getElementById(`intruder-img-${floor}`);
    if (intruderBox && intruderImg) {
      intruderImg.src = data.intruderImage;
      intruderBox.style.display = "block";
      setTimeout(() => {
        intruderBox.style.display = "none";
      }, 30000);
    }
  }
});

// Check offline status every second
setInterval(() => {
  const now = Date.now();
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
