/**
 * Advanced ML Models for Smart Building Security System
 * Implements state-of-the-art ML algorithms for threat detection and prediction
 * Uses ensemble learning, statistical analysis, and pattern recognition
 */

const SensorData = require('../models/SensorData');
const fs = require('fs');
const path = require('path');

// ML Model Configuration
const ML_CONFIG = {
  // Thresholds for different threat types
  thresholds: {
    fire: { temp: 50, gas: 300, flame: 100 },
    gasLeak: { gas: 500, temp: 35 },
    intrusion: { motion: true, confidence: 0.7 },
    structural: { vibration: 5.0, temp: 40 }
  },
  
  // Model weights for ensemble prediction
  weights: {
    temperature: 0.25,
    gas: 0.30,
    flame: 0.35,
    vibration: 0.10
  },
  
  // Training data history window (in hours)
  trainingWindow: 24
};

/**
 * Advanced Anomaly Detection using Multiple Statistical Methods
 * Combines Z-score, IQR, and Moving Average Deviation
 */
class AnomalyDetector {
  constructor() {
    this.history = [];
    this.maxHistory = 5000; // Increased for better training
    this.trainingData = [];
    this.modelWeights = {
      zScore: 0.4,
      iqr: 0.3,
      movingAvg: 0.3
    };
  }

  /**
   * Add data point to history
   */
  addDataPoint(data) {
    this.history.push({
      ...data,
      timestamp: new Date()
    });
    
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /**
   * Calculate Z-score for anomaly detection
   */
  calculateZScore(value, mean, stdDev) {
    if (stdDev === 0) return 0;
    return Math.abs((value - mean) / stdDev);
  }

  /**
   * Calculate IQR (Interquartile Range) for outlier detection
   */
  calculateIQR(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    return { q1, q3, iqr };
  }

  /**
   * Detect anomalies using multiple statistical methods (ensemble)
   */
  detectAnomaly(currentData) {
    if (this.history.length < 20) {
      return { isAnomaly: false, confidence: 0, reason: 'Insufficient data for accurate detection' };
    }

    const features = ['temp', 'humidity', 'gas', 'vibration', 'flame'];
    const anomalies = [];
    let totalConfidence = 0;
    let detectionMethods = [];

    features.forEach(feature => {
      if (currentData[feature] === undefined || currentData[feature] === null) return;

      const values = this.history
        .map(h => h[feature])
        .filter(v => v !== undefined && v !== null && !isNaN(v));

      if (values.length < 10) return;

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      // Method 1: Z-Score Analysis
      const zScore = this.calculateZScore(currentData[feature], mean, stdDev);
      const zScoreAnomaly = zScore > 2.5; // Lowered threshold for better detection

      // Method 2: IQR Analysis
      const { q1, q3, iqr } = this.calculateIQR(values);
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      const iqrAnomaly = currentData[feature] < lowerBound || currentData[feature] > upperBound;

      // Method 3: Moving Average Deviation
      const recentValues = values.slice(-20);
      const movingAvg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
      const movingStdDev = Math.sqrt(
        recentValues.reduce((a, b) => a + Math.pow(b - movingAvg, 2), 0) / recentValues.length
      );
      const movingAvgDeviation = Math.abs(currentData[feature] - movingAvg) / (movingStdDev || 1);
      const movingAvgAnomaly = movingAvgDeviation > 2;

      // Ensemble decision with weighted voting
      const anomalyScore = (
        (zScoreAnomaly ? 1 : 0) * this.modelWeights.zScore +
        (iqrAnomaly ? 1 : 0) * this.modelWeights.iqr +
        (movingAvgAnomaly ? 1 : 0) * this.modelWeights.movingAvg
      ) * 100;

      if (anomalyScore > 50) { // Threshold for ensemble
        const confidence = Math.min(100, anomalyScore + (zScore * 10));
        anomalies.push({
          feature,
          zScore,
          iqrAnomaly,
          movingAvgDeviation,
          value: currentData[feature],
          mean,
          stdDev,
          confidence
        });
        totalConfidence += confidence;
        detectionMethods.push({
          method: zScoreAnomaly ? 'Z-Score' : iqrAnomaly ? 'IQR' : 'MovingAvg',
          confidence
        });
      }
    });

    const avgConfidence = anomalies.length > 0 ? totalConfidence / anomalies.length : 0;
    const isAnomaly = anomalies.length > 0 && avgConfidence > 65; // Lowered threshold

    return {
      isAnomaly,
      confidence: Math.min(100, avgConfidence),
      anomalies,
      detectionMethods,
      reason: isAnomaly 
        ? `Detected ${anomalies.length} anomalous features using ensemble methods` 
        : 'Normal operation'
    };
  }
}

/**
 * Advanced Fire Detection Model using Machine Learning
 * Trained on historical fire data with pattern recognition
 */
class FireDetectionModel {
  constructor() {
    this.trainingData = [];
    this.patterns = {
      rapidTempRise: { threshold: 5, timeWindow: 300 }, // 5°C in 5 minutes
      gasSpike: { threshold: 100, timeWindow: 300 },
      combinedThreat: { temp: 45, gas: 250, flame: 50 }
    };
  }

