/**
 * Advanced Evacuation Path Algorithm with A* and ML Optimization
 * Implements A* algorithm with ML-based path optimization
 * Building Model: Shoe Rack
 * Building dimensions: 17D × 15W × 15H centimeters
 * - Each base/shelf = 1 floor (4 floors total)
 * - 4 blocks/sections per floor
 * - All distances in centimeters
 */

const config = require('../config');

/**
 * A* Algorithm Node for Pathfinding
 */
class AStarNode {
  constructor(id, floor, x, y, type = 'normal') {
    this.id = id;
    this.floor = floor;
    this.x = x;
    this.y = y;
    this.type = type;
    this.neighbors = [];
    this.weight = 1;
    this.capacity = 50;
    this.currentOccupancy = 0;
    this.isBlocked = false;
    this.hazardLevel = 0;
    this.historicalUsage = 0; // ML training data: how often this node is used
    this.successRate = 1.0; // ML training data: success rate of evacuations through this node
    this.averageTime = 0; // ML training data: average evacuation time
  }

  addNeighbor(node, weight = 1) {
    this.neighbors.push({ node, weight });
  }

  getDistance(otherNode) {
    // Distance in centimeters (building is shoe rack model)
    const dx = this.x - otherNode.x;
    const dy = this.y - otherNode.y;
    const dz = Math.abs(this.floor - otherNode.floor) * 15; // 15cm height per floor
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  getHeuristic(targetNode) {
    // Manhattan distance in centimeters with floor penalty
    const dx = Math.abs(this.x - targetNode.x);
    const dy = Math.abs(this.y - targetNode.y);
    const dz = Math.abs(this.floor - targetNode.floor) * 15; // 15cm per floor
    return dx + dy + dz;
  }
}

/**
 * ML Path Optimizer - Trains on historical evacuation data
 */
class MLPathOptimizer {
  constructor() {
    this.trainingData = [];
    this.pathWeights = new Map(); // Node ID -> optimized weight
    this.evacuationHistory = [];
    this.maxHistory = 10000;
  }

  /**
   * Add training data from successful evacuation
   */
  addTrainingData(route, success, timeTaken, occupancy) {
    this.evacuationHistory.push({
      route: route.map(n => n.id),
      success,
      timeTaken,
      occupancy,
      timestamp: new Date()
    });

    if (this.evacuationHistory.length > this.maxHistory) {
      this.evacuationHistory.shift();
    }

    // Update node weights based on success
    if (success) {
      route.forEach((node, index) => {
        const currentWeight = this.pathWeights.get(node.id) || node.weight;
        // Successful paths get lower weights (preferred)
        const newWeight = currentWeight * 0.95;
        this.pathWeights.set(node.id, Math.max(0.1, newWeight));
        
        // Update node statistics
        node.historicalUsage = (node.historicalUsage || 0) + 1;
        node.successRate = ((node.successRate || 1.0) * 0.9) + (success ? 0.1 : 0);
        node.averageTime = ((node.averageTime || timeTaken) * 0.9) + (timeTaken * 0.1);
      });
    } else {
      // Failed paths get higher weights (avoided)
      route.forEach(node => {
        const currentWeight = this.pathWeights.get(node.id) || node.weight;
        this.pathWeights.set(node.id, currentWeight * 1.1);
      });
    }
  }

  /**
   * Get optimized weight for a node based on ML training
   */
  getOptimizedWeight(node) {
    const baseWeight = this.pathWeights.get(node.id) || node.weight;
    
    // Adjust based on historical performance
    let mlWeight = baseWeight;
    
    if (node.historicalUsage > 0) {
      // Prefer nodes with high success rate
      mlWeight *= (2 - node.successRate); // Lower weight for higher success
      
      // Prefer nodes with lower average time
      if (node.averageTime > 0) {
        mlWeight *= (1 + node.averageTime / 60); // Penalize slow paths
      }
    }
    
    // Penalize high occupancy
    if (node.currentOccupancy > 0) {
      mlWeight *= (1 + node.currentOccupancy / node.capacity);
    }
    
    return mlWeight;
  }

