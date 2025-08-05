let chartRefs = {};
let chartTypes = {};
let mlOverlays = {};
let sensorData = [];
let aiPredictions = {};
let anomalyThresholds = {};

// -------------------- AI/ML Analytics Functions --------------------
function calculateMovingAverage(data, window = 5) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const values = data.slice(start, i + 1).map(d => d.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    result.push({ ...data[i], movingAvg: avg });
  }
  return result;
}

function detectAnomalies(data, threshold = 2) {
  const values = data.map(d => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  return data.map(d => ({
    ...d,
    isAnomaly: Math.abs(d.value - mean) > threshold * stdDev,
    anomalyScore: Math.abs(d.value - mean) / stdDev
  }));
}

function predictTrend(data, steps = 5) {
  if (data.length < 3) return [];
  
  const x = data.map((_, i) => i);
  const y = data.map(d => d.value);
  
  // Simple linear regression
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumXX = x.reduce((a, b) => a + b * b, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  const predictions = [];
  for (let i = 0; i < steps; i++) {
    const futureX = data.length + i;
    const predictedValue = slope * futureX + intercept;
    predictions.push({
      value: predictedValue,
      createdAt: new Date(Date.now() + i * 60000), // 1 min intervals
      isPrediction: true
    });
  }
  
  return predictions;
}

function calculateSmartThresholds(data) {
  const values = data.map(d => d.value);
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  
  return {
    lowerBound: q1 - 1.5 * iqr,
    upperBound: q3 + 1.5 * iqr,
    mean: values.reduce((a, b) => a + b, 0) / values.length,
    median: sorted[Math.floor(sorted.length / 2)]
  };
}

// -------------------- Generate Sample Data for Testing --------------------
function generateSampleData() {
  const sampleData = [];
  const now = new Date();
  
  for (let i = 0; i < 50; i++) {
    const timestamp = new Date(now.getTime() - (50 - i) * 60000); // 1 min intervals
    sampleData.push({
      createdAt: timestamp,
      temperature: 20 + Math.sin(i * 0.2) * 5 + Math.random() * 2,
      humidity: 50 + Math.cos(i * 0.3) * 10 + Math.random() * 5,
      gas: 200 + Math.sin(i * 0.1) * 50 + Math.random() * 20,
      flame: Math.random() > 0.95 ? 1 : 0,
      motion: Math.random() > 0.8 ? 1 : 0,
      vibration: Math.random() * 2 + Math.sin(i * 0.4) * 0.5
    });
  }
  
  return sampleData;
}

// -------------------- Enhanced Chart Creation --------------------
function createChart(ctx, label, data, color, type = 'line', mlOverlayTimes = []) {
  // Ensure we have data to work with
  if (!data || data.length === 0) {
    console.log(`No data available for ${label}, using sample data`);
    data = generateSampleData().map(d => ({
      createdAt: d.createdAt,
      value: d[label.toLowerCase()] || d.temperature || Math.random() * 100
    }));
  }
  if (!data || data.length === 0) {
    console.warn(`No data available for ${label}`);
    return null;
  }

  const avg = (data.reduce((acc, d) => acc + d.value, 0) / data.length).toFixed(2);
  const min = Math.min(...data.map(d => d.value));
  const max = Math.max(...data.map(d => d.value));
  const timestamps = data.map(d => new Date(d.createdAt).toLocaleString());

  // AI/ML Enhancements
  const processedData = detectAnomalies(data);
  const movingAvgData = calculateMovingAverage(data);
  const predictions = predictTrend(data);
  const thresholds = calculateSmartThresholds(data);

  const annotations = [
    // ML Alert annotations
    ...mlOverlayTimes.map(ts => ({
      type: 'line',
      mode: 'vertical',
      scaleID: 'x',
      value: new Date(ts).toLocaleString(),
      borderColor: '#ff0000',
      borderWidth: 2,
      label: {
        content: 'ML Alert',
        enabled: true,
        position: 'top'
      }
    })),
    // Anomaly annotations
    ...processedData.filter(d => d.isAnomaly).map((d, i) => ({
      type: 'point',
      xValue: new Date(d.createdAt).toLocaleString(),
      yValue: d.value,
      backgroundColor: '#ff6b6b',
      borderColor: '#ff6b6b',
      borderWidth: 3,
      radius: 6,
      label: {
        content: `Anomaly (${d.anomalyScore.toFixed(2)}σ)`,
        enabled: true,
        position: 'top'
      }
    }))
  ];

  const datasets = [
    {
      label,
      data: data.map(d => d.value),
      borderColor: color,
      backgroundColor: color + '33',
      fill: true,
      tension: 0.4,
      pointRadius: 0
    },
    {
      label: 'Moving Average',
      data: movingAvgData.map(d => d.movingAvg),
      borderColor: '#ffa726',
      borderWidth: 2,
      pointRadius: 0,
      fill: false
    }
  ];

  // Add predictions if available
  if (predictions.length > 0) {
    datasets.push({
      label: 'Predictions',
      data: [...Array(data.length).fill(null), ...predictions.map(d => d.value)],
      borderColor: '#4caf50',
      borderDash: [10, 5],
      pointRadius: 0,
      fill: false
    });
  }

  // Add threshold lines
  datasets.push(
    {
      label: 'Upper Threshold',
      data: Array(data.length + predictions.length).fill(thresholds.upperBound),
      borderColor: '#f44336',
      borderDash: [5, 5],
      pointRadius: 0,
      fill: false
    },
    {
      label: 'Lower Threshold',
      data: Array(data.length + predictions.length).fill(thresholds.lowerBound),
      borderColor: '#2196f3',
      borderDash: [5, 5],
      pointRadius: 0,
      fill: false
    }
  );

  const chart = new Chart(ctx, {
    type,
    data: {
      labels: [...timestamps, ...predictions.map(d => new Date(d.createdAt).toLocaleString())],
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      plugins: {
        legend: {
          labels: {
            color: getComputedStyle(document.body).color
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const label = ctx.dataset.label || '';
              const value = ctx.parsed.y;
              if (ctx.dataset.label === 'Predictions') {
                return `${label}: ${value} (AI Prediction)`;
              }
              return `${label}: ${value}`;
            }
          }
        },
        annotation: {
          annotations
        },
        zoom: {
          pan: { enabled: true, mode: 'x' },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x'
          }
        }
      },
      scales: {
        x: {
          ticks: { color: getComputedStyle(document.body).color },
          title: {
            display: true,
            text: 'Timestamp',
            color: getComputedStyle(document.body).color
          }
        },
        y: {
          beginAtZero: true,
          ticks: { color: getComputedStyle(document.body).color },
          title: {
            display: true,
            text: label,
            color: getComputedStyle(document.body).color
          }
        }
      }
    }
  });

  chartRefs[ctx.id] = chart;
  chartTypes[ctx.id] = type;
  aiPredictions[ctx.id] = predictions;
  anomalyThresholds[ctx.id] = thresholds;
  return chart;
}

