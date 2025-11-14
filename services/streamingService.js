/**
 * Real-Time Streaming Service
 * Handles WebSocket streams, Server-Sent Events, and real-time data pipelines
 */

const EventEmitter = require('events');

class StreamingService extends EventEmitter {
  constructor() {
    super();
    this.streams = new Map();
    this.clients = new Map();
    this.bufferSize = 1000;
    this.streamingInterval = null;
  }

  /**
   * Initialize streaming service
   */
  initialize(io) {
    this.io = io;
    this.setupStreamHandlers();
    this.startStreaming();
    return { success: true, message: 'Streaming service initialized' };
  }

  /**
   * Setup stream handlers
   */
  setupStreamHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      this.clients.set(socket.id, {
        socket,
        subscriptions: new Set(),
        connectedAt: new Date()
      });

      // Handle subscriptions
      socket.on('subscribe', (streamType) => {
        this.subscribe(socket.id, streamType);
      });

      socket.on('unsubscribe', (streamType) => {
        this.unsubscribe(socket.id, streamType);
      });

      socket.on('disconnect', () => {
        this.clients.delete(socket.id);
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Subscribe client to stream
   */
  subscribe(clientId, streamType) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.add(streamType);
    
    if (!this.streams.has(streamType)) {
      this.streams.set(streamType, {
        type: streamType,
        subscribers: new Set(),
        buffer: [],
        lastUpdate: null
      });
    }

    this.streams.get(streamType).subscribers.add(clientId);
    console.log(`Client ${clientId} subscribed to ${streamType}`);
  }

  /**
   * Unsubscribe client from stream
   */
  unsubscribe(clientId, streamType) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.delete(streamType);
    
    const stream = this.streams.get(streamType);
    if (stream) {
      stream.subscribers.delete(clientId);
    }
  }

  /**
   * Start streaming data
   */
  startStreaming() {
    if (this.streamingInterval) {
      clearInterval(this.streamingInterval);
    }

    this.streamingInterval = setInterval(() => {
      this.broadcastStreams();
    }, 100); // Stream every 100ms for real-time updates
  }

  /**
   * Broadcast streams to subscribers
   */
  broadcastStreams() {
    this.streams.forEach((stream, streamType) => {
      if (stream.subscribers.size === 0) return;

      const data = this.getStreamData(streamType);
      if (!data) return;

      // Add to buffer
      stream.buffer.push({
        ...data,
        timestamp: new Date()
      });

      // Keep buffer size manageable
      if (stream.buffer.length > this.bufferSize) {
        stream.buffer.shift();
      }

      // Broadcast to all subscribers
      stream.subscribers.forEach(clientId => {
        const client = this.clients.get(clientId);
        if (client && client.socket) {
          client.socket.emit(`stream:${streamType}`, data);
        }
      });
    });
  }

  /**
   * Get stream data based on type
   */
  getStreamData(streamType) {
    switch (streamType) {
      case 'sensors':
        return this.getSensorStream();
      case 'threats':
        return this.getThreatStream();
      case 'analytics':
        return this.getAnalyticsStream();
      case 'pathfinding':
        return this.getPathfindingStream();
      default:
        return null;
    }
  }

  /**
   * Get sensor stream data
   */
  getSensorStream() {
    // In production, get from actual sensor data
    return {
      type: 'sensors',
      data: {
        temp: 25 + Math.random() * 5,
        humidity: 50 + Math.random() * 10,
        gas: 200 + Math.random() * 50,
        vibration: 0.5 + Math.random() * 0.5
      },
      timestamp: new Date()
    };
  }

  /**
   * Get threat stream data
   */
  getThreatStream() {
    return {
      type: 'threats',
      data: {
        fire: Math.random() * 20,
        gas: Math.random() * 15,
        structural: Math.random() * 10
      },
      timestamp: new Date()
    };
  }

  /**
   * Get analytics stream data
   */
  getAnalyticsStream() {
    return {
      type: 'analytics',
      data: {
        cpuUsage: Math.random() * 30 + 20,
        memoryUsage: Math.random() * 40 + 30,
        throughput: 500 + Math.random() * 100
      },
      timestamp: new Date()
    };
  }

  /**
   * Get pathfinding stream data
   */
  getPathfindingStream() {
    return {
      type: 'pathfinding',
      data: {
        routes: [],
        optimalPath: null,
        updateTime: Date.now()
      },
      timestamp: new Date()
    };
  }

  /**
   * Publish custom stream data
   */
  publish(streamType, data) {
    const stream = this.streams.get(streamType);
    if (!stream) {
      this.streams.set(streamType, {
        type: streamType,
        subscribers: new Set(),
        buffer: [],
        lastUpdate: new Date()
      });
    }

    // Broadcast immediately
    const streamData = this.streams.get(streamType);
    streamData.subscribers.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client && client.socket) {
        client.socket.emit(`stream:${streamType}`, {
          type: streamType,
          data,
          timestamp: new Date()
        });
      }
    });
  }

  /**
   * Get stream statistics
   */
  getStats() {
    return {
      activeStreams: this.streams.size,
      activeClients: this.clients.size,
      streams: Array.from(this.streams.entries()).map(([type, stream]) => ({
        type,
        subscribers: stream.subscribers.size,
        bufferSize: stream.buffer.length
      }))
    };
  }

  /**
   * Stop streaming
   */
  stop() {
    if (this.streamingInterval) {
      clearInterval(this.streamingInterval);
      this.streamingInterval = null;
    }
    this.streams.clear();
    this.clients.clear();
  }
}

module.exports = { StreamingService };