  /**
   * Train model on historical data
   */
  trainModel() {
    const recentHistory = this.evacuationHistory.slice(-1000); // Last 1000 evacuations
    
    if (recentHistory.length < 10) {
      return { success: false, message: 'Insufficient training data' };
    }

    // Calculate statistics
    const successRate = recentHistory.filter(h => h.success).length / recentHistory.length;
    const avgTime = recentHistory.reduce((sum, h) => sum + h.timeTaken, 0) / recentHistory.length;
    
    // Update path weights based on patterns
    const nodeUsage = new Map();
    recentHistory.forEach(history => {
      history.route.forEach(nodeId => {
        if (!nodeUsage.has(nodeId)) {
          nodeUsage.set(nodeId, { count: 0, successes: 0, totalTime: 0 });
        }
        const stats = nodeUsage.get(nodeId);
        stats.count++;
        if (history.success) stats.successes++;
        stats.totalTime += history.timeTaken;
      });
    });

    // Optimize weights
    nodeUsage.forEach((stats, nodeId) => {
      const successRate = stats.successes / stats.count;
      const avgTime = stats.totalTime / stats.count;
      
      // Lower weight for successful, fast paths
      const optimizedWeight = (1 - successRate * 0.5) * (1 + avgTime / 120);
      this.pathWeights.set(nodeId, Math.max(0.1, optimizedWeight));
    });

    return {
      success: true,
      trainingSamples: recentHistory.length,
      successRate: successRate,
      averageTime: avgTime,
      optimizedNodes: this.pathWeights.size
    };
  }

  /**
   * Predict evacuation time for a route (in seconds)
   * Note: Building is shoe rack model (centimeters scale)
   * Assumes average movement speed of ~1 cm/second for small scale model
   */
  predictEvacuationTime(route, currentOccupancy) {
    if (route.length === 0) return Infinity;

    let totalTime = 0;
    route.forEach((node, index) => {
      const nextNode = route[Math.min(index + 1, route.length - 1)];
      const distanceCm = node.getDistance(nextNode);
      // For centimeter scale: 1 cm = ~0.1 seconds (small scale model)
      const baseTime = distanceCm * 0.1; // seconds
      const occupancyFactor = 1 + (node.currentOccupancy / node.capacity) * 0.5;
      const mlFactor = node.averageTime > 0 ? node.averageTime / 60 : 1;
      
      totalTime += baseTime * occupancyFactor * mlFactor;
    });

    return totalTime; // Returns time in seconds
  }
}

/**
 * Advanced Building Graph with ML Optimization
 */
class AdvancedBuildingGraph {
  constructor() {
    this.nodes = new Map();
    this.floors = [1, 2, 3, 4];
    this.mlOptimizer = new MLPathOptimizer();
    this.initializeBuilding();
  }

