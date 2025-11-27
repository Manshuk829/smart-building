const config = require('../config');
const SensorData = require('../models/SensorData');
const Alert = require('../models/Alert');
const Visitor = require('../models/Visitor');

const thresholds = config.thresholds;
const floors = config.floors;
const nodesPerFloor = config.nodesPerFloor;
const sensorTypes = ['temp', 'humidity', 'gas', 'vibration', 'flame', 'motion'];

// 📊 Dashboard Page
exports.showDashboard = async (req, res) => {
  try {
    const dataByFloor = {};
    const alerts = {};
    const flameDataByFloor = {};

    for (const floor of floors) {
      const entries = await SensorData.find({ floor: String(floor) })
        .sort({ createdAt: -1 })
        .limit(sensorTypes.length * nodesPerFloor)
        .lean();

      const sensorData = {};
      let latestTimestamp = null;

      for (const entry of entries) {
        const existingTimestamp = sensorData[entry.type + '_timestamp'] || new Date(0);
        if (!sensorData[entry.type] || entry.createdAt > existingTimestamp) {
          sensorData[entry.type] = entry.payload;
          sensorData[entry.type + '_timestamp'] = entry.createdAt;
          if (!latestTimestamp || entry.createdAt > latestTimestamp) {
            latestTimestamp = entry.createdAt;
          }
        }
      }

      // Special handling for flame sensors
      const flameEntries = await SensorData.find({
        floor: String(floor),
        type: 'flame'
      })
        .sort({ createdAt: -1 })
        .lean();

      const nodeData = {};
      flameEntries.forEach(entry => {
        const node = entry.node || 1;
        if (!nodeData[node] || entry.createdAt > nodeData[node].timestamp) {
          nodeData[node] = {
            node: node,
            value: entry.payload,
            timestamp: entry.createdAt
          };
        }
      });

      flameDataByFloor[floor] = [];
      for (let nodeNum = 1; nodeNum <= nodesPerFloor; nodeNum++) {
        if (!nodeData[nodeNum]) {
          flameDataByFloor[floor].push({
            node: nodeNum,
            value: 0,
            timestamp: new Date(),
            status: 'offline'
          });
        } else {
          // Check if data is stale (> 5 minutes)
          const isStale = (new Date() - new Date(nodeData[nodeNum].timestamp)) > 5 * 60 * 1000;
          if (isStale && nodeData[nodeNum].value === 1) {
            nodeData[nodeNum].value = 0;
          }
          flameDataByFloor[floor].push(nodeData[nodeNum]);
        }
      }

      console.log(`Floor ${floor} flame data:`, flameDataByFloor[floor]);

      if (latestTimestamp) {
        sensorData.createdAt = latestTimestamp instanceof Date ? latestTimestamp : new Date(latestTimestamp);
        if (isNaN(sensorData.createdAt.getTime())) {
          sensorData.createdAt = new Date();
        }
      } else {
        sensorData.createdAt = new Date();
      }

      dataByFloor[floor] = sensorData;
      alerts[floor] = await Alert.findOne({ floor }).sort({ createdAt: -1 }).lean();
    }

    res.render('dashboard', {
      dataByFloor,
      flameDataByFloor,
      thresholds,
      alerts,
      nodesPerFloor,
      error: null
    });
  } catch (err) {
    console.error('❌ Dashboard error:', err);
    try {
      res.render('dashboard', {
        dataByFloor: {},
        flameDataByFloor: {},
        thresholds,
        alerts: {},
        nodesPerFloor,
        error: 'Unable to load dashboard at this time. Please try again later.'
      });
    } catch (renderErr) {
      console.error('❌ Critical: Failed to render error state:', renderErr);
      res.status(500).send(`
        <h1>Internal Server Error</h1>
        <p>The dashboard could not be loaded.</p>
        <p>Error details: ${process.env.NODE_ENV === 'production' ? 'Check server logs' : renderErr.message}</p>
      `);
    }
  }
};

