const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

const viewsDir = path.join(__dirname, 'views');
const dashboardPath = path.join(viewsDir, 'dashboard.ejs');

const mockData = {
    dataByFloor: {
        1: { temp: 25, humidity: 50, gas: 100, vibration: 0, flame: 0, motion: 0, createdAt: new Date() },
        2: { temp: 26, humidity: 51, gas: 101, vibration: 0, flame: 0, motion: 0, createdAt: new Date() },
        3: { temp: 27, humidity: 52, gas: 102, vibration: 0, flame: 0, motion: 0, createdAt: new Date() },
        4: { temp: 28, humidity: 53, gas: 103, vibration: 0, flame: 0, motion: 0, createdAt: new Date() }
    },
    flameDataByFloor: {
        1: [], 2: [], 3: [], 4: []
    },
    thresholds: {
        temperature: 50,
        humidity: 70,
        gas: 300,
        vibration: 5.0,
        flame: 100
    },
    alerts: {},
    nodesPerFloor: 4,
    user: { role: 'admin', username: 'test' },
    error: null
};

console.log('Testing dashboard render...');

ejs.renderFile(dashboardPath, mockData, { root: viewsDir }, (err, str) => {
    if (err) {
        console.error('❌ Render failed:', err);
    } else {
        console.log('✅ Render successful!');
    }
});
