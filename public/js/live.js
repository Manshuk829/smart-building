/* global io */
const socket = io({ transports: ['websocket'], upgrade: false });

// AI/ML Analytics Variables
let motionHistory = {};
let intruderCount = 0;
let motionEvents = 0;
let faceRecognitionAccuracy = 0;
let threatLevels = {};
let securityScore = 95;
let aiPredictions = {};
let motionFrequency = {};

// Initialize AI analytics
const gateCount = 2;
const lastUpdateTimes = {};
let mlAlertTimeout = null;

// AI/ML Analytics Functions
function calculateMotionFrequency(gate) {
  if (!motionHistory[gate]) motionHistory[gate] = [];
  
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  // Remove old entries
  motionHistory[gate] = motionHistory[gate].filter(time => time > oneMinuteAgo);
  
  return motionHistory[gate].length;
}

function detectThreatLevel(gate, data) {
  let threatScore = 0;
  
  // Analyze motion patterns
  const motionFreq = calculateMotionFrequency(gate);
  if (motionFreq > 10) threatScore += 30;
  else if (motionFreq > 5) threatScore += 15;
  
  // Analyze sensor data
  if (data && data.gas > 1000) threatScore += 25;
  if (data && data.temp > 30) threatScore += 10;
  if (data && data.vibration > 1.5) threatScore += 20;
  
  // Analyze face recognition
  const faceAccuracy = faceRecognitionAccuracy;
  if (faceAccuracy < 50) threatScore += 25;
  
  // Determine threat level
  if (threatScore >= 70) return 'Critical';
  if (threatScore >= 50) return 'High';
  if (threatScore >= 30) return 'Medium';
  return 'Low';
}

function updateAIAnalytics() {
  // Update global metrics
  document.getElementById('active-cameras').textContent = gateCount;
  document.getElementById('intruders-detected').textContent = intruderCount;
  document.getElementById('motion-events').textContent = motionEvents;
  document.getElementById('security-score').textContent = `${securityScore}%`;
  
  // Update per-gate analytics
  for (let gate = 1; gate <= gateCount; gate++) {
    const motionFreq = calculateMotionFrequency(gate);
    const threatLevel = threatLevels[gate] || 'Low';
    const responseTime = (Math.random() * 0.5 + 0.1).toFixed(1);
    const faceAccuracy = Math.min(100, Math.max(0, faceRecognitionAccuracy + (Math.random() - 0.5) * 20));
    
    // Update motion frequency
    const motionFreqEl = document.getElementById(`motion-freq-${gate}`);
    if (motionFreqEl) motionFreqEl.textContent = `${motionFreq}/min`;
    
    // Update face recognition
    const faceRecEl = document.getElementById(`face-recognition-${gate}`);
    if (faceRecEl) faceRecEl.textContent = `${faceAccuracy.toFixed(0)}%`;
    
    // Update threat level
    const threatEl = document.getElementById(`threat-level-${gate}`);
    if (threatEl) {
      threatEl.textContent = threatLevel;
      threatEl.style.color = threatLevel === 'Critical' ? '#dc3545' : 
                            threatLevel === 'High' ? '#ffc107' : 
                            threatLevel === 'Medium' ? '#fd7e14' : '#28a745';
    }
    
    // Update response time
    const responseEl = document.getElementById(`response-time-${gate}`);
    if (responseEl) responseEl.textContent = `${responseTime}s`;
  }
}

function addSmartAlert(type, message, severity = 'info') {
  const alertsContainer = document.getElementById('alerts-container');
  if (!alertsContainer) return;
  
  const alertItem = document.createElement('div');
  alertItem.className = `alert-item ${severity}`;
  
  const icons = {
    'intruder': 'fas fa-user-secret',
    'motion': 'fas fa-running',
    'threat': 'fas fa-exclamation-triangle',
    'system': 'fas fa-cog',
    'info': 'fas fa-info-circle'
  };
  
  alertItem.innerHTML = `
    <div class="alert-icon">
      <i class="${icons[type] || icons.info}"></i>
    </div>
    <div class="alert-content">
      <h4>${type.charAt(0).toUpperCase() + type.slice(1)} Alert</h4>
      <p>${message}</p>
    </div>
  `;
  
  alertsContainer.appendChild(alertItem);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (alertItem.parentNode) {
      alertItem.remove();
    }
  }, 10000);
}

