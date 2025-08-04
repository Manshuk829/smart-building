/* global io */
const socket = io({ transports: ['websocket'], upgrade: false });

const floorCount = 2; // since Gate 1 = Floor 1, Gate 2 = Floor 2
const lastUpdateTimes = {};
const mqttStatus = document.getElementById('mqtt-status');
const alertBanner = document.getElementById('ml-alert-banner');
let mlAlertTimeout = null;

// Helpers
const nowTS = () => Date.now();
const fmt = (val, unit = '') => (val == null ? 'N/A' : `${val}${unit}`);

// MQTT status
function updateConnectionStatus(connected) {
  mqttStatus.innerHTML = `WebSocket Status:
    <span class="${connected ? 'online' : 'offline'}" title="${connected ? 'Connected' : 'Disconnected'}">
      ${connected ? '🟢 Connected' : '🔴 Disconnected'}
    </span>`;
}
socket.on('connect', () => updateConnectionStatus(true));
socket.on('disconnect', () => updateConnectionStatus(false));

// Setup controls for each gate/floor
for (let floor = 1; floor <= floorCount; floor++) {
  lastUpdateTimes[floor] = null;

  document.querySelector(`[data-floor="${floor}"].download-snapshot`)?.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = `/snapshot/${floor}.jpg?ts=${nowTS()}`;
    link.download = `gate_${floor}_snapshot.jpg`;
    link.click();
  });

  document.querySelector(`[data-floor="${floor}"].trigger-alert`)?.addEventListener('click', () => {
    fetch('/api/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ floor })
    })
      .then(res => res.ok
        ? alert(`✅ Alert triggered for Gate ${floor}`)
        : alert('❌ Failed to trigger alert'))
      .catch(err => {
        console.error(err);
        alert('⚠️ Error contacting server');
      });
  });
}

// Handle sensor + intruder update
socket.on('sensor-update', data => {
  const { floor, intruderImage, name } = data;
  if (!floor) return;

  lastUpdateTimes[floor] = nowTS();

  document.getElementById(`status-${floor}`)?.innerHTML = 'Status: <span class="online">🟢 Online</span>';
  document.getElementById(`last-updated-${floor}`)?.textContent = 'Last updated: just now';

  const cam = document.getElementById(`cam-${floor}`);
  if (cam) cam.src = `/snapshot/${floor}.jpg?ts=${nowTS()}`;

  const imgBox = document.getElementById(`intruder-${floor}`);
  const imgEl = document.getElementById(`intruder-img-${floor}`);
  const nameEl = document.getElementById(`intruder-name-${floor}`);

  if (name || intruderImage) {
    if (imgBox && imgEl && nameEl) {
      imgBox.style.display = 'block';
      imgBox.style.opacity = '1';

      if (name && name.toLowerCase() !== 'intruder') {
        nameEl.textContent = `✅ Known Person: ${name}`;
        imgEl.style.display = 'none';
      } else if (intruderImage) {
        nameEl.textContent = '🚨 Intruder Detected!';
        imgEl.src = `data:image/jpeg;base64,${intruderImage}`;
        imgEl.style.display = 'block';
      }

      setTimeout(() => {
        imgBox.style.transition = 'opacity 1s ease';
        imgBox.style.opacity = '0';
        setTimeout(() => imgBox.style.display = 'none', 1000);
      }, 30000);
    }
  }
});

// Offline checker
setInterval(() => {
  const now = nowTS();
  for (let floor = 1; floor <= floorCount; floor++) {
    const last = lastUpdateTimes[floor];
    const status = document.getElementById(`status-${floor}`);
    const updated = document.getElementById(`last-updated-${floor}`);

    if (!last || now - last > 15000) {
      status && (status.innerHTML = 'Status: <span class="offline">🔴 Offline</span>');
      updated && (updated.textContent = 'Last updated: more than 15 seconds ago');
    } else if (updated) {
      const secs = Math.round((now - last) / 1000);
      updated.textContent = `Last updated: ${secs} s ago`;
    }
  }
}, 1000);

// ML alerts
socket.on('ml-alert', ({ type, time, floor }) => {
  if (!type || !time || !floor) return;

  clearTimeout(mlAlertTimeout);

  const tStr = new Date(time).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });

  alertBanner.textContent = `⚠️ ML Alert: ${type.toUpperCase()} detected at Gate ${floor} at ${tStr}`;
  alertBanner.classList.add('active');

  mlAlertTimeout = setTimeout(() => {
    alertBanner.classList.remove('active');
  }, 10000);
});

// Clear ML alert
socket.on('ml-normal', () => {
  clearTimeout(mlAlertTimeout);
  alertBanner.classList.remove('active');
});