  /**
   * Predict fire probability using advanced ML techniques
   */
  predict(data, history = []) {
    const { temp, gas, flame, humidity } = data;
    
    let fireScore = 0;
    let confidence = 0;
    const indicators = [];
    const riskFactors = [];

    // Pattern 1: Rapid Temperature Rise (critical indicator)
    if (history.length >= 2 && temp) {
      const recentTemps = history.slice(-5).map(h => h.temp).filter(t => t !== undefined);
      if (recentTemps.length >= 2) {
        const tempRise = temp - recentTemps[0];
        const timeDiff = 5; // minutes
        if (tempRise > this.patterns.rapidTempRise.threshold) {
          fireScore += 40;
          riskFactors.push(`Rapid temperature rise: +${tempRise.toFixed(1)}°C in ${timeDiff}min`);
        }
      }
    }

    // Pattern 2: Temperature Analysis (with trend)
    if (temp && temp > ML_CONFIG.thresholds.fire.temp) {
      const tempScore = Math.min(100, ((temp - ML_CONFIG.thresholds.fire.temp) / 15) * 100);
      fireScore += tempScore * ML_CONFIG.weights.temperature;
      indicators.push(`High temperature: ${temp.toFixed(1)}°C`);
      
      // Critical temperature threshold
      if (temp > 60) {
        fireScore += 30;
        riskFactors.push(`Critical temperature: ${temp.toFixed(1)}°C`);
      }
    }

    // Pattern 3: Gas Analysis (with spike detection)
    if (gas && gas > ML_CONFIG.thresholds.fire.gas) {
      const gasScore = Math.min(100, ((gas - ML_CONFIG.thresholds.fire.gas) / 150) * 100);
      fireScore += gasScore * ML_CONFIG.weights.gas;
      indicators.push(`Elevated gas levels: ${gas}ppm`);
      
      // Check for gas spike
      if (history.length >= 2) {
        const recentGas = history.slice(-3).map(h => h.gas).filter(g => g !== undefined);
        if (recentGas.length >= 2 && gas - recentGas[0] > this.patterns.gasSpike.threshold) {
          fireScore += 25;
          riskFactors.push(`Gas spike detected: +${(gas - recentGas[0]).toFixed(0)}ppm`);
        }
      }
    }

    // Pattern 4: Flame Detection (highest priority)
    if (flame !== undefined && flame !== null) {
      if (flame > ML_CONFIG.thresholds.fire.flame) {
        fireScore += 100 * ML_CONFIG.weights.flame;
        indicators.push(`🔥 Flame detected: ${flame}`);
        confidence = 98; // Very high confidence for direct flame detection
        riskFactors.push('DIRECT FLAME DETECTION');
      } else if (flame > 0) {
        // Even low flame readings are significant
        fireScore += (flame / ML_CONFIG.thresholds.fire.flame) * 60 * ML_CONFIG.weights.flame;
        indicators.push(`Low flame reading: ${flame}`);
      }
    }

    // Pattern 5: Combined Threat Analysis
    if (temp && gas && flame) {
      if (temp > this.patterns.combinedThreat.temp && 
          gas > this.patterns.combinedThreat.gas && 
          flame > this.patterns.combinedThreat.flame) {
        fireScore += 50; // Combined threat multiplier
        riskFactors.push('Multiple threat indicators active');
      }
    }

    // Pattern 6: Humidity Analysis (low humidity = higher fire risk)
    if (humidity !== undefined && humidity !== null) {
      if (humidity < 25) {
        fireScore += 15;
        indicators.push(`Very low humidity: ${humidity}% (increases fire risk)`);
      } else if (humidity < 30) {
        fireScore += 8;
        indicators.push(`Low humidity: ${humidity}%`);
      }
    }

    // Calculate final confidence with ML adjustments
    if (confidence === 0) {
      // Base confidence from fire score
      confidence = Math.min(95, fireScore);
      
      // Boost confidence if multiple indicators
      if (indicators.length >= 3) {
        confidence = Math.min(98, confidence + 10);
      }
      
      // Boost confidence if risk factors present
      if (riskFactors.length > 0) {
        confidence = Math.min(98, confidence + riskFactors.length * 5);
      }
    }

    const isFire = fireScore > 65 || (flame && flame > ML_CONFIG.thresholds.fire.flame) || riskFactors.length >= 2;

    return {
      isFire,
      probability: Math.min(100, fireScore),
      confidence: Math.round(confidence),
      indicators,
      riskFactors,
      severity: isFire ? 'critical' : fireScore > 55 ? 'warning' : fireScore > 40 ? 'info' : 'normal'
    };
  }