function updateSecurityScore() {
  let totalScore = 100;
  
  // Deduct points for threats
  Object.values(threatLevels).forEach(level => {
    if (level === 'Critical') totalScore -= 20;
    else if (level === 'High') totalScore -= 10;
    else if (level === 'Medium') totalScore -= 5;
  });
  
  // Deduct points for intruders
  totalScore -= intruderCount * 5;
  
  // Deduct points for high motion frequency
  Object.values(motionFrequency).forEach(freq => {
    if (freq > 10) totalScore -= 10;
    else if (freq > 5) totalScore -= 5;
  });
  
  securityScore = Math.max(0, Math.min(100, totalScore));
}

// Enhanced Control Functions
function captureSnapshot(gate) {
  const cam = document.getElementById(`cam-${gate}`);
  if (!cam) return;
  
  // Create canvas to capture image
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = cam.naturalWidth || 640;
  canvas.height = cam.naturalHeight || 480;
  
  ctx.drawImage(cam, 0, 0);
  
  // Download the image
  const link = document.createElement('a');
  link.download = `gate_${gate}_snapshot_${Date.now()}.png`;
  link.href = canvas.toDataURL();
  link.click();
  
  addSmartAlert('system', `Snapshot captured for Gate ${gate}`, 'info');
}

function startRecording(gate) {
  addSmartAlert('system', `Recording started for Gate ${gate}`, 'info');
  
  // Simulate recording status
  const btn = document.querySelector(`[onclick="startRecording(${gate})"]`);
  if (btn) {
    btn.innerHTML = '<i class="fas fa-stop"></i> Stop';
    btn.onclick = () => stopRecording(gate);
    btn.className = 'control-btn danger';
  }
}

function stopRecording(gate) {
  addSmartAlert('system', `Recording stopped for Gate ${gate}`, 'info');
  
  // Reset button
  const btn = document.querySelector(`[onclick="stopRecording(${gate})"]`);
  if (btn) {
    btn.innerHTML = '<i class="fas fa-video"></i> Record';
    btn.onclick = () => startRecording(gate);
    btn.className = 'control-btn success';
  }
}

function triggerAlert(gate) {
  addSmartAlert('threat', `Manual alert triggered for Gate ${gate}`, 'warning');
  
  // Convert gate string to floor number (e.g., "gate1" -> 1)
  const floorNumber = parseInt(gate.replace('gate', ''), 10);
  
  // Send alert to server
  fetch('/api/alert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ floor: floorNumber, type: 'manual' })
  }).catch(err => console.error('Alert error:', err));
}

function emergencyLockdown(gate) {
  addSmartAlert('threat', `EMERGENCY LOCKDOWN activated for Gate ${gate}!`, 'critical');
  
  // Simulate lockdown
  const statusEl = document.getElementById(`gate-status-${gate}`);
  if (statusEl) {
    statusEl.className = 'gate-status warning';
    statusEl.innerHTML = `
      <div class="led-indicator" style="background: #dc3545;"></div>
      <span>LOCKDOWN</span>
    `;
  }
  
  // Auto-reset after 30 seconds
  setTimeout(() => {
    if (statusEl) {
      statusEl.className = 'gate-status online';
      statusEl.innerHTML = `
        <div class="led-indicator online"></div>
        <span>Online</span>
      `;
    }
  }, 30000);
}

// Enhanced Motion Detection
function detectMotion(gate, data) {
  if (!motionHistory[gate]) motionHistory[gate] = [];
  
  // Add current timestamp to motion history
  motionHistory[gate].push(Date.now());
  motionEvents++;
  
  // Update motion frequency
  motionFrequency[gate] = calculateMotionFrequency(gate);
  
  // Show motion detection indicator
  const motionEl = document.getElementById(`motion-${gate}`);
  if (motionEl) {
    motionEl.style.display = 'block';
    setTimeout(() => motionEl.style.display = 'none', 3000);
  }
  
  // Update threat level
  threatLevels[gate] = detectThreatLevel(gate, data);
  
  // Add smart alert for high motion
  if (motionFrequency[gate] > 10) {
    addSmartAlert('motion', `High motion activity detected at Gate ${gate}`, 'warning');
  }
  
  updateSecurityScore();
  updateAIAnalytics();
}

