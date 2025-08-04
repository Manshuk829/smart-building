/* global io */
const socket = io({ transports: ['websocket'], upgrade: false });

const gateCount = 2; // Gate 1 and Gate 2
const lastUpdateTimes = {};
const mqttStatus = document.getElementById('mqtt-status');
const alertBanner = document.getElementById('ml-alert-banner');
let mlAlertTimeout = null;

// MQTT status
function updateConnectionStatus(connected) {
  mqttStatus.innerHTML = `WebSocket Status:
    <span class="${connected ? 'online' : 'offline'}" title="${connected ? 'Connected' : 'Disconnected'}">
      ${connected ? '🟢 Connected' : '🔴 Disconnected'}
    </span>`;
}
socket.on('connect', () => updateConnectionStatus(true));
socket.on('disconnect', () => updateConnectionStatus(false));

// Initialize controls per gate
for (let gate = 1; gate <= gateCount; gate++) {
  lastUpdateTimes[gate] = null;

  document.querySelector(`[data-gate="${gate}"].download-snapshot`)?.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = `/snapshot/${gate}.jpg?ts=${Date.now()}`;
    link.download = `gate_${gate}_snapshot.jpg`;
    link.click();
  });

  document.querySelector(`[data-gate="${gate}"].trigger-alert`)?.addEventListener('click', () => {
    fetch('/api/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ floor: gate })  // floor is still used on server
    })
      .then(res => res.ok
        ? alert(`✅ Alert triggered for Gate ${gate}`)
        : alert('❌ Failed to trigger alert'))
      .catch(err => {
        console.error(err);
        alert('⚠️ Error contacting server');
      });
  });
}

// Handle sensor-update
socket.on('sensor-update', ({ floor }) => {
  if (!floor) return;
  const gate = floor;
  lastUpdateTimes[gate] = Date.now();

  const led = document.getElementById(`led-gate-${gate}`);
  const statusText = document.getElementById(`status-text-${gate}`);
  if (led && statusText) {
    led.classList.remove('offline');
    led.classList.add('online');
    statusText.textContent = 'Online';
    statusText.classList.remove('offline');
    statusText.classList.add('online');
  }

  const cam = document.getElementById(`cam-${gate}`);
  if (cam) cam.src = `/snapshot/${gate}.jpg?ts=${Date.now()}`;
});

// Update time since last seen
setInterval(() => {
  const now = Date.now();
  for (let gate = 1; gate <= gateCount; gate++) {
    const last = lastUpdateTimes[gate];
    const updatedEl = document.getElementById(`last-updated-${gate}`);
    const led = document.getElementById(`led-gate-${gate}`);
    const statusText = document.getElementById(`status-text-${gate}`);

    if (!updatedEl || !led || !statusText) continue;

    if (!last || now - last > 15000) {
      // Offline
      led.classList.remove('online');
      led.classList.add('offline');
      statusText.textContent = 'Offline';
      statusText.classList.remove('online');
      statusText.classList.add('offline');
      updatedEl.textContent = 'Last seen: more than 15 seconds ago';
    } else {
      const secs = Math.floor((now - last) / 1000);
      updatedEl.textContent = `Last seen: ${secs}s ago`;
    }
  }
}, 1000);

// Intruder alert
socket.on('intruder-alert', ({ floor, image, name }) => {
  const gate = floor;
  const box = document.getElementById(`intruder-${gate}`);
  const img = document.getElementById(`intruder-img-${gate}`);
  const nameTag = document.getElementById(`intruder-name-${gate}`);

  if (!box || !img || !nameTag) return;

  if (name && name.toLowerCase() !== 'intruder') {
    nameTag.textContent = `✅ Known Person: ${name}`;
    img.style.display = 'none';
  } else if (image) {
    nameTag.textContent = '🚨 Intruder Detected!';
    img.src = `data:image/jpeg;base64,${image}`;
    img.style.display = 'block';
  } else {
    nameTag.textContent = '🚨 Unknown movement detected.';
    img.style.display = 'none';
  }

  box.style.display = 'block';
  box.style.opacity = '1';

  setTimeout(() => {
    box.style.transition = 'opacity 1s ease';
    box.style.opacity = '0';
    setTimeout(() => box.style.display = 'none', 1000);
  }, 30000);
});

// ML alert banner
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