// 📺 Live View Page (Gate-based)
exports.showLive = async (req, res) => {
  try {
    const gates = ['gate1', 'gate2'];
    const dataByFloor = {};
    const alerts = {};
    const visitorsByGate = {};

    for (const gate of gates) {
      // Convert gate string to floor number (e.g., "gate1" -> 1)
      const floorNumber = parseInt(gate.replace('gate', ''), 10);

      const entries = await SensorData.find({ floor: gate })
        .sort({ createdAt: -1 })
        .limit(sensorTypes.length)
        .lean();

      const sensorData = {};
      let latestTimestamp = null;

      for (const entry of entries) {
        if (!sensorData[entry.type]) {
          sensorData[entry.type] = entry.payload;
          if (!latestTimestamp || entry.createdAt > latestTimestamp) {
            latestTimestamp = entry.createdAt;
          }
        }
      }

      sensorData.createdAt = latestTimestamp;
      dataByFloor[gate] = sensorData;

      // Use floor number for Alert queries
      alerts[gate] = await Alert.findOne({ floor: floorNumber }).sort({ createdAt: -1 }).lean();

      // Get current visitors for this floor
      const currentVisitors = await Visitor.find({
        floor: floorNumber,
        status: 'approved',
        expectedArrival: { $lte: new Date() },
        expectedDeparture: { $gte: new Date() }
      }).lean();

      visitorsByGate[gate] = currentVisitors;
    }

    res.render('live', {
      dataByFloor,
      thresholds,
      alerts,
      visitorsByGate,
      gracePeriodMinutes: req.app.get('visitorSettings').gracePeriodMinutes
    });
  } catch (err) {
    console.error('❌ Live view error:', err.message);
    res.status(500).send('Error loading live view');
  }
};

// 📜 History Page
exports.showHistory = async (req, res) => {
  try {
    const floor = req.query.floor || '1';
    const index = parseInt(req.query.index) || 0;

    const recentData = {};
    for (const type of sensorTypes) {
      recentData[type] = await SensorData.find({ floor, type })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    }

    const combined = [];
    for (let i = 0; i < 10; i++) {
      combined.push({
        temp: recentData.temp?.[i]?.payload ?? 'N/A',
        humidity: recentData.humidity?.[i]?.payload ?? 'N/A',
        gas: recentData.gas?.[i]?.payload ?? 'N/A',
        vibration: recentData.vibration?.[i]?.payload ?? 'N/A',
        flame: recentData.flame?.[i]?.payload ?? 'N/A',
        motion: recentData.motion?.[i]?.payload ?? 'N/A',
        quake: recentData.quake?.[i]?.payload ?? 'N/A',
        timestamp:
          recentData.temp?.[i]?.createdAt ||
          recentData.humidity?.[i]?.createdAt ||
          recentData.gas?.[i]?.createdAt ||
          new Date(),
      });
    }

    const calcAvg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : 'N/A';
    const extract = type => (recentData[type] || []).map(d => typeof d.payload === 'number' ? d.payload : 0);

    const stats = {
      avgTemp: calcAvg(extract('temp')),
      minTemp: extract('temp').length ? Math.min(...extract('temp')).toFixed(2) : 'N/A',
      maxTemp: extract('temp').length ? Math.max(...extract('temp')).toFixed(2) : 'N/A',
      avgHumidity: calcAvg(extract('humidity')),
      avgGas: calcAvg(extract('gas')),
      avgVibration: calcAvg(extract('vibration')),
    };

    const selected = combined[index] || null;

    res.render('history', {
      record: selected,
      currentIndex: index,
      total: combined.length,
      stats,
      thresholds,
      floor,
      intruder: false,
    });
  } catch (err) {
    console.error('❌ History page error:', err.message);
    res.status(500).send('Error loading history');
  }
};