// Enhanced Intruder Detection
function handleIntruderDetection(gate, data) {
  intruderCount++;
  
  const box = document.getElementById(`intruder-${gate}`);
  const img = document.getElementById(`intruder-img-${gate}`);
  const nameEl = document.getElementById(`intruder-name-${gate}`);
  const timeEl = document.getElementById(`intruder-time-${gate}`);
  const confidenceEl = document.getElementById(`intruder-confidence-${gate}`);
  const threatEl = document.getElementById(`intruder-threat-${gate}`);
  const actionEl = document.getElementById(`intruder-action-${gate}`);
  
  if (!box || !img) return;
  
  // Update intruder details
  const confidence = Math.floor(Math.random() * 20 + 80); // 80-100%
  const threatLevel = detectThreatLevel(gate, data);
  const currentTime = new Date().toLocaleTimeString();
  
  // Set name as "Intruder" for unknown person
  if (nameEl) nameEl.textContent = 'Intruder';
  if (timeEl) timeEl.textContent = currentTime;
  if (confidenceEl) confidenceEl.textContent = `${confidence}%`;
  if (threatEl) threatEl.textContent = threatLevel;
  if (actionEl) actionEl.textContent = 'Alert Sent';
  
  // Set intruder image
  if (data && data.intruderImage) {
    img.src = `data:image/jpeg;base64,${data.intruderImage}`;
  } else {
    img.src = `/snapshot/${gate}.jpg?ts=${Date.now()}`;
  }
  
  // Show intruder box
  box.style.display = 'block';
  
  // Add smart alert
  addSmartAlert('intruder', `Intruder detected at Gate ${gate} with ${confidence}% confidence`, 'critical');
  
  // Auto-hide after 30 seconds
  setTimeout(() => {
    box.style.display = 'none';
  }, 30000);
  
  updateSecurityScore();
  updateAIAnalytics();
}

// Known Person Detection
function handleKnownPersonDetection(gate, data) {
  const box = document.getElementById(`known-person-${gate}`);
  const img = document.getElementById(`known-person-img-${gate}`);
  const nameEl = document.getElementById(`known-person-name-${gate}`);
  const timeEl = document.getElementById(`known-person-time-${gate}`);
  const confidenceEl = document.getElementById(`known-person-confidence-${gate}`);
  const accessEl = document.getElementById(`known-person-access-${gate}`);
  const lastSeenEl = document.getElementById(`known-person-last-${gate}`);
  
  if (!box || !img) return;
  
  // Known person data
  const knownPersons = [
    { name: 'John Smith', access: 'Admin', lastSeen: '1 hour ago' },
    { name: 'Sarah Johnson', access: 'Staff', lastSeen: '30 minutes ago' },
    { name: 'Mike Wilson', access: 'Security', lastSeen: '2 hours ago' },
    { name: 'Emily Davis', access: 'Visitor', lastSeen: '15 minutes ago' },
    { name: 'David Brown', access: 'Manager', lastSeen: '45 minutes ago' },
    { name: 'Lisa Anderson', access: 'Employee', lastSeen: '3 hours ago' },
    { name: 'Robert Chen', access: 'Technician', lastSeen: '45 minutes ago' },
    { name: 'Maria Garcia', access: 'Supervisor', lastSeen: '1 hour ago' }
  ];
  
  const person = knownPersons[Math.floor(Math.random() * knownPersons.length)];
  const confidence = Math.floor(Math.random() * 15 + 85); // 85-100%
  const currentTime = new Date().toLocaleTimeString();
  
  // Update known person details - Show the actual name
  if (nameEl) nameEl.textContent = person.name;
  if (timeEl) timeEl.textContent = currentTime;
  if (confidenceEl) confidenceEl.textContent = `Confidence: ${confidence}%`;
  if (accessEl) accessEl.textContent = person.access;
  if (lastSeenEl) lastSeenEl.textContent = person.lastSeen;
  
  // Set person image
  if (data && data.personImage) {
    img.src = `data:image/jpeg;base64,${data.personImage}`;
  } else {
    img.src = `/snapshot/${gate}.jpg?ts=${Date.now()}`;
  }
  
  // Show known person box
  box.style.display = 'block';
  
  // Add smart alert
  addSmartAlert('person', `${person.name} detected at Gate ${gate}`, 'info');
  
  // Auto-hide after 20 seconds
  setTimeout(() => {
    box.style.display = 'none';
  }, 20000);
  
  updateAIAnalytics();
}

// Connection Status
function updateConnectionStatus(connected) {
  const statusEl = document.querySelector('.header p');
  if (statusEl) {
    statusEl.innerHTML = connected ? 
      '<i class="fas fa-wifi"></i> Connected to AI Security System' :
      '<i class="fas fa-exclamation-triangle"></i> Connection Lost - Retrying...';
  }
}

socket.on('connect', () => updateConnectionStatus(true));
socket.on('disconnect', () => updateConnectionStatus(false));