// -------------------- AI/ML Analytics Dashboard --------------------
function updateAIAnalytics() {
  const aiContainer = document.getElementById('ai-analytics');
  if (!aiContainer) return;

  let html = '<div class="ai-analytics">';
  html += '<h3>🤖 AI/ML Analytics</h3>';
  
  Object.keys(chartRefs).forEach(chartId => {
    const predictions = aiPredictions[chartId] || [];
    const thresholds = anomalyThresholds[chartId] || {};
    const data = sensorData.filter(d => d[getDataKey(chartId)] !== undefined);
    
    if (data.length > 0) {
      const latestValue = data[data.length - 1][getDataKey(chartId)];
      const trend = predictions.length > 0 ? predictions[predictions.length - 1].value : latestValue;
      const trendDirection = trend > latestValue ? '↗️ Rising' : trend < latestValue ? '↘️ Falling' : '→ Stable';
      
      html += `
        <div class="ai-metric">
          <h4>${getChartLabel(chartId)}</h4>
          <p>Current: ${latestValue}</p>
          <p>Predicted: ${trend.toFixed(2)} (${trendDirection})</p>
          <p>Threshold: ${thresholds.lowerBound?.toFixed(2)} - ${thresholds.upperBound?.toFixed(2)}</p>
        </div>
      `;
    }
  });
  
  html += '</div>';
  aiContainer.innerHTML = html;
}

function getDataKey(chartId) {
  const keyMap = {
    'tempChart': 'temperature',
    'humidityChart': 'humidity',
    'gasChart': 'gas',
    'flameChart': 'flame',
    'motionChart': 'motion',
    'vibrationChart': 'vibration'
  };
  return keyMap[chartId] || 'temperature';
}

