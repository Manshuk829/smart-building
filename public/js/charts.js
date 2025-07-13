// public/js/charts.js

let chartRefs = {}; // store chart references
let chartTypes = {}; // store per-chart type (line or bar)

function createChart(ctx, label, data, color, type = 'line') {
  const avg = (data.reduce((acc, d) => acc + d.value, 0) / data.length).toFixed(2);
  const min = Math.min(...data.map(d => d.value));
  const max = Math.max(...data.map(d => d.value));

  const chart = new Chart(ctx, {
    type,
    data: {
      labels: data.map(d => new Date(d.createdAt).toLocaleString()),
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
          data: new Array(data.length).fill(avg),
          borderColor: '#aaa',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        },
        {
          label: 'Min',
          data: new Array(data.length).fill(min),
          borderColor: '#2ecc71',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        },
        {
          label: 'Max',
          data: new Array(data.length).fill(max),
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
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      },
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

function renderCharts() {
  if (!sensorData || sensorData.length === 0) return;

  const prepareData = key => sensorData.map(d => ({ value: d[key], createdAt: d.createdAt }));

  createChart(document.getElementById('tempChart'), 'Temperature (°C)', prepareData('temperature'), '#e74c3c', chartTypes['tempChart'] || 'line');
  createChart(document.getElementById('humidityChart'), 'Humidity (%)', prepareData('humidity'), '#3498db', chartTypes['humidityChart'] || 'line');
  createChart(document.getElementById('gasChart'), 'Gas (ppm)', prepareData('gas'), '#9b59b6', chartTypes['gasChart'] || 'line');
  createChart(document.getElementById('flameChart'), 'Flame', prepareData('flame'), '#f39c12', chartTypes['flameChart'] || 'line');
  createChart(document.getElementById('motionChart'), 'Motion', prepareData('motion'), '#2ecc71', chartTypes['motionChart'] || 'line');
  createChart(document.getElementById('vibrationChart'), 'Vibration', prepareData('vibration'), '#8e44ad', chartTypes['vibrationChart'] || 'line');
}

function toggleChartType(chartId, key, label) {
  const oldType = chartTypes[chartId] || 'line';
  const newType = oldType === 'line' ? 'bar' : 'line';
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
    const data = sensorData.map(d => ({ value: d[key], createdAt: d.createdAt }));
    createChart(canvas, label, data, colorMap[chartId] || '#007bff', newType);
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
  if (chartRefs[chartId]) {
    chartRefs[chartId].resetZoom();
  }
}

function applyDarkModeToCharts() {
  Chart.defaults.color = getComputedStyle(document.body).color;
  renderCharts();
}

// WebSocket live updates
const socket = io();
socket.on('sensorUpdate', newData => {
  if (sensorData) {
    sensorData.push(newData);
    renderCharts();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  renderCharts();

  const darkModeMedia = window.matchMedia('(prefers-color-scheme: dark)');
  darkModeMedia.addEventListener('change', applyDarkModeToCharts);
});