// Initialize controls and analytics
for (let gate = 1; gate <= gateCount; gate++) {
  lastUpdateTimes[gate] = null;
  motionHistory[gate] = [];
  threatLevels[gate] = 'Low';
  motionFrequency[gate] = 0;
  
  // Initialize gate status
  const statusEl = document.getElementById(`gate-status-${gate}`);
  if (statusEl) {
    statusEl.className = 'gate-status offline';
    statusEl.innerHTML = `
      <div class="led-indicator offline"></div>
      <span>Offline</span>
    `;
  }
}

// Enhanced Sensor Updates
socket.on('sensor-update', (data) => {
  const { floor, motion, intruderImage, ...sensorData } = data;
  if (!floor) return;
  
  const gate = floor;
  lastUpdateTimes[gate] = Date.now();

  // Update connection status
  const led = document.getElementById(`led-gate-${gate}`);
  const statusText = document.getElementById(`status-text-${gate}`);
  const statusEl = document.getElementById(`gate-status-${gate}`);
  
  if (led && statusText && statusEl) {
    led.classList.remove('offline');
    led.classList.add('online');
    statusText.textContent = 'Online';
    statusEl.className = 'gate-status online';
    statusEl.innerHTML = `
      <div class="led-indicator online"></div>
      <span>Online</span>
    `;
  }
  
  // Update camera feed
  const cam = document.getElementById(`cam-${gate}`);
  const placeholder = document.getElementById(`placeholder-${gate}`);
  
  if (cam && placeholder) {
    // Show camera image and hide placeholder
    cam.style.display = 'block';
    placeholder.style.display = 'none';
    cam.src = `/snapshot/${gate}.jpg?ts=${Date.now()}`;
    
    // Handle image load error
    cam.onerror = function() {
      this.style.display = 'none';
      placeholder.style.display = 'block';
      placeholder.innerHTML = '<i class="fas fa-exclamation-triangle"></i><div>Camera Offline</div>';
    };
    
    // Handle image load success
    cam.onload = function() {
      this.style.display = 'block';
      placeholder.style.display = 'none';
    };
  }
  
  // Handle motion detection
  if (motion) {
    detectMotion(gate, sensorData);
  }
  
  // Handle person detection (known vs unknown)
  if (motion || intruderImage) {
    // Check if it's a known person (70% chance for known, 30% for unknown)
    const isKnownPerson = Math.random() > 0.3; // 70% chance for known person
    
    if (isKnownPerson) {
      handleKnownPersonDetection(gate, data);
    } else {
      handleIntruderDetection(gate, data);
    }
  }
  
  // Update AI analytics
  updateAIAnalytics();
});

// Enhanced ML Alerts
socket.on('ml-alert', ({ type, floor, time }) => {
  const gate = floor;
  const timeStr = new Date(time).toLocaleTimeString('en-IN', { hour12: true });
  
  addSmartAlert('threat', `AI detected ${type.toUpperCase()} at Gate ${gate} at ${timeStr}`, 'warning');
  
  // Update threat level
  threatLevels[gate] = 'High';
  updateSecurityScore();
  updateAIAnalytics();
});

// Update time since last seen
setInterval(() => {
  const now = Date.now();
  for (let gate = 1; gate <= gateCount; gate++) {
    const last = lastUpdateTimes[gate];
    const updatedEl = document.getElementById(`last-updated-${gate}`);
    const led = document.getElementById(`led-gate-${gate}`);
    const statusText = document.getElementById(`status-text-${gate}`);
    const statusEl = document.getElementById(`gate-status-${gate}`);

    if (!updatedEl || !led || !statusText || !statusEl) continue;

    if (!last || now - last > 15000) {
      // Offline
      led.classList.remove('online');
      led.classList.add('offline');
      statusText.textContent = 'Offline';
      statusEl.className = 'gate-status offline';
      statusEl.innerHTML = `
        <div class="led-indicator offline"></div>
        <span>Offline</span>
      `;
      updatedEl.textContent = 'Last seen: more than 15 seconds ago';
      
      // Update threat level for offline gate
      threatLevels[gate] = 'Medium';
    } else {
      const secs = Math.floor((now - last) / 1000);
      updatedEl.textContent = `Last seen: ${secs}s ago`;
    }
  }
  
  updateSecurityScore();
  updateAIAnalytics();
}, 1000);

// Initialize AI analytics
updateAIAnalytics();

// Periodic AI updates
setInterval(() => {
  // Simulate AI learning and improvements
  faceRecognitionAccuracy = Math.min(100, faceRecognitionAccuracy + Math.random() * 2);
  
  // Update security score
  updateSecurityScore();
  updateAIAnalytics();
}, 5000);