function getChartLabel(chartId) {
  const labelMap = {
    'tempChart': '🌡 Temperature',
    'humidityChart': '💧 Humidity',
    'gasChart': '🌫 Gas',
    'flameChart': '🔥 Flame',
    'motionChart': '🚶 Motion',
    'vibrationChart': '💥 Vibration'
  };
  return labelMap[chartId] || 'Sensor';
}

// -------------------- Enhanced Rendering --------------------
function renderCharts() {
  console.log('Starting chart rendering...');
  
  // If no sensor data, generate sample data for testing
  if (!sensorData || sensorData.length === 0) {
    console.log('No sensor data found, generating sample data for testing...');
    sensorData = generateSampleData();
  }
  
  console.log('Sensor data available:', sensorData.length, 'records');

  const prepareData = key => sensorData.map(d => ({
    value: d[key],
    createdAt: d.createdAt
  })).filter(d => d.value !== undefined && d.value !== null);

  const chartDefs = [
    { id: 'tempChart', key: 'temperature', label: 'Temperature (°C)', color: '#e74c3c' },
    { id: 'humidityChart', key: 'humidity', label: 'Humidity (%)', color: '#3498db' },
    { id: 'gasChart', key: 'gas', label: 'Gas (ppm)', color: '#9b59b6' },
    { id: 'flameChart', key: 'flame', label: 'Flame', color: '#f39c12' },
    { id: 'motionChart', key: 'motion', label: 'Motion', color: '#2ecc71' },
    { id: 'vibrationChart', key: 'vibration', label: 'Vibration', color: '#8e44ad' }
  ];

  chartDefs.forEach(({ id, key, label, color }) => {
    const canvas = document.getElementById(id);
    if (!canvas) {
      console.warn(`Canvas element ${id} not found`);
      return;
    }
    
    const data = prepareData(key);
    if (data.length === 0) {
      console.warn(`No data for ${key}`);
      return;
    }
    
    const type = chartTypes[id] || 'line';
    const mlLines = mlOverlays[id] || [];
    
    if (chartRefs[id]) {
      chartRefs[id].destroy();
    }
    
    createChart(canvas, label, data, color, type, mlLines);
  });

  updateAIAnalytics();
  updatePerformanceMetrics();
}

// -------------------- Performance Metrics Update --------------------
function updatePerformanceMetrics() {
  if (!sensorData || sensorData.length === 0) return;

  // Update data points
  const dataPointsEl = document.getElementById('dataPoints');
  if (dataPointsEl) {
    dataPointsEl.textContent = sensorData.length;
  }

  // Calculate trend direction
  const values = sensorData.map(d => d.temperature || d.humidity || d.gas || 0);
  const trendDirectionEl = document.getElementById('trendDirection');
  if (trendDirectionEl && values.length > 1) {
    const trend = values[values.length - 1] > values[0] ? '↗️ Rising' : 
                 values[values.length - 1] < values[0] ? '↘️ Falling' : '→ Stable';
    trendDirectionEl.textContent = trend;
  }

  // Calculate anomalies
  const anomalyCountEl = document.getElementById('anomalyCount');
  if (anomalyCountEl && values.length > 0) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const anomalies = values.filter(v => Math.abs(v - mean) > mean * 0.3).length;
    anomalyCountEl.textContent = anomalies;
  }

  // AI confidence
  const aiConfidenceEl = document.getElementById('aiConfidence');
  if (aiConfidenceEl && values.length > 0) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const anomalies = values.filter(v => Math.abs(v - mean) > mean * 0.3).length;
    const confidence = Math.min(95, Math.max(60, 100 - (anomalies / values.length * 100)));
    aiConfidenceEl.textContent = `${confidence.toFixed(1)}%`;
  }
}

// -------------------- Enhanced Socket.IO Updates --------------------
const socket = io();

socket.on('sensor-update', newData => {
  if (!sensorData) sensorData = [];
  newData.createdAt = new Date();
  sensorData.push(newData);
  renderCharts();
});

socket.on('ml-line', ({ floor, prediction, timestamp }) => {
  const affectedTypes = ['tempChart', 'humidityChart', 'gasChart', 'vibrationChart', 'motionChart', 'flameChart'];
  affectedTypes.forEach(chartId => {
    if (!mlOverlays[chartId]) mlOverlays[chartId] = [];
    mlOverlays[chartId].push(timestamp);
  });
  renderCharts();
});

