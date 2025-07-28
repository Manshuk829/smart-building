/* global io */
const socket           = io();
const floorCount       = 4;
const lastUpdateTimes  = {};

// ---------- DOM references ----------
const mqttStatus   = document.getElementById('mqtt-status');
const alertBanner  = document.getElementById('ml-alert-banner');
let mlAlertTimeout = null;

// ---------- Helpers ----------
const nowTS = () => Date.now();
const fmt   = (v, unit = '') => (v === null || v === undefined ? '--' : `${v}${unit}`);

// ---------- WebSocket (MQTT) connection status ----------
function updateConnectionStatus(connected) {
  mqttStatus.innerHTML = `WebSocket Status:
    <span class="${connected ? 'online' : 'offline'}" title="${connected ? 'Connected to server' : 'Disconnected'}">
      ${connected ? '🟢 Connected' : '🔴 Disconnected'}
    </span>`;
}
socket.on('connect',    () => updateConnectionStatus(true));
socket.on('disconnect', () => updateConnectionStatus(false));

// ---------- Per-floor setup ----------
for (let floor = 1; floor <= floorCount; floor++) {
  lastUpdateTimes[floor] = null;

  // 📸 Download snapshot
  document
    .querySelector(`[data-floor="${floor}"].download-snapshot`)
    ?.addEventListener('click', () => {
      const link    = document.createElement('a');
      link.href     = `/snapshot/${floor}.jpg?ts=${nowTS()}`;
      link.download = `floor_${floor}_snapshot.jpg`;
      link.click();
    });

  // 🚨 Manual trigger alert
  document
    .querySelector(`[data-floor="${floor}"].trigger-alert`)
    ?.addEventListener('click', () => {
      fetch('/api/alert', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ floor })
      })
        .then(r => r.ok
          ? alert(`✅ Alert triggered for Floor ${floor}`)
          : alert('❌ Failed to trigger alert'))
        .catch(e => {
          alert('⚠️ Error contacting server');
          console.error(e);
        });
    });
}

// ---------- Real-time sensor updates ----------
socket.on('sensorUpdate', data => {
  const { floor } = data;
  lastUpdateTimes[floor] = nowTS();

  // ✅ Update status and time
  document.getElementById(`status-${floor}`).innerHTML =
    'Status: <span class="online">🟢 Online</span>';
  document.getElementById(`last-updated-${floor}`).textContent =
    'Last updated: just now';

  // 📷 Refresh camera snapshot
  const cam = document.getElementById(`cam-${floor}`);
  cam.src = `/snapshot/${floor}.jpg?ts=${nowTS()}`;

  // 🌡️ Update sensor readings
  document.getElementById(`temp-${floor}`).textContent      = `🌡️ Temp: ${fmt(data.temp, '°C')}`;
  document.getElementById(`mq135-${floor}`).textContent     = `🧪 Gas: ${fmt(data.gas, ' ppm')}`;
  document.getElementById(`flame-${floor}`).textContent     = `🔥 Flame: ${data.flame ? 'Yes' : 'No'}`;
  document.getElementById(`motion-${floor}`).textContent    = `🏃 Motion: ${data.motion ? 'Yes' : 'No'}`;
  document.getElementById(`quake-${floor}`).textContent     = `🌎 Quake: ${fmt(data.vibration)}`;
  document.getElementById(`emergency-${floor}`).textContent = `🚨 Emergency: ${data.prediction?.toUpperCase() || 'Normal'}`;

  // 🚨 Display intruder image (if any)
  if (data.intruderImage) {
    const intruderBox = document.getElementById(`intruder-${floor}`);
    const intruderImg = document.getElementById(`intruder-img-${floor}`);
    intruderImg.src   = data.intruderImage;
    intruderBox.style.display = 'block';

    // Auto-hide after 30 seconds
    setTimeout(() => (intruderBox.style.display = 'none'), 30_000);
  }
});

// ---------- Mark floors offline after 15s silence ----------
setInterval(() => {
  const now = nowTS();
  for (let floor = 1; floor <= floorCount; floor++) {
    const last    = lastUpdateTimes[floor];
    const status  = document.getElementById(`status-${floor}`);
    const updated = document.getElementById(`last-updated-${floor}`);

    if (!last || now - last > 15_000) {
      status.innerHTML  = 'Status: <span class="offline">🔴 Offline</span>';
      updated.textContent = 'Last updated: more than 15 seconds ago';
    } else {
      const s = Math.round((now - last) / 1000);
      updated.textContent = `Last updated: ${s} s ago`;
    }
  }
}, 1_000);

// ---------- ML Alerts ----------
socket.on('ml-alert', ({ type, time }) => {
  if (!type || !time) return;

  clearTimeout(mlAlertTimeout);

  // 🕒 Convert to Indian Standard Time (IST)
  const tStr = new Date(time).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });

  alertBanner.textContent = `⚠️ ML Alert: ${type.toUpperCase()} detected at ${tStr}`;
  alertBanner.classList.add('active');

  mlAlertTimeout = setTimeout(() =>
    alertBanner.classList.remove('active'), 10_000);
});

socket.on('ml-normal', () => {
  clearTimeout(mlAlertTimeout);
  alertBanner.classList.remove('active');
});
