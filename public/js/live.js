/* global io */
const socket = io({
  transports: ['websocket'],
  upgrade: false
});

const floorCount = 4;
const lastUpdateTimes = {};
const mqttStatus = document.getElementById('mqtt-status');
const alertBanner = document.getElementById('ml-alert-banner');
let mlAlertTimeout = null;

// Utility Functions
const nowTS = () => Date.now();
const fmt = (v, unit = '') => (v === null || v === undefined ? 'N/A' : `${v}${unit}`);

// Update MQTT WebSocket Connection Status
function updateConnectionStatus(connected) {
  mqttStatus.innerHTML = `WebSocket Status:
    <span class="${connected ? 'online' : 'offline'}" title="${connected ? 'Connected to server' : 'Disconnected'}">
      ${connected ? '🟢 Connected' : '🔴 Disconnected'}
    </span>`;
}
socket.on('connect', () => updateConnectionStatus(true));
socket.on('disconnect', () => updateConnectionStatus(false));

// Setup Button Event Listeners for Each Floor
for (let floor = 1; floor <= floorCount; floor++) {
  lastUpdateTimes[floor] = null;

  document.querySelector(`[data-floor="${floor}"].download-snapshot`)
    ?.addEventListener('click', () => {
      const link = document.createElement('a');
      link.href = `/snapshot/${floor}.jpg?ts=${nowTS()}`;
      link.download = `floor_${floor}_snapshot.jpg`;
      link.click();
    });

  document.querySelector(`[data-floor="${floor}"].trigger-alert`)
    ?.addEventListener('click', () => {
      fetch('/api/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ floor })
      })
      .then(res => {
        if (res.ok) {
          alert(`✅ Alert triggered for Floor ${floor}`);
        } else {
          alert('❌ Failed to trigger alert');
        }
      })
      .catch(err => {
        console.error(err);
        alert('⚠️ Error contacting server');
      });
    });
}

// Handle Incoming Real-Time Sensor Data
socket.on('sensorUpdate', data => {
  const { floor } = data;
  lastUpdateTimes[floor] = nowTS();

  // Update status and last updated time
  document.getElementById(`status-${floor}`)?.innerHTML = 'Status: <span class="online">🟢 Online</span>';
  document.getElementById(`last-updated-${floor}`)?.textContent = 'Last updated: just now';

  // Update camera snapshot
  const cam = document.getElementById(`cam-${floor}`);
  if (cam) cam.src = `/snapshot/${floor}.jpg?ts=${nowTS()}`;

  // Update sensor values
  document.getElementById(`temp-${floor}`)?.textContent = `🌡️ Temp: ${fmt(data.temp, '°C')}`;
  document.getElementById(`hum-${floor}`)?.textContent = `💧 Humidity: ${fmt(data.humidity, '%')}`;
  document.getElementById(`mq135-${floor}`)?.textContent = `🧪 Gas: ${fmt(data.gas, ' ppm')}`;
  document.getElementById(`flame-${floor}`)?.textContent = `🔥 Flame: ${data.flame ? '❌ Detected' : '✅ Safe'}`;
  document.getElementById(`motion-${floor}`)?.textContent = `🏃 Motion: ${data.motion ? '❌ Detected' : '✅ None'}`;
  document.getElementById(`quake-${floor}`)?.textContent = `🌎 Quake: ${fmt(data.vibration)}`;
  document.getElementById(`emergency-${floor}`)?.textContent = `🚨 Emergency: ${data.prediction?.toUpperCase() || 'Normal'}`;

  // Show intruder image if available
  if (data.intruderImage) {
    const box = document.getElementById(`intruder-${floor}`);
    const img = document.getElementById(`intruder-img-${floor}`);
    if (box && img) {
      img.src = `${data.intruderImage}?ts=${nowTS()}`;
      box.style.display = 'block';
      box.style.opacity = '1';

      setTimeout(() => {
        box.style.transition = 'opacity 1s ease';
        box.style.opacity = '0';
        setTimeout(() => box.style.display = 'none', 1000);
      }, 30_000); // 30 seconds visibility
    }
  }
});

// Offline Status Checker for Each Floor
setInterval(() => {
  const now = nowTS();
  for (let floor = 1; floor <= floorCount; floor++) {
    const last = lastUpdateTimes[floor];
    const status = document.getElementById(`status-${floor}`);
    const updated = document.getElementById(`last-updated-${floor}`);

    if (!last || now - last > 15_000) {
      if (status && updated) {
        status.innerHTML = 'Status: <span class="offline">🔴 Offline</span>';
        updated.textContent = 'Last updated: more than 15 seconds ago';
      }
    } else if (updated) {
      const secs = Math.round((now - last) / 1000);
      updated.textContent = `Last updated: ${secs} s ago`;
    }
  }
}, 1000); // Run every second

// ML Alert Handler
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

  alertBanner.textContent = `⚠️ ML Alert: ${type.toUpperCase()} detected on Floor ${floor} at ${tStr}`;
  alertBanner.classList.add('active');

  mlAlertTimeout = setTimeout(() => {
    alertBanner.classList.remove('active');
  }, 10_000); // Visible for 10 seconds
});

// ML Alert Reset
socket.on('ml-normal', () => {
  clearTimeout(mlAlertTimeout);
  alertBanner.classList.remove('active');
});