  /**
   * Initialize building structure
   * Note: 4 stairs per floor are the EVACUATION NODES
   * People move towards these nodes for safety
   */
  initializeBuilding() {
    this.floors.forEach(floor => {
      // Exits (4 per floor) - final safety points
      const exits = [
        { id: `exit-${floor}-1`, x: 0, y: 0 },
        { id: `exit-${floor}-2`, x: 0, y: 15 },
        { id: `exit-${floor}-3`, x: 17, y: 0 },
        { id: `exit-${floor}-4`, x: 17, y: 15 }
      ];

      // EVACUATION NODES: 4 stairs per floor (these are the primary safety nodes)
      // People evacuate towards these nodes
      const staircases = [
        { id: `stair-${floor}-1`, x: 4, y: 4 },   // Evacuation Node 1
        { id: `stair-${floor}-2`, x: 4, y: 11 },  // Evacuation Node 2
        { id: `stair-${floor}-3`, x: 13, y: 4 },  // Evacuation Node 3
        { id: `stair-${floor}-4`, x: 13, y: 11 }  // Evacuation Node 4
      ];

      // Elevators (2 per floor)
      const elevators = [
        { id: `elevator-${floor}-1`, x: 8, y: 7 },
        { id: `elevator-${floor}-2`, x: 9, y: 8 }
      ];

      // Regular nodes (optimized grid)
      const gridDensity = 3; // 3x3 grid per block for better pathfinding
      for (let block = 0; block < 4; block++) {
        const blockX = block % 2 === 0 ? 0 : 9;
        const blockY = block < 2 ? 0 : 8;
        
        for (let i = 0; i < gridDensity; i++) {
          for (let j = 0; j < gridDensity; j++) {
            const x = blockX + (i * 5.67); // 17/3 ≈ 5.67
            const y = blockY + (j * 5); // 15/3 = 5
            const id = `node-${floor}-${block}-${i}-${j}`;
            
            if (x <= 17 && y <= 15) {
              const node = new AStarNode(id, floor, Math.round(x), Math.round(y), 'normal');
              this.nodes.set(id, node);
            }
          }
        }
      }

      // Add exits
      exits.forEach(exit => {
        const node = new AStarNode(exit.id, floor, exit.x, exit.y, 'exit');
        node.weight = 0.5; // Prefer exits
        this.nodes.set(exit.id, node);
      });

      // Add staircases
      staircases.forEach(stair => {
        const node = new AStarNode(stair.id, floor, stair.x, stair.y, 'staircase');
        node.weight = 0.7; // Prefer staircases
        this.nodes.set(stair.id, node);
      });

      // Add elevators
      elevators.forEach(elevator => {
        const node = new AStarNode(elevator.id, floor, elevator.x, elevator.y, 'elevator');
        this.nodes.set(elevator.id, node);
      });
    });

    this.connectNodes();
  }

  /**
   * Connect nodes with optimized weights
   */
  connectNodes() {
    this.nodes.forEach((node, nodeId) => {
      // Connect to nearby nodes on same floor
      this.nodes.forEach((otherNode, otherId) => {
        if (node.floor === otherNode.floor && nodeId !== otherId) {
          const distance = node.getDistance(otherNode);
          
          // Connection radius: 6 cm (appropriate for centimeter-scale shoe rack model)
          if (distance <= 6) {
            let weight = distance;
            
            // Apply ML-optimized weights
            weight *= this.mlOptimizer.getOptimizedWeight(otherNode);
            
            // Type-based adjustments
            if (otherNode.type === 'exit') weight *= 0.5;
            if (otherNode.type === 'staircase') weight *= 0.7;
            if (otherNode.hazardLevel > 0) weight *= (1 + otherNode.hazardLevel);
            if (otherNode.isBlocked) weight = Infinity;
            
            node.addNeighbor(otherNode, weight);
          }
        }
      });

      // Connect staircases between floors (shoe rack: vertical movement between shelves)
      if (node.type === 'staircase') {
        const stairNum = node.id.split('-')[2];
        this.floors.forEach(floor => {
          if (floor !== node.floor) {
            const otherStairId = `stair-${floor}-${stairNum}`;
            const otherStair = this.nodes.get(otherStairId);
            if (otherStair) {
              // Weight based on vertical distance: 15cm per floor
              const verticalDistance = Math.abs(floor - node.floor) * 15; // cm
              const weight = verticalDistance * 0.1; // Convert to time weight
              node.addNeighbor(otherStair, weight);
            }
          }
        });
      }
    });
  }

  /**
   * Update hazards and recalculate paths
   */
  updateHazards(floor, hazards) {
    this.nodes.forEach(node => {
      if (node.floor === floor) {
        node.hazardLevel = 0;
        node.isBlocked = false;

        hazards.forEach(hazard => {
          // Distance in centimeters
          const hazardDistance = Math.sqrt(
            Math.pow(node.x - hazard.x, 2) + Math.pow(node.y - hazard.y, 2)
          );
          
          // Hazard radius: 4 cm (appropriate for centimeter-scale model)
          if (hazardDistance < 4) {
            node.hazardLevel = Math.max(node.hazardLevel, hazard.level);
            if (hazard.level >= 8) {
              node.isBlocked = true;
            }
          }
        });
      }
    });
    
    // Reconnect nodes after hazard update
    this.connectNodes();
  }

  getNode(nodeId) {
    return this.nodes.get(nodeId);
  }

