let chartRefs = {};
let chartTypes = {};
let mlOverlays = {};
let sensorData = [];

// -------------------- Chart Creation --------------------
function createChart(ctx, label, data, color, type = 'line', mlOverlayTimes = []) {
  const avg = (data.reduce((acc, d) => acc + d.value, 0) / data.length).toFixed(2);
  const min = Math.min(...data.map(d => d.value));
  const max = Math.max(...data.map(d => d.value));
  const timestamps = data.map(d => new Date(d.createdAt).toLocaleString());

  const annotations = mlOverlayTimes.map(ts => ({
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
  }));

  const chart = new Chart(ctx, {
    type,
    data: {
      labels: timestamps,
      datasets: [
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
          label: 'Avg',
          data: Array(data.length).fill(avg),
          borderColor: '#aaa',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        },
        {
          label: 'Min',
          data: Array(data.length).fill(min),
          borderColor: '#2ecc71',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        },
        {
          label: 'Max',
          data: Array(data.length).fill(max),
          borderColor: '#e74c3c',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        }
      ]
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
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}`
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
  return chart;
}

// -------------------- Rendering --------------------
function renderCharts() {
  if (!sensorData || sensorData.length === 0) return;

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
    if (!canvas) return;
    const type = chartTypes[id] || 'line';
    const mlLines = mlOverlays[id] || [];
    if (chartRefs[id]) chartRefs[id].destroy();
    createChart(canvas, label, prepareData(key), color, type, mlLines);
  });
}

// -------------------- Socket.IO Updates --------------------
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

// -------------------- Tools --------------------
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
    }));
    createChart(canvas, label, data, colorMap[chartId], newType, mlOverlays[chartId] || []);
  }
}

function exportChart(chartId) {
  const chart = document.getElementById(chartId);
  const a = document.createElement('a');
  a.href = chart.toDataURL('image/png');
  a.download = chartId + '.png';
  a.click();
}

function printChart(chartId) {
  const chart = document.getElementById(chartId);
  const win = window.open('', '_blank');
  win.document.write('<img src="' + chart.toDataURL() + '"/>');
  win.print();
}

function resetZoom(chartId) {
  if (chartRefs[chartId]) chartRefs[chartId].resetZoom();
}

function applyDarkModeToCharts() {
  Chart.defaults.color = getComputedStyle(document.body).color;
  renderCharts();
}

window.addEventListener('DOMContentLoaded', () => {
  renderCharts();
  const darkModeMedia = window.matchMedia('(prefers-color-scheme: dark)');
  darkModeMedia.addEventListener('change', applyDarkModeToCharts);
});
