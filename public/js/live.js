/* global io */
const socket           = io();
const floorCount       = 4;
const lastUpdateTimes  = {};

// ---------- DOM refs ----------
const mqttStatus   = document.getElementById('mqtt-status');
const alertBanner  = document.getElementById('ml-alert-banner');

let mlAlertTimeout = null;   // prevent overlapping alerts

// ---------- helpers ----------
const nowTS = () => Date.now();
const fmt   = (v, unit = '') => (v === null || v === undefined ? '--' : `${v}${unit}`);

// ---------- connection status ----------
function updateConnectionStatus(connected) {
  mqttStatus.innerHTML = `WebSocket Status:
    <span class="${connected ? 'online' : 'offline'}" title="${connected ? 'Connected to server' : 'Disconnected'}">
      ${connected ? '🟢 Connected' : '🔴 Disconnected'}
    </span>`;
}
socket.on('connect',    () => updateConnectionStatus(true));
socket.on('disconnect', () => updateConnectionStatus(false));

// ---------- per‑floor setup ----------
for (let floor = 1; floor <= floorCount; floor++) {
  lastUpdateTimes[floor] = null;

  // 📸 download snapshot
  document
    .querySelector(`[data-floor="${floor}"].download-snapshot`)
    ?.addEventListener('click', () => {
      const link   = document.createElement('a');
      link.href    = `/snapshot/${floor}.jpg?ts=${nowTS()}`;
      link.download = `floor_${floor}_snapshot.jpg`;
      link.click();
    });

  // 🚨 manual trigger alert
  document
    .querySelector(`[data-floor="${floor}"].trigger-alert`)
    ?.addEventListener('click', () => {
      fetch('/api/alert', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ floor })
      })
        .then(r => r.ok
          ? alert(`✅ Alert triggered for Floor ${floor}`)
          : alert('❌ Failed to trigger alert'))
        .catch(e => {
          alert('⚠️ Error contacting server'); console.error(e);
        });
    });
}

// ---------- real‑time sensor updates ----------
socket.on('sensorUpdate', data => {
  const { floor } = data;
  lastUpdateTimes[floor] = nowTS();

  // 1️⃣ status & timestamp
  document.getElementById(`status-${floor}`).innerHTML =
    'Status: <span class="online">🟢 Online</span>';

  document.getElementById(`last-updated-${floor}`).textContent =
    'Last updated: just now';

  // 2️⃣ camera refresh
  const cam = document.getElementById(`cam-${floor}`);
  cam.src = `/snapshot/${floor}.jpg?ts=${nowTS()}`;

  // 3️⃣ sensor readings
  document.getElementById(`temp-${floor}`).textContent      = `🌡️ Temp: ${fmt(data.temp, '°C')}`;
  document.getElementById(`mq135-${floor}`).textContent     = `🧪 Gas: ${fmt(data.gas, ' ppm')}`;
  document.getElementById(`flame-${floor}`).textContent     = `🔥 Flame: ${data.flame ? 'Yes' : 'No'}`;
  document.getElementById(`motion-${floor}`).textContent    = `🏃 Motion: ${data.motion ? 'Yes' : 'No'}`;
  document.getElementById(`quake-${floor}`).textContent     = `🌎 Quake: ${fmt(data.vibration)}`;
  document.getElementById(`emergency-${floor}`).textContent = `🚨 Emergency: ${data.prediction?.toUpperCase() || 'Normal'}`;

  // 4️⃣ intruder snapshot (optional)
  if (data.intruderImage) {
    const intruderBox = document.getElementById(`intruder-${floor}`);
    const intruderImg = document.getElementById(`intruder-img-${floor}`);
    intruderImg.src   = data.intruderImage;
    intruderBox.style.display = 'block';

    // auto‑hide after 30 s
    setTimeout(() => (intruderBox.style.display = 'none'), 30_000);
  }
});

// ---------- mark offline if silent >15 s ----------
setInterval(() => {
  const now = nowTS();
  for (let floor = 1; floor <= floorCount; floor++) {
    const last = lastUpdateTimes[floor];
    const status  = document.getElementById(`status-${floor}`);
    const updated = document.getElementById(`last-updated-${floor}`);

    if (!last || now - last > 15_000) {
      status.innerHTML  = 'Status: <span class="offline">🔴 Offline</span>';
      updated.textContent = 'Last updated: more than 15 seconds ago';
    } else {
      const s = Math.round((now - last) / 1000);
      updated.textContent = `Last updated: ${s} s ago`;
    }
  }
}, 1_000);

// ---------- ML prediction alerts ----------
socket.on('ml-alert', ({ type, time }) => {
  if (!type || !time) return;

  clearTimeout(mlAlertTimeout);

  const tStr = new Date(time).toLocaleTimeString();
  alertBanner.textContent = `⚠️ ML Alert: ${type.toUpperCase()} detected at ${tStr}`;
  alertBanner.classList.add('active');

  mlAlertTimeout = setTimeout(() =>
    alertBanner.classList.remove('active'), 10_000);
});

socket.on('ml-normal', () => {
  clearTimeout(mlAlertTimeout);
  alertBanner.classList.remove('active');
});