  getFloorNodes(floor) {
    const floorNodes = [];
    this.nodes.forEach(node => {
      if (node.floor === floor) {
        floorNodes.push(node);
      }
    });
    return floorNodes;
  }

  getExitNodes(floor) {
    const exits = [];
    this.nodes.forEach(node => {
      if (node.floor === floor && node.type === 'exit') {
        exits.push(node);
      }
    });
    return exits;
  }
}

/**
 * A* Pathfinding Algorithm Implementation
 */
class AStarPathFinder {
  constructor(buildingGraph) {
    this.graph = buildingGraph;
  }

  /**
   * A* Algorithm for finding optimal path
   */
  findPath(startNodeId, endNodeId) {
    const startNode = this.graph.getNode(startNodeId);
    const endNode = this.graph.getNode(endNodeId);

    if (!startNode || !endNode) {
      return { path: [], distance: Infinity, error: 'Invalid node IDs' };
    }

    // A* algorithm data structures
    const openSet = new Set([startNode.id]);
    const closedSet = new Set();
    const gScore = new Map(); // Cost from start
    const fScore = new Map(); // Estimated total cost
    const cameFrom = new Map();

    // Initialize scores
    this.graph.nodes.forEach((node, id) => {
      gScore.set(id, Infinity);
      fScore.set(id, Infinity);
    });

    gScore.set(startNodeId, 0);
    fScore.set(startNodeId, startNode.getHeuristic(endNode));

    // A* main loop
    while (openSet.size > 0) {
      // Find node with lowest fScore
      let currentId = null;
      let lowestF = Infinity;
      
      openSet.forEach(id => {
        const f = fScore.get(id);
        if (f < lowestF) {
          lowestF = f;
          currentId = id;
        }
      });

      if (currentId === endNodeId) {
        // Reconstruct path
        const path = [];
        let current = endNodeId;
        
        while (current !== null) {
          path.unshift(this.graph.getNode(current));
          current = cameFrom.get(current);
        }

        const distance = gScore.get(endNodeId);
        return {
          path: path.length > 0 && path[0].id === startNodeId ? path : [],
          distance: distance === Infinity ? null : distance,
          steps: path.length
        };
      }

      openSet.delete(currentId);
      closedSet.add(currentId);

      const currentNode = this.graph.getNode(currentId);

      // Explore neighbors
      currentNode.neighbors.forEach(({ node: neighbor, weight }) => {
        if (closedSet.has(neighbor.id)) return;
        if (neighbor.isBlocked) return;

        // Get ML-optimized weight
        const mlWeight = this.graph.mlOptimizer.getOptimizedWeight(neighbor);
        const tentativeGScore = gScore.get(currentId) + weight * mlWeight;

        if (!openSet.has(neighbor.id)) {
          openSet.add(neighbor.id);
        } else if (tentativeGScore >= gScore.get(neighbor.id)) {
          return; // Not a better path
        }

        cameFrom.set(neighbor.id, currentId);
        gScore.set(neighbor.id, tentativeGScore);
        fScore.set(neighbor.id, tentativeGScore + neighbor.getHeuristic(endNode));
      });
    }

    // No path found
    return { path: [], distance: Infinity, error: 'No path found' };
  }

  /**
   * Find best evacuation route using A*
   */
  findBestEvacuationRoute(startNodeId, floor) {
    const exitNodes = this.graph.getExitNodes(floor);
    
    if (exitNodes.length === 0) {
      // Find nearest staircase
      const staircases = Array.from(this.graph.nodes.values())
        .filter(n => n.floor === floor && n.type === 'staircase');
      
      if (staircases.length === 0) {
        return { path: [], distance: Infinity, error: 'No evacuation route found' };
      }

      const startNode = this.graph.getNode(startNodeId);
      let nearestStair = staircases[0];
      let minDist = startNode.getDistance(nearestStair);

      staircases.forEach(stair => {
        const dist = startNode.getDistance(stair);
        if (dist < minDist) {
          minDist = dist;
          nearestStair = stair;
        }
      });

      // Find path to ground floor exit
      const groundFloor = 1;
      const groundStairId = `stair-${groundFloor}-${nearestStair.id.split('-')[2]}`;
      const groundExit = this.graph.getExitNodes(groundFloor)[0];

      const path1 = this.findPath(startNodeId, nearestStair.id);
      const path2 = this.findPath(groundStairId, groundExit.id);

      return {
        path: [...path1.path, ...path2.path],
        distance: (path1.distance || 0) + (path2.distance || 0),
        steps: path1.steps + path2.steps,
        route: 'via_staircase'
      };
    }

    // Find best path to each exit using A*
    const routes = exitNodes.map(exit => {
      const result = this.findPath(startNodeId, exit.id);
      return {
        ...result,
        exitNode: exit
      };
    });

    // Sort by distance and return best
    routes.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    return routes[0] || { path: [], distance: Infinity, error: 'No route found' };
  }

