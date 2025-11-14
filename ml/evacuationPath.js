/**
 * Evacuation Path Algorithm
 * Implements Dijkstra's algorithm for finding optimal evacuation routes
 * Building dimensions: 17D × 15W × 15H, 4 blocks, 4 floors
 */

const config = require('../config');

/**
 * Building Node Structure
 * Each floor has nodes representing key locations
 */
class BuildingNode {
  constructor(id, floor, x, y, type = 'normal') {
    this.id = id;
    this.floor = floor;
    this.x = x; // Depth position (0-17)
    this.y = y; // Width position (0-15)
    this.type = type; // 'normal', 'staircase', 'exit', 'elevator', 'hazard'
    this.neighbors = [];
    this.weight = 1; // Base weight for path calculation
    this.capacity = 50; // Maximum people capacity
    this.currentOccupancy = 0;
    this.isBlocked = false;
    this.hazardLevel = 0; // 0 = safe, 1-10 = danger level
  }

  addNeighbor(node, weight = 1) {
    this.neighbors.push({ node, weight });
  }

  getDistance(otherNode) {
    // Euclidean distance
    const dx = this.x - otherNode.x;
    const dy = this.y - otherNode.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

/**
 * Building Graph - Represents the entire building structure
 */
class BuildingGraph {
  constructor() {
    this.nodes = new Map();
    this.floors = [1, 2, 3, 4];
    this.initializeBuilding();
  }

  /**
   * Initialize building structure with nodes
   */
  initializeBuilding() {
    // Create nodes for each floor
    this.floors.forEach(floor => {
      // Main exits (4 per floor - one in each block)
      const exits = [
        { id: `exit-${floor}-1`, x: 0, y: 0 },      // Block 1 exit
        { id: `exit-${floor}-2`, x: 0, y: 15 },     // Block 2 exit
        { id: `exit-${floor}-3`, x: 17, y: 0 },     // Block 3 exit
        { id: `exit-${floor}-4`, x: 17, y: 15 }     // Block 4 exit
      ];

      // Staircases (4 per floor - connecting floors)
      const staircases = [
        { id: `stair-${floor}-1`, x: 4, y: 4 },
        { id: `stair-${floor}-2`, x: 4, y: 11 },
        { id: `stair-${floor}-3`, x: 13, y: 4 },
        { id: `stair-${floor}-4`, x: 13, y: 11 }
      ];

      // Elevators (2 per floor)
      const elevators = [
        { id: `elevator-${floor}-1`, x: 8, y: 7 },
        { id: `elevator-${floor}-2`, x: 9, y: 8 }
      ];

      // Regular nodes (grid of key locations)
      const gridSize = 4; // 4x4 grid per block
      for (let block = 0; block < 4; block++) {
        const blockX = block % 2 === 0 ? 0 : 9;
        const blockY = block < 2 ? 0 : 8;
        
        for (let i = 0; i < gridSize; i++) {
          for (let j = 0; j < gridSize; j++) {
            const x = blockX + (i * 4);
            const y = blockY + (j * 2);
            const id = `node-${floor}-${block}-${i}-${j}`;
            
            if (x <= 17 && y <= 15) {
              const node = new BuildingNode(id, floor, x, y, 'normal');
              this.nodes.set(id, node);
            }
          }
        }
      }

      // Add exits
      exits.forEach(exit => {
        const node = new BuildingNode(exit.id, floor, exit.x, exit.y, 'exit');
        this.nodes.set(exit.id, node);
      });

      // Add staircases
      staircases.forEach(stair => {
        const node = new BuildingNode(stair.id, floor, stair.x, stair.y, 'staircase');
        this.nodes.set(stair.id, node);
      });

      // Add elevators
      elevators.forEach(elevator => {
        const node = new BuildingNode(elevator.id, floor, elevator.x, elevator.y, 'elevator');
        this.nodes.set(elevator.id, node);
      });
    });

    // Connect nodes
    this.connectNodes();
  }

  /**
   * Connect nodes based on proximity and building structure
   */
  connectNodes() {
    this.nodes.forEach((node, nodeId) => {
      // Find nearby nodes on the same floor
      this.nodes.forEach((otherNode, otherId) => {
        if (node.floor === otherNode.floor && nodeId !== otherId) {
          const distance = node.getDistance(otherNode);
          
          // Connect if within reasonable distance (adjacent or nearby)
          if (distance <= 5) {
            let weight = distance;
            
            // Adjust weight based on node type
            if (otherNode.type === 'exit') weight *= 0.5; // Prefer exits
            if (otherNode.type === 'staircase') weight *= 0.7; // Prefer staircases
            if (otherNode.hazardLevel > 0) weight *= (1 + otherNode.hazardLevel); // Avoid hazards
            if (otherNode.isBlocked) weight = Infinity; // Blocked paths
            
            node.addNeighbor(otherNode, weight);
          }
        }
      });

      // Connect staircases between floors
      if (node.type === 'staircase') {
        const stairNum = node.id.split('-')[2];
        this.floors.forEach(floor => {
          if (floor !== node.floor) {
            const otherStairId = `stair-${floor}-${stairNum}`;
            const otherStair = this.nodes.get(otherStairId);
            if (otherStair) {
              // Staircase connection weight (vertical movement)
              const weight = Math.abs(floor - node.floor) * 2;
              node.addNeighbor(otherStair, weight);
            }
          }
        });
      }
    });
  }

  /**
   * Update hazard levels based on sensor data
   */
  updateHazards(floor, hazards) {
    this.nodes.forEach(node => {
      if (node.floor === floor) {
        // Reset hazard level
        node.hazardLevel = 0;
        node.isBlocked = false;

        // Apply hazards based on location
        hazards.forEach(hazard => {
          const hazardDistance = Math.sqrt(
            Math.pow(node.x - hazard.x, 2) + Math.pow(node.y - hazard.y, 2)
          );
          
          if (hazardDistance < 3) {
            node.hazardLevel = Math.max(node.hazardLevel, hazard.level);
            if (hazard.level >= 8) {
              node.isBlocked = true;
            }
          }
        });
      }
    });
  }

  /**
   * Get node by ID
   */
  getNode(nodeId) {
    return this.nodes.get(nodeId);
  }

  /**
   * Get all nodes on a floor
   */
  getFloorNodes(floor) {
    const floorNodes = [];
    this.nodes.forEach(node => {
      if (node.floor === floor) {
        floorNodes.push(node);
      }
    });
    return floorNodes;
  }

  /**
   * Get exit nodes for a floor
   */
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
 * Dijkstra's Algorithm for Shortest Path
 */
class EvacuationPathFinder {
  constructor(buildingGraph) {
    this.graph = buildingGraph;
  }

  /**
   * Find shortest path from start to end
   */
  findShortestPath(startNodeId, endNodeId) {
    const startNode = this.graph.getNode(startNodeId);
    const endNode = this.graph.getNode(endNodeId);

    if (!startNode || !endNode) {
      return { path: [], distance: Infinity, error: 'Invalid node IDs' };
    }

    // Initialize distances
    const distances = new Map();
    const previous = new Map();
    const visited = new Set();
    const priorityQueue = [];

    this.graph.nodes.forEach((node, id) => {
      distances.set(id, Infinity);
      previous.set(id, null);
    });

    distances.set(startNodeId, 0);
    priorityQueue.push({ node: startNode, distance: 0 });

    // Dijkstra's algorithm
    while (priorityQueue.length > 0) {
      // Sort by distance (priority queue)
      priorityQueue.sort((a, b) => a.distance - b.distance);
      const { node: currentNode } = priorityQueue.shift();

      if (visited.has(currentNode.id)) continue;
      visited.add(currentNode.id);

      // Check if we reached the destination
      if (currentNode.id === endNodeId) {
        break;
      }

      // Explore neighbors
      currentNode.neighbors.forEach(({ node: neighbor, weight }) => {
        if (visited.has(neighbor.id)) return;
        if (neighbor.isBlocked) return; // Skip blocked nodes

        const altDistance = distances.get(currentNode.id) + weight;
        const currentNeighborDistance = distances.get(neighbor.id);
        
        if (altDistance < currentNeighborDistance) {
          distances.set(neighbor.id, altDistance);
          previous.set(neighbor.id, currentNode.id);
          priorityQueue.push({ node: neighbor, distance: altDistance });
        }
      });
    }

    // Reconstruct path
    const path = [];
    let currentId = endNodeId;

    while (currentId !== null) {
      path.unshift(this.graph.getNode(currentId));
      currentId = previous.get(currentId);
    }

    const distance = distances.get(endNodeId);

    return {
      path: path.length > 0 && path[0].id === startNodeId ? path : [],
      distance: distance === Infinity ? null : distance,
      steps: path.length
    };
  }

  /**
   * Find best evacuation route from a location
   */
  findBestEvacuationRoute(startNodeId, floor) {
    const exitNodes = this.graph.getExitNodes(floor);
    
    if (exitNodes.length === 0) {
      // If no exits on current floor, find nearest staircase
      const staircases = Array.from(this.graph.nodes.values())
        .filter(n => n.floor === floor && n.type === 'staircase');
      
      if (staircases.length === 0) {
        return { path: [], distance: Infinity, error: 'No evacuation route found' };
      }

      // Find nearest staircase
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

      // Find path to ground floor exit via staircase
      const groundFloor = 1;
      const groundStairId = `stair-${groundFloor}-${nearestStair.id.split('-')[2]}`;
      const groundExit = this.graph.getExitNodes(groundFloor)[0];

      const path1 = this.findShortestPath(startNodeId, nearestStair.id);
      const path2 = this.findShortestPath(groundStairId, groundExit.id);

      return {
        path: [...path1.path, ...path2.path],
        distance: (path1.distance || 0) + (path2.distance || 0),
        steps: path1.steps + path2.steps,
        route: 'via_staircase'
      };
    }

    // Find shortest path to each exit
    const routes = exitNodes.map(exit => {
      const result = this.findShortestPath(startNodeId, exit.id);
      return {
        ...result,
        exitNode: exit
      };
    });

    // Sort by distance and return best route
    routes.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

    return routes[0] || { path: [], distance: Infinity, error: 'No route found' };
  }

  /**
   * Find evacuation routes for all nodes on a floor
   */
  findFloorEvacuationRoutes(floor, hazards = []) {
    // Update hazards
    this.graph.updateHazards(floor, hazards);

    const floorNodes = this.graph.getFloorNodes(floor);
    const routes = [];

    floorNodes.forEach(node => {
      if (node.type === 'exit') return; // Skip exit nodes

      const route = this.findBestEvacuationRoute(node.id, floor);
      routes.push({
        startNode: node,
        ...route
      });
    });

    return routes;
  }

  /**
   * Get evacuation instructions for a specific location
   */
  getEvacuationInstructions(floor, x, y) {
    // Find nearest node to the given coordinates
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

    return {
      currentLocation: { floor, x, y },
      nearestNode: nearestNode.id,
      route: route.path.map(n => ({
        id: n.id,
        type: n.type,
        floor: n.floor,
        x: n.x,
        y: n.y,
        instructions: this.getNodeInstructions(n)
      })),
      distance: route.distance,
      estimatedTime: route.distance ? Math.ceil(route.distance * 0.5) : null, // 0.5 min per unit
      steps: route.steps
    };
  }

  /**
   * Get human-readable instructions for a node
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
}

// Export singleton instances
const buildingGraph = new BuildingGraph();
const pathFinder = new EvacuationPathFinder(buildingGraph);

module.exports = {
  buildingGraph,
  pathFinder,
  BuildingNode,
  BuildingGraph,
  EvacuationPathFinder
};