// 📈 Charts Page with ML overlay support
exports.showCharts = async (req, res) => {
  try {
    const floor = req.query.floor || '1';
    const range = req.query.range;
    const now = new Date();

    // Get sensor data for all types
    const sensorTypes = ['temp', 'humidity', 'gas', 'vibration', 'flame', 'motion'];
    const allRecords = [];

    for (const type of sensorTypes) {
      const query = { floor: String(floor), type, source: 'sensor' };
      if (range === '1h') query.createdAt = { $gte: new Date(now - 3600000) };
      else if (range === '24h') query.createdAt = { $gte: new Date(now - 86400000) };
      else if (range === '7d') query.createdAt = { $gte: new Date(now - 604800000) };

      const records = await SensorData.find(query)
        .sort({ createdAt: 1 })
        .limit(100)
        .lean();

      // Transform records to match expected structure
      records.forEach(record => {
        allRecords.push({
          createdAt: record.createdAt,
          temperature: record.type === 'temp' ? record.payload : undefined,
          humidity: record.type === 'humidity' ? record.payload : undefined,
          gas: record.type === 'gas' ? record.payload : undefined,
          vibration: record.type === 'vibration' ? record.payload : undefined,
          flame: record.type === 'flame' ? record.payload : undefined,
          motion: record.type === 'motion' ? record.payload : undefined
        });
      });
    }

    // Get ML alerts
    const mlQuery = { floor: String(floor), source: 'ml' };
    if (range === '1h') mlQuery.createdAt = { $gte: new Date(now - 3600000) };
    else if (range === '24h') mlQuery.createdAt = { $gte: new Date(now - 86400000) };
    else if (range === '7d') mlQuery.createdAt = { $gte: new Date(now - 604800000) };

    const mlAlerts = await SensorData.find(mlQuery)
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    // Group records by timestamp to combine sensor data
    const groupedRecords = {};
    allRecords.forEach(record => {
      const timestamp = record.createdAt.toISOString();
      if (!groupedRecords[timestamp]) {
        groupedRecords[timestamp] = { createdAt: record.createdAt };
      }
      Object.keys(record).forEach(key => {
        if (key !== 'createdAt' && record[key] !== undefined) {
          groupedRecords[timestamp][key] = record[key];
        }
      });
    });

    let records = Object.values(groupedRecords).sort((a, b) => a.createdAt - b.createdAt);

    // Ensure we have proper data structure for charts
    records = records.map(record => ({
      createdAt: record.createdAt,
      temperature: record.temperature || null,
      humidity: record.humidity || null,
      gas: record.gas || null,
      flame: record.flame || 0,
      motion: record.motion || 0,
      vibration: record.vibration || 0,
      mlPrediction: record.mlPrediction || null
    }));

    // If no records found, generate sample data for demonstration
    if (records.length === 0) {
      console.log('No sensor data found, generating sample data for charts...');
      records = [];
      const sampleCount = 50;

      for (let i = 0; i < sampleCount; i++) {
        const timestamp = new Date(now.getTime() - (sampleCount - i) * 60000); // 1 min intervals
        records.push({
          createdAt: timestamp,
          temperature: 20 + Math.sin(i * 0.2) * 5 + Math.random() * 2,
          humidity: 50 + Math.cos(i * 0.3) * 10 + Math.random() * 5,
          gas: 200 + Math.sin(i * 0.1) * 50 + Math.random() * 20,
          flame: Math.random() > 0.95 ? 1 : 0,
          motion: Math.random() > 0.8 ? 1 : 0,
          vibration: Math.random() * 2 + Math.sin(i * 0.4) * 0.5
        });
      }
    }

    res.render('charts', {
      records,
      mlAlerts,
      query: req.query,
      thresholds,
    });
  } catch (err) {
    console.error('❌ Charts page error:', err.message);
    res.status(500).send('Error loading charts');
  }
};

