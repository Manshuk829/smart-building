/**
 * Evacuation Path Training Data Generator
 * Generates training cases for ML path optimization
 */

const { aStarPathFinder } = require('./evacuationPathAdvanced');

/**
 * Generate training scenarios for evacuation paths
 */
class PathTrainingDataGenerator {
  constructor() {
    this.scenarios = [];
  }

  /**
   * Generate training scenario
   */
  generateScenario(floor, hazardLocations, occupancy, timeOfDay) {
    return {
      floor,
      hazardLocations,
      occupancy,
      timeOfDay, // 'morning', 'afternoon', 'evening', 'night'
      timestamp: new Date()
    };
  }

  /**
   * Simulate evacuation and record results
   */
  async simulateEvacuation(scenario) {
    const { floor, hazardLocations, occupancy } = scenario;
    
    // Get evacuation routes
    const routes = aStarPathFinder.findFloorEvacuationRoutes(floor, hazardLocations);
    
    // Simulate evacuation for each route
    const results = routes.map(route => {
      // Simulate success based on:
      // - Route distance
      // - Hazard proximity
      // - Occupancy
      // - Time factors
      
      let successProbability = 0.9; // Base success rate
      
      // Reduce success if route is too long
      if (route.distance > 20) {
        successProbability -= 0.2;
      }
      
      // Reduce success if hazards are close
      hazardLocations.forEach(hazard => {
        route.path.forEach(node => {
          const dist = Math.sqrt(
            Math.pow(node.x - hazard.x, 2) + Math.pow(node.y - hazard.y, 2)
          );
          if (dist < 3) {
            successProbability -= 0.3;
          }
        });
      });
      
      // Reduce success with high occupancy
      if (occupancy > 40) {
        successProbability -= 0.1;
      }
      
      successProbability = Math.max(0.1, Math.min(0.95, successProbability));
      const success = Math.random() < successProbability;
      
      // Estimate time based on distance and occupancy
      // Building is in centimeters, so time calculation adjusted for small scale
      // 1 cm ≈ 0.1 seconds for small scale model
      const baseTime = route.distance * 0.1; // seconds (distance in cm)
      const occupancyFactor = 1 + (occupancy / 50) * 0.5;
      const timeTaken = baseTime * occupancyFactor; // time in seconds
      
      return {
        route: route.path,
        success,
        timeTaken,
        occupancy,
        distance: route.distance
      };
    });
    
    return results;
  }

  /**
   * Generate comprehensive training dataset
   */
  async generateTrainingDataset() {
    const floors = [1, 2, 3, 4];
    const scenarios = [];
    
    // Generate scenarios for each floor
    floors.forEach(floor => {
      // Scenario 1: No hazards
      scenarios.push(this.generateScenario(floor, [], 20, 'afternoon'));
      
      // Scenario 2: Single hazard
      scenarios.push(this.generateScenario(floor, [
        { x: 8, y: 7, level: 7, type: 'fire' }
      ], 30, 'morning'));
      
      // Scenario 3: Multiple hazards
      scenarios.push(this.generateScenario(floor, [
        { x: 5, y: 5, level: 9, type: 'fire' },
        { x: 12, y: 10, level: 6, type: 'gas_leak' }
      ], 40, 'evening'));
      
      // Scenario 4: High occupancy
      scenarios.push(this.generateScenario(floor, [
        { x: 8, y: 7, level: 5, type: 'fire' }
      ], 60, 'afternoon'));
      
      // Scenario 5: Critical hazard
      scenarios.push(this.generateScenario(floor, [
        { x: 8, y: 7, level: 10, type: 'fire' }
      ], 25, 'night'));
    });
    
    // Simulate all scenarios
    const trainingData = [];
    for (const scenario of scenarios) {
      const results = await this.simulateEvacuation(scenario);
      results.forEach(result => {
        if (result.route.length > 0) {
          aStarPathFinder.recordEvacuation(
            result.route,
            result.success,
            result.timeTaken,
            result.occupancy
          );
          trainingData.push({
            scenario,
            result
          });
        }
      });
    }
    
    return {
      scenarios: scenarios.length,
      trainingSamples: trainingData.length,
      message: `Generated ${trainingData.length} training samples from ${scenarios.length} scenarios`
    };
  }
}

module.exports = {
  PathTrainingDataGenerator
};