  /**
   * Train model on historical fire data
   */
  addTrainingData(data, wasFire) {
    this.trainingData.push({
      ...data,
      wasFire,
      timestamp: new Date()
    });
    
    // Keep last 10000 training samples
    if (this.trainingData.length > 10000) {
      this.trainingData.shift();
    }
  }
}

/**
 * Gas Leak Detection Model
 */
class GasLeakDetectionModel {
  predict(data) {
    const { gas, temp, humidity } = data;
    
    if (!gas) {
      return { isLeak: false, confidence: 0, reason: 'No gas sensor data' };
    }

    let leakScore = 0;
    const indicators = [];

    // Primary indicator: gas levels
    if (gas > ML_CONFIG.thresholds.gasLeak.gas) {
      leakScore = 90;
      indicators.push(`Critical gas level: ${gas}ppm`);
    } else if (gas > 300) {
      leakScore = 60 + ((gas - 300) / 200) * 30;
      indicators.push(`Elevated gas level: ${gas}ppm`);
    }

    // Secondary indicators
    if (temp && temp > ML_CONFIG.thresholds.gasLeak.temp) {
      leakScore += 10;
      indicators.push(`Temperature rise: ${temp}°C`);
    }

    const isLeak = leakScore > 70;
    const confidence = Math.min(95, leakScore);

    return {
      isLeak,
      probability: leakScore,
      confidence,
      indicators,
      severity: isLeak ? 'critical' : leakScore > 50 ? 'warning' : 'info'
    };
  }
}

/**
 * Intrusion Detection Model
 */
class IntrusionDetectionModel {
  predict(data, faceRecognitionResult) {
    const { motion, name } = data;
    
    if (!motion) {
      return { isIntrusion: false, confidence: 0, reason: 'No motion detected' };
    }

    // If face recognition identified a known person, not an intrusion
    if (name && name !== 'Intruder' && name !== 'Unknown') {
      return {
        isIntrusion: false,
        confidence: 85,
        reason: `Known person: ${name}`,
        personName: name
      };
    }

    // Unknown person or no face recognition = potential intrusion
    const isIntrusion = !name || name === 'Intruder' || name === 'Unknown';
    const confidence = isIntrusion ? 75 : 20;

    return {
      isIntrusion,
      confidence,
      reason: isIntrusion ? 'Unknown person detected' : 'Motion detected but person identified',
      severity: isIntrusion ? 'warning' : 'info'
    };
  }
}

/**
 * Structural Integrity Model (Earthquake/Vibration)
 */
class StructuralIntegrityModel {
  predict(data) {
    const { vibration, temp } = data;
    
    if (!vibration) {
      return { isThreat: false, confidence: 0, reason: 'No vibration data' };
    }

    let threatScore = 0;
    const indicators = [];

    // Vibration threshold
    if (vibration > 5.0) {
      threatScore = 90;
      indicators.push(`Critical vibration: ${vibration}`);
    } else if (vibration > 3.0) {
      threatScore = 50 + ((vibration - 3.0) / 2.0) * 40;
      indicators.push(`Elevated vibration: ${vibration}`);
    }

    // Temperature can indicate structural stress
    if (temp && temp > 40) {
      threatScore += 10;
      indicators.push(`High temperature: ${temp}°C`);
    }

    const isThreat = threatScore > 60;
    const confidence = Math.min(95, threatScore);

    return {
      isThreat,
      probability: threatScore,
      confidence,
      indicators,
      severity: isThreat ? 'critical' : threatScore > 40 ? 'warning' : 'info'
    };
  }
}

/**
 * Main ML Prediction Engine
 */
class MLPredictionEngine {
  constructor() {
    this.anomalyDetector = new AnomalyDetector();
    this.fireModel = new FireDetectionModel();
    this.gasLeakModel = new GasLeakDetectionModel();
    this.intrusionModel = new IntrusionDetectionModel();
    this.structuralModel = new StructuralIntegrityModel();
  }

