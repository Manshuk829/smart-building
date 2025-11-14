#!/usr/bin/env node
/**
 * System Health Check Script
 * Checks all components of the Smart Building Security System
 */

const mongoose = require('mongoose');
const SensorData = require('./models/SensorData');
const Alert = require('./models/Alert');
const Visitor = require('./models/Visitor');
const config = require('./config');

async function checkDatabaseConnection() {
  try {
    await mongoose.connect(config.mongodb.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Database connection: OK');
    return true;
  } catch (error) {
    console.log('❌ Database connection: FAILED');
    console.log('   Error:', error.message);
    return false;
  }
}

async function checkSensorData() {
  try {
    const count = await SensorData.countDocuments();
    const recent = await SensorData.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    console.log(`✅ Sensor data: ${count} records found`);
    
    if (recent.length > 0) {
      console.log('   Recent data:');
      recent.forEach(record => {
        console.log(`   - ${record.type}: ${record.payload} (Floor ${record.floor}, ${record.createdAt})`);
      });
    } else {
      console.log('   ⚠️  No recent sensor data found');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Sensor data check: FAILED');
    console.log('   Error:', error.message);
    return false;
  }
}

async function checkFlameSensorData() {
  try {
    const flameData = await SensorData.find({ type: 'flame' })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    
    console.log(`✅ Flame sensor data: ${flameData.length} records found`);
    
    if (flameData.length > 0) {
      const byFloor = {};
      flameData.forEach(record => {
        if (!byFloor[record.floor]) byFloor[record.floor] = [];
        byFloor[record.floor].push(record);
      });
      
      Object.keys(byFloor).forEach(floor => {
        console.log(`   Floor ${floor}: ${byFloor[floor].length} flame records`);
        const latest = byFloor[floor][0];
        console.log(`   - Latest: ${latest.payload} (Node ${latest.node || 1}, ${latest.createdAt})`);
      });
    } else {
      console.log('   ⚠️  No flame sensor data found');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Flame sensor data check: FAILED');
    console.log('   Error:', error.message);
    return false;
  }
}

async function checkAlerts() {
  try {
    const count = await Alert.countDocuments();
    const recent = await Alert.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    console.log(`✅ Alerts: ${count} records found`);
    
    if (recent.length > 0) {
      console.log('   Recent alerts:');
      recent.forEach(alert => {
        console.log(`   - ${alert.type} (Floor ${alert.floor}, ${alert.createdAt})`);
      });
    }
    
    return true;
  } catch (error) {
    console.log('❌ Alerts check: FAILED');
    console.log('   Error:', error.message);
    return false;
  }
}

async function checkVisitors() {
  try {
    const count = await Visitor.countDocuments();
    const active = await Visitor.countDocuments({
      status: 'approved',
      expectedArrival: { $lte: new Date() },
      expectedDeparture: { $gte: new Date() }
    });
    
    console.log(`✅ Visitors: ${count} total, ${active} active`);
    return true;
  } catch (error) {
    console.log('❌ Visitors check: FAILED');
    console.log('   Error:', error.message);
    return false;
  }
}

async function checkSystemHealth() {
  console.log('🔍 Smart Building Security System - Health Check');
  console.log('=' .repeat(50));
  
  const results = {
    database: await checkDatabaseConnection(),
    sensorData: false,
    flameData: false,
    alerts: false,
    visitors: false
  };
  
  if (results.database) {
    results.sensorData = await checkSensorData();
    results.flameData = await checkFlameSensorData();
    results.alerts = await checkAlerts();
    results.visitors = await checkVisitors();
  }
  
  console.log('\n📊 Health Check Summary:');
  console.log('=' .repeat(30));
  
  Object.keys(results).forEach(component => {
    const status = results[component] ? '✅ OK' : '❌ FAILED';
    console.log(`${component}: ${status}`);
  });
  
  const allHealthy = Object.values(results).every(result => result);
  
  if (allHealthy) {
    console.log('\n🎉 All systems are healthy!');
  } else {
    console.log('\n⚠️  Some systems need attention. Check the errors above.');
  }
  
  await mongoose.disconnect();
  return allHealthy;
}

// Run health check if called directly
if (require.main === module) {
  checkSystemHealth()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Health check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkSystemHealth };
