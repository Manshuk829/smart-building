/**
 * Modern Live Page with Real-Time AI/ML Processing
 * Features:
 * - Real-time ML predictions
 * - Edge AI processing
 * - WebSocket streaming
 * - Advanced visualizations
 * - Modern UI components
 */

/* global io */
const socket = io({ transports: ['websocket'], upgrade: false });

// Modern AI/ML Services
class ModernLivePage {
  constructor() {
    this.realTimeML = null;
    this.edgeAI = null;
    this.analytics = null;
    this.streams = new Map();
    this.predictions = new Map();
    this.gateCount = 2;
    this.lastUpdateTimes = {};
    this.motionHistory = {};
    this.threatLevels = {};
    this.initialize();
  }

  async initialize() {
    console.log('🚀 Initializing Modern Live Page...');
    
    // Initialize Real-Time ML Processor
    await this.initializeRealTimeML();
    
    // Initialize Edge AI
    await this.initializeEdgeAI();
    
    // Initialize Analytics
    this.initializeAnalytics();
    
    // Setup WebSocket streams
    this.setupStreams();
    
    // Setup real-time updates
    this.setupRealTimeUpdates();
    
    console.log('✅ Modern Live Page initialized');
  }

  /**
   * Initialize Real-Time ML Processor
   */
  async initializeRealTimeML() {
    try {
      // In production, load TensorFlow.js models
      this.realTimeML = {
        predict: async (data) => {
          // Real-time prediction via API
          const response = await fetch('/api/modern/ml/realtime-predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data })
          });
          return await response.json();
        },
        processStream: async (data) => {
          return await this.realTimeML.predict(data);
        }
      };
      console.log('✅ Real-Time ML Processor ready');
    } catch (error) {
      console.error('❌ Real-Time ML initialization failed:', error);
    }
  }

  /**
   * Initialize Edge AI
   */
  async initializeEdgeAI() {
    try {
      this.edgeAI = {
        process: async (data, modelType = 'threat-detection') => {
          const response = await fetch('/api/modern/edge-ai/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, modelType })
          });
          return await response.json();
        }
      };
      console.log('✅ Edge AI ready');
    } catch (error) {
      console.error('❌ Edge AI initialization failed:', error);
    }
  }

  /**
   * Initialize Analytics
   */
  initializeAnalytics() {
    this.analytics = {
      metrics: {
        activeCameras: this.gateCount,
        intrudersDetected: 0,
        motionEvents: 0,
        securityScore: 95,
        aiConfidence: 92,
        avgResponseTime: 0.15,
        threatLevel: 'Low'
      },
      update: () => {
        this.updateAnalyticsDisplay();
      }
    };
    
    // Fetch real-time analytics
    setInterval(async () => {
      try {
        const response = await fetch('/api/modern/analytics/realtime');
        const data = await response.json();
        if (data.status === 'success') {
          this.analytics.metrics = { ...this.analytics.metrics, ...data.metrics };
          this.analytics.update();
        }
      } catch (error) {
        console.error('Analytics fetch error:', error);
      }
    }, 2000);
  }

  /**
   * Setup WebSocket streams
   */
  setupStreams() {
    // Subscribe to sensor stream
    socket.emit('subscribe', 'sensors');
    socket.on('stream:sensors', (data) => {
      this.handleSensorStream(data);
    });

    // Subscribe to threat stream
    socket.emit('subscribe', 'threats');
    socket.on('stream:threats', (data) => {
      this.handleThreatStream(data);
    });

    // Subscribe to analytics stream
    socket.emit('subscribe', 'analytics');
    socket.on('stream:analytics', (data) => {
      this.handleAnalyticsStream(data);
    });
  }

  /**
   * Setup real-time updates
   */
  setupRealTimeUpdates() {
    // Sensor updates
    socket.on('sensor-update', async (data) => {
      await this.processSensorUpdate(data);
    });

    // ML alerts
    socket.on('ml-alert', (data) => {
      this.handleMLAlert(data);
    });

    // Intruder alerts
    socket.on('intruder-alert', (data) => {
      this.handleIntruderAlert(data);
    });

    // Visitor detected
    socket.on('visitor-detected', (data) => {
      this.handleVisitorDetected(data);
    });
  }

  /**
   * Process sensor update with ML
   */
  async processSensorUpdate(data) {
    const { floor, temp, humidity, gas, vibration, flame, motion, name, intruderImage } = data;
    const gate = floor;

    // Update last update time
    this.lastUpdateTimes[gate] = Date.now();

    // Prepare data for ML processing
    const sensorData = {
      temp: temp || 25,
      humidity: humidity || 50,
      gas: gas || 200,
      vibration: vibration || 0.5,
      flame: flame || 0,
      motion: motion ? 1 : 0
    };

    // Real-time ML prediction
    if (this.realTimeML) {
      try {
        const prediction = await this.realTimeML.processStream(sensorData);
        this.predictions.set(gate, prediction);
        this.updateMLDisplay(gate, prediction);
      } catch (error) {
        console.error(`ML prediction error for gate ${gate}:`, error);
      }
    }

    // Edge AI processing (faster, local)
    if (this.edgeAI) {
      try {
        const edgeResult = await this.edgeAI.process(sensorData, 'threat-detection');
        this.updateEdgeAIDisplay(gate, edgeResult);
      } catch (error) {
        console.error(`Edge AI error for gate ${gate}:`, error);
      }
    }

    // Update camera feed
    this.updateCameraFeed(gate, intruderImage, name);

    // Update motion detection
    if (motion) {
      this.detectMotion(gate, sensorData);
    }

    // Update threat levels
    this.updateThreatLevel(gate, sensorData);
  }

  /**
   * Handle sensor stream
   */
  handleSensorStream(data) {
    // Process streaming sensor data
    this.processSensorUpdate(data.data);
  }

  /**
   * Handle threat stream
   */
  handleThreatStream(data) {
    const threats = data.data;
    this.updateThreatDisplay(threats);
  }

  /**
   * Handle analytics stream
   */
  handleAnalyticsStream(data) {
    const analytics = data.data;
    this.analytics.metrics = { ...this.analytics.metrics, ...analytics };
    this.analytics.update();
  }

  /**
   * Update ML display
   */
  updateMLDisplay(gate, prediction) {
    const mlContainer = document.getElementById(`ml-prediction-${gate}`);
    if (!mlContainer) return;

    if (prediction.prediction) {
      const { anomaly, threat } = prediction.prediction;
      
      let html = '<div class="ml-prediction">';
      
      if (anomaly && anomaly.isAnomaly) {
        html += `<div class="ml-alert anomaly">
          <i class="fas fa-exclamation-triangle"></i>
          Anomaly: ${anomaly.confidence.toFixed(1)}% confidence
        </div>`;
      }
      
      if (threat && threat.overall > 0.5) {
        html += `<div class="ml-alert threat">
          <i class="fas fa-shield-alt"></i>
          Threat Level: ${(threat.overall * 100).toFixed(1)}%
        </div>`;
      }
      
      html += '</div>';
      mlContainer.innerHTML = html;
    }
  }

  /**
   * Update Edge AI display
   */
  updateEdgeAIDisplay(gate, edgeResult) {
    const edgeContainer = document.getElementById(`edge-ai-${gate}`);
    if (!edgeContainer || !edgeResult.result) return;

    const { fire, gas, overall, latency } = edgeResult.result;
    
    let html = '<div class="edge-ai-badge">';
    html += `<span class="edge-label">Edge AI</span>`;
    html += `<span class="edge-threat">Threat: ${(overall * 100).toFixed(0)}%</span>`;
    html += `<span class="edge-latency">${latency}ms</span>`;
    html += '</div>';
    
    edgeContainer.innerHTML = html;
  }

  /**
   * Update camera feed
   */
  updateCameraFeed(gate, image, name) {
    const cam = document.getElementById(`cam-${gate}`);
    const placeholder = document.getElementById(`placeholder-${gate}`);
    const statusText = document.getElementById(`status-text-${gate}`);
    const led = document.getElementById(`led-gate-${gate}`);

    if (!cam || !placeholder) return;

    const isOnline = this.lastUpdateTimes[gate] && (Date.now() - this.lastUpdateTimes[gate]) < 30000;

    if (isOnline && (image || name)) {
      // Online and has data
      if (image) {
        cam.src = `data:image/jpeg;base64,${image}`;
      } else {
        cam.src = `/snapshot/${gate}.jpg?ts=${Date.now()}`;
      }
      cam.style.display = 'block';
      placeholder.style.display = 'none';
      
      if (led) {
        led.classList.remove('offline');
        led.classList.add('online');
      }
      if (statusText) {
        statusText.textContent = name ? `Known: ${name}` : 'Online';
      }
    } else if (isOnline) {
      // Online but no image yet
      cam.src = `/snapshot/${gate}.jpg?ts=${Date.now()}`;
      cam.onerror = () => {
        cam.style.display = 'none';
        placeholder.style.display = 'block';
      };
      cam.onload = () => {
        cam.style.display = 'block';
        placeholder.style.display = 'none';
      };
    } else {
      // Offline
      cam.style.display = 'none';
      placeholder.style.display = 'block';
      if (led) {
        led.classList.remove('online');
        led.classList.add('offline');
      }
      if (statusText) {
        statusText.textContent = 'Offline';
      }
    }
  }

  /**
   * Detect motion
   */
  detectMotion(gate, data) {
    if (!this.motionHistory[gate]) {
      this.motionHistory[gate] = [];
    }

    this.motionHistory[gate].push(Date.now());
    
    // Keep last minute
    const oneMinuteAgo = Date.now() - 60000;
    this.motionHistory[gate] = this.motionHistory[gate].filter(t => t > oneMinuteAgo);

    const motionEl = document.getElementById(`motion-${gate}`);
    if (motionEl) {
      motionEl.style.display = 'block';
      setTimeout(() => {
        motionEl.style.display = 'none';
      }, 2000);
    }

    this.analytics.metrics.motionEvents++;
    this.analytics.update();
  }

  /**
   * Update threat level
   */
  updateThreatLevel(gate, data) {
    let threatScore = 0;

    if (data.gas > 500) threatScore += 30;
    if (data.temp > 50) threatScore += 25;
    if (data.flame > 100) threatScore += 40;
    if (data.vibration > 5) threatScore += 20;

    const motionFreq = this.motionHistory[gate]?.length || 0;
    if (motionFreq > 10) threatScore += 15;

    let level = 'Low';
    if (threatScore >= 70) level = 'Critical';
    else if (threatScore >= 50) level = 'High';
    else if (threatScore >= 30) level = 'Medium';

    this.threatLevels[gate] = level;
    this.updateThreatDisplayElement(gate, level);
  }

  /**
   * Update threat display element
   */
  updateThreatDisplayElement(gate, level) {
    const threatEl = document.getElementById(`threat-level-${gate}`);
    if (threatEl) {
      threatEl.textContent = level;
      threatEl.className = `threat-level ${level.toLowerCase()}`;
    }
  }

  /**
   * Update threat display
   */
  updateThreatDisplay(threats) {
    // Update global threat display
    const threatContainer = document.getElementById('threat-display');
    if (threatContainer) {
      let html = '<div class="threat-summary">';
      threats.forEach((threat, index) => {
        html += `<div class="threat-item ${threat.severity}">
          <i class="fas fa-exclamation-circle"></i>
          ${threat.type}: ${threat.level}%
        </div>`;
      });
      html += '</div>';
      threatContainer.innerHTML = html;
    }
  }

  /**
   * Handle ML alert
   */
  handleMLAlert(data) {
    this.showAlert({
      type: 'ml',
      severity: data.severity || 'warning',
      message: data.message || 'ML threat detected',
      floor: data.floor,
      confidence: data.confidence || 85
    });
  }

  /**
   * Handle intruder alert
   */
  handleIntruderAlert(data) {
    this.analytics.metrics.intrudersDetected++;
    this.analytics.update();
    
    this.showAlert({
      type: 'intruder',
      severity: 'critical',
      message: `Intruder detected at Gate ${data.floor}`,
      floor: data.floor,
      image: data.image
    });
  }

  /**
   * Handle visitor detected
   */
  handleVisitorDetected(data) {
    this.showAlert({
      type: 'visitor',
      severity: 'info',
      message: `Known person detected: ${data.name} at Gate ${data.floor}`,
      floor: data.floor,
      name: data.name
    });
  }

  /**
   * Show alert
   */
  showAlert(alert) {
    const container = document.getElementById('alerts-container');
    if (!container) return;

    const alertEl = document.createElement('div');
    alertEl.className = `alert-item ${alert.severity}`;
    alertEl.innerHTML = `
      <i class="fas fa-${alert.type === 'intruder' ? 'user-secret' : alert.type === 'ml' ? 'brain' : 'user-check'}"></i>
      <div class="alert-content">
        <strong>${alert.message}</strong>
        ${alert.confidence ? `<span class="confidence">${alert.confidence}% confidence</span>` : ''}
      </div>
      <button class="alert-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;

    container.insertBefore(alertEl, container.firstChild);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      alertEl.remove();
    }, 10000);
  }

  /**
   * Update analytics display
   */
  updateAnalyticsDisplay() {
    const metrics = this.analytics.metrics;
    
    document.getElementById('active-cameras').textContent = metrics.activeCameras || this.gateCount;
    document.getElementById('intruders-detected').textContent = metrics.intrudersDetected || 0;
    document.getElementById('motion-events').textContent = metrics.motionEvents || 0;
    document.getElementById('security-score').textContent = `${metrics.securityScore || 95}%`;
    
    // Update AI confidence if available
    const aiConfidenceEl = document.getElementById('ai-confidence');
    if (aiConfidenceEl) {
      aiConfidenceEl.textContent = `${metrics.aiConfidence || 92}%`;
    }
  }

  /**
   * Update camera status
   */
  updateCameraStatus() {
    setInterval(() => {
      const now = Date.now();
      for (let gate = 1; gate <= this.gateCount; gate++) {
        const lastUpdate = this.lastUpdateTimes[gate];
        const isOnline = lastUpdate && (now - lastUpdate) < 30000;
        
        const statusEl = document.getElementById(`status-text-${gate}`);
        const ledEl = document.getElementById(`led-gate-${gate}`);
        
        if (statusEl) {
          statusEl.textContent = isOnline ? 'Online' : 'Offline';
        }
        
        if (ledEl) {
          if (isOnline) {
            ledEl.classList.remove('offline');
            ledEl.classList.add('online');
          } else {
            ledEl.classList.remove('online');
            ledEl.classList.add('offline');
          }
        }
      }
    }, 1000);
  }
}

// Initialize when page loads
let modernLivePage;
document.addEventListener('DOMContentLoaded', () => {
  modernLivePage = new ModernLivePage();
  modernLivePage.updateCameraStatus();
});

// Export for global access
window.modernLivePage = modernLivePage;