// -------------------- Enhanced Tools --------------------
function toggleChartType(chartId, key, label) {
  const current = chartTypes[chartId] || 'line';
  const newType = current === 'line' ? 'bar' : 'line';
  chartTypes[chartId] = newType;

  if (chartRefs[chartId]) {
    chartRefs[chartId].destroy();
    const canvas = document.getElementById(chartId);
    const colorMap = {
      tempChart: '#e74c3c',
      humidityChart: '#3498db',
      gasChart: '#9b59b6',
      flameChart: '#f39c12',
      motionChart: '#2ecc71',
      vibrationChart: '#8e44ad'
    };
    const data = sensorData.map(d => ({
      value: d[key],
      createdAt: d.createdAt
    })).filter(d => d.value !== undefined && d.value !== null);
    
    if (data.length > 0) {
      createChart(canvas, label, data, colorMap[chartId], newType, mlOverlays[chartId] || []);
    }
  }
}

function exportChart(chartId) {
  const chart = chartRefs[chartId];
  if (chart) {
    const a = document.createElement('a');
    a.href = chart.toBase64Image();
    a.download = chartId + '.png';
    a.click();
  }
}

function printChart(chartId) {
  const chart = chartRefs[chartId];
  if (chart) {
    const win = window.open('', '_blank');
    win.document.write('<img src="' + chart.toBase64Image() + '"/>');
    win.print();
  }
}

function resetZoom(chartId) {
  if (chartRefs[chartId]) chartRefs[chartId].resetZoom();
}

function applyDarkModeToCharts() {
  Chart.defaults.color = getComputedStyle(document.body).color;
  renderCharts();
}

// -------------------- AI/ML Alert System --------------------
function checkAIAlerts() {
  Object.keys(chartRefs).forEach(chartId => {
    const thresholds = anomalyThresholds[chartId];
    const data = sensorData.filter(d => d[getDataKey(chartId)] !== undefined);
    
    if (data.length > 0 && thresholds) {
      const latestValue = data[data.length - 1][getDataKey(chartId)];
      
      if (latestValue > thresholds.upperBound || latestValue < thresholds.lowerBound) {
        const alertMessage = `🚨 AI Alert: ${getChartLabel(chartId)} value (${latestValue}) is outside normal range!`;
        showAIAlert(alertMessage, 'warning');
      }
    }
  });
}

function showAIAlert(message, type = 'info') {
  const alertContainer = document.getElementById('ai-alerts') || createAlertContainer();
  const alert = document.createElement('div');
  alert.className = `ai-alert ai-alert-${type}`;
  alert.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()">×</button>
  `;
  alertContainer.appendChild(alert);
  
  setTimeout(() => alert.remove(), 10000);
}

function createAlertContainer() {
  const container = document.createElement('div');
  container.id = 'ai-alerts';
  container.className = 'ai-alerts';
  document.body.appendChild(container);
  return container;
}

// -------------------- Initialize when DOM is loaded --------------------
window.addEventListener('DOMContentLoaded', () => {
  console.log('Charts.js initialized');
  
  // Initialize with sample data if no data is available
  if (!window.sensorData || window.sensorData.length === 0) {
    console.log('Initializing with sample data...');
    sensorData = generateSampleData();
  } else {
    sensorData = window.sensorData;
  }
  
  renderCharts();
  
  const darkModeMedia = window.matchMedia('(prefers-color-scheme: dark)');
  darkModeMedia.addEventListener('change', applyDarkModeToCharts);
  
  // Check AI alerts every 30 seconds
  setInterval(checkAIAlerts, 30000);
  
  // Update charts every 5 seconds with new data
  setInterval(() => {
    if (sensorData.length > 0) {
      // Add new sample data point
      const lastData = sensorData[sensorData.length - 1];
      const newData = {
        createdAt: new Date(),
        temperature: lastData.temperature + (Math.random() - 0.5) * 2,
        humidity: lastData.humidity + (Math.random() - 0.5) * 5,
        gas: lastData.gas + (Math.random() - 0.5) * 20,
        flame: Math.random() > 0.98 ? 1 : 0,
        motion: Math.random() > 0.85 ? 1 : 0,
        vibration: lastData.vibration + (Math.random() - 0.5) * 0.5
      };
      sensorData.push(newData);
      
      // Keep only last 100 data points
      if (sensorData.length > 100) {
        sensorData = sensorData.slice(-100);
      }
      
      renderCharts();
    }
  }, 5000);
});