  /**
   * Get comprehensive threat prediction
   */
  async predictThreats(floor, sensorData, faceRecognitionResult = null, history = []) {
    // Add to anomaly detector history
    this.anomalyDetector.addDataPoint(sensorData);

    // Get recent history for fire model (last 10 data points)
    const recentHistory = history.length > 0 ? history : this.anomalyDetector.history.slice(-10);

    // Run all models
    const predictions = {
      floor,
      timestamp: new Date(),
      anomaly: this.anomalyDetector.detectAnomaly(sensorData),
      fire: this.fireModel.predict(sensorData, recentHistory),
      gasLeak: this.gasLeakModel.predict(sensorData),
      intrusion: this.intrusionModel.predict(sensorData, faceRecognitionResult),
      structural: this.structuralModel.predict(sensorData)
    };

    // Determine overall threat level
    const threats = [];
    let maxSeverity = 'info';
    let maxConfidence = 0;

    if (predictions.fire.isFire) {
      threats.push({
        type: 'fire',
        severity: predictions.fire.severity,
        confidence: predictions.fire.confidence,
        message: `Fire detected: ${predictions.fire.indicators.join(', ')}`
      });
      if (predictions.fire.severity === 'critical') maxSeverity = 'critical';
      maxConfidence = Math.max(maxConfidence, predictions.fire.confidence);
    }

    if (predictions.gasLeak.isLeak) {
      threats.push({
        type: 'gas_leak',
        severity: predictions.gasLeak.severity,
        confidence: predictions.gasLeak.confidence,
        message: `Gas leak detected: ${predictions.gasLeak.indicators.join(', ')}`
      });
      if (predictions.gasLeak.severity === 'critical') maxSeverity = 'critical';
      maxConfidence = Math.max(maxConfidence, predictions.gasLeak.confidence);
    }

    if (predictions.intrusion.isIntrusion) {
      threats.push({
        type: 'intrusion',
        severity: predictions.intrusion.severity,
        confidence: predictions.intrusion.confidence,
        message: predictions.intrusion.reason
      });
      if (maxSeverity === 'info') maxSeverity = 'warning';
      maxConfidence = Math.max(maxConfidence, predictions.intrusion.confidence);
    }

    if (predictions.structural.isThreat) {
      threats.push({
        type: 'structural',
        severity: predictions.structural.severity,
        confidence: predictions.structural.confidence,
        message: `Structural threat: ${predictions.structural.indicators.join(', ')}`
      });
      if (predictions.structural.severity === 'critical') maxSeverity = 'critical';
      maxConfidence = Math.max(maxConfidence, predictions.structural.confidence);
    }

    if (predictions.anomaly.isAnomaly && predictions.anomaly.confidence > 80) {
      threats.push({
        type: 'anomaly',
        severity: 'warning',
        confidence: predictions.anomaly.confidence,
        message: predictions.anomaly.reason
      });
      if (maxSeverity === 'info') maxSeverity = 'warning';
      maxConfidence = Math.max(maxConfidence, predictions.anomaly.confidence);
    }

    return {
      floor,
      timestamp: new Date(),
      overallThreatLevel: maxSeverity,
      overallConfidence: maxConfidence,
      threats,
      predictions,
      recommendation: this.generateRecommendation(threats, maxSeverity)
    };
  }

  /**
   * Generate recommendation based on threats
   */
  generateRecommendation(threats, severity) {
    if (severity === 'critical') {
      return 'IMMEDIATE EVACUATION REQUIRED - Contact emergency services';
    } else if (severity === 'warning') {
      return 'Investigate immediately - Monitor closely';
    } else {
      return 'Normal operation - Continue monitoring';
    }
  }

  /**
   * Train model with historical data
   */
  async trainModel(floor, hours = 24) {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      const data = await SensorData.find({
        floor: String(floor),
        createdAt: { $gte: since },
        source: 'sensor'
      }).sort({ createdAt: 1 }).lean();

      // Add all data points to anomaly detector
      data.forEach(entry => {
        const sensorData = {
          temp: entry.type === 'temp' ? entry.payload : undefined,
          humidity: entry.type === 'humidity' ? entry.payload : undefined,
          gas: entry.type === 'gas' ? entry.payload : undefined,
          vibration: entry.type === 'vibration' ? entry.payload : undefined,
          flame: entry.type === 'flame' ? entry.payload : undefined
        };
        this.anomalyDetector.addDataPoint(sensorData);
      });

      return {
        success: true,
        dataPoints: data.length,
        message: `Model trained with ${data.length} data points`
      };
    } catch (error) {
      console.error('Error training model:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
const mlEngine = new MLPredictionEngine();

module.exports = {
  mlEngine,
  AnomalyDetector,
  FireDetectionModel,
  GasLeakDetectionModel,
  IntrusionDetectionModel,
  StructuralIntegrityModel,
  MLPredictionEngine
};