  /**
   * Find evacuation routes for entire floor
   */
  findFloorEvacuationRoutes(floor, hazards = []) {
    this.graph.updateHazards(floor, hazards);

    const floorNodes = this.graph.getFloorNodes(floor);
    const routes = [];

    floorNodes.forEach(node => {
      if (node.type === 'exit') return;

      const route = this.findBestEvacuationRoute(node.id, floor);
      routes.push({
        startNode: node,
        ...route
      });
    });

    return routes;
  }

  /**
   * Get evacuation instructions with ML predictions
   */
  getEvacuationInstructions(floor, x, y) {
    const floorNodes = this.graph.getFloorNodes(floor);
    let nearestNode = floorNodes[0];
    let minDist = Math.sqrt(
      Math.pow(nearestNode.x - x, 2) + Math.pow(nearestNode.y - y, 2)
    );

    floorNodes.forEach(node => {
      const dist = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
      if (dist < minDist) {
        minDist = dist;
        nearestNode = node;
      }
    });

    const route = this.findBestEvacuationRoute(nearestNode.id, floor);
    
    // Predict evacuation time using ML
    const predictedTime = this.graph.mlOptimizer.predictEvacuationTime(
      route.path,
      nearestNode.currentOccupancy
    );

    return {
      currentLocation: { floor, x, y },
      nearestNode: nearestNode.id,
      route: route.path.map(n => ({
        id: n.id,
        type: n.type,
        floor: n.floor,
        x: n.x,
        y: n.y,
        instructions: this.getNodeInstructions(n),
        mlConfidence: n.successRate || 0.8,
        estimatedTime: n.averageTime || 0.5
      })),
      distance: route.distance,
      estimatedTime: predictedTime,
      mlPredictedTime: predictedTime,
      steps: route.steps,
      confidence: this.calculateRouteConfidence(route.path)
    };
  }

  /**
   * Calculate route confidence based on ML training
   */
  calculateRouteConfidence(path) {
    if (path.length === 0) return 0;

    let totalConfidence = 0;
    path.forEach(node => {
      totalConfidence += node.successRate || 0.8;
    });

    return (totalConfidence / path.length) * 100;
  }

  /**
   * Get human-readable instructions
   */
  getNodeInstructions(node) {
    switch (node.type) {
      case 'exit':
        return `Exit through ${node.id}`;
      case 'staircase':
        return `Use staircase ${node.id.split('-')[2]}`;
      case 'elevator':
        return 'Use elevator (if safe)';
      default:
        return `Move to ${node.id}`;
    }
  }

  /**
   * Train ML model on evacuation data
   */
  trainMLModel() {
    return this.graph.mlOptimizer.trainModel();
  }

  /**
   * Record successful evacuation for ML training
   */
  recordEvacuation(route, success, timeTaken, occupancy) {
    this.graph.mlOptimizer.addTrainingData(route, success, timeTaken, occupancy);
  }
}

// Export singleton instances
const advancedBuildingGraph = new AdvancedBuildingGraph();
const aStarPathFinder = new AStarPathFinder(advancedBuildingGraph);

module.exports = {
  advancedBuildingGraph,
  aStarPathFinder,
  AStarNode,
  MLPathOptimizer,
  AdvancedBuildingGraph,
  AStarPathFinder
};