// 🚨 Evacuation Routes Page
exports.showEvacuation = async (req, res) => {
  try {
    // Use next-generation AI pathfinder (D* Lite + RL + Neural Network)
    const { NextGenAIPathfinder } = require('../ml/advancedPathfindingAI');
    const { advancedBuildingGraph } = require('../ml/evacuationPathAdvanced');
    const { mlEngine } = require('../ml/mlModels');

    // Initialize AI pathfinder
    const aiPathfinder = new NextGenAIPathfinder(advancedBuildingGraph);

    // Get current evacuation data from database
    const evacuationData = {};
    const floors = [1, 2, 3, 4];

    for (const floor of floors) {
      // Get latest sensor data for this floor
      const sensorEntries = await SensorData.find({
        floor: String(floor),
        source: 'sensor'
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      // Aggregate sensor data
      const sensorData = {};
      sensorEntries.forEach(entry => {
        if (!sensorData[entry.type] || entry.createdAt > (sensorData[entry.type + '_timestamp'] || new Date(0))) {
          sensorData[entry.type] = entry.payload;
          sensorData[entry.type + '_timestamp'] = entry.createdAt;
        }
      });

      // Run ML prediction
      const mlPrediction = await mlEngine.predictThreats(floor, {
        temp: sensorData.temp,
        humidity: sensorData.humidity,
        gas: sensorData.gas,
        vibration: sensorData.vibration,
        flame: sensorData.flame,
        motion: sensorData.motion
      });

      // Determine floor status based on ML prediction
      let status = 'safe';
      let threats = [];
      let evacuationTime = 3;
      let hazards = [];

      if (mlPrediction.threats.length > 0) {
        mlPrediction.threats.forEach(threat => {
          threats.push(threat.type);

          if (threat.severity === 'critical') {
            status = 'danger';
            evacuationTime = 1;

            // Add hazard location (approximate based on floor)
            if (threat.type === 'fire' || threat.type === 'gas_leak') {
              hazards.push({
                x: Math.random() * 17, // Random location for demo
                y: Math.random() * 15,
                level: 9,
                type: threat.type
              });
            }
          } else if (threat.severity === 'warning' && status === 'safe') {
            status = 'warning';
            evacuationTime = 2;
          }
        });
      }

      // Get evacuation routes using next-gen AI (D* Lite + RL + Neural Network)
      // Find optimal path to each of the 4 evacuation nodes (stairs)
      const startNode = `node-${floor}-0-0-0`; // Default start (can be customized)
      const aiSensorData = {
        temp: mlPrediction.fire?.probability > 50 ? 55 : 25,
        gas: mlPrediction.gasLeak?.probability > 50 ? 350 : 200,
        flame: mlPrediction.fire?.isFire ? 120 : 0,
        vibration: mlPrediction.structural?.probability > 50 ? 4.5 : 0.5
      };

      const aiResult = await aiPathfinder.findOptimalEvacuationPath(
        startNode,
        floor,
        aiSensorData,
        hazards
      );

      const routes = aiResult.bestRoute ? [{
        startNode: { id: startNode },
        path: aiResult.bestRoute.path,
        distance: aiResult.bestRoute.distance,
        steps: aiResult.bestRoute.steps,
        evacuationNode: aiResult.bestRoute.evacuationNode,
        aiAnalysis: aiResult.aiAnalysis
      }] : [];

      // Get best routes (top 3 shortest)
      const bestRoutes = routes
        .filter(r => r.distance !== null && r.distance !== Infinity)
        .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
        .slice(0, 3)
        .map(r => ({
          path: r.path.map(n => ({
            id: n.id,
            type: n.type,
            x: n.x,
            y: n.y,
            floor: n.floor
          })),
          distance: r.distance,
          steps: r.steps,
          estimatedTime: r.distance ? Math.ceil(r.distance * 0.5) : null
        }));

      evacuationData[floor] = {
        status,
        threats,
        evacuationTime,
        capacity: 50,
        lastUpdate: new Date(),
        routes: bestRoutes,
        mlConfidence: mlPrediction.overallConfidence,
        recommendation: mlPrediction.recommendation,
        hazards: hazards
      };
    }

    res.render('evacuation', {
      evacuationData,
      thresholds,
      buildingDimensions: config.buildingDimensions
    });
  } catch (err) {
    console.error('❌ Evacuation page error:', err.message);
    res.status(500).send('Error loading evacuation routes');
  }
};

exports.showFaceTraining = async (req, res) => {
  try {
    console.log('🎯 Loading face training page...');
    res.render('face_training');
  } catch (err) {
    console.error('❌ Face training page error:', err.message);
    res.status(500).send('Error loading face training page');
  }
};
