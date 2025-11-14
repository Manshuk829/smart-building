/**
 * GraphQL Service for Modern API
 * Provides type-safe, real-time subscriptions
 */

const { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLFloat, GraphQLBoolean, GraphQLList } = require('graphql');
const { PubSub } = require('graphql-subscriptions');

const pubsub = new PubSub();

// Sensor Data Type
const SensorDataType = new GraphQLObjectType({
  name: 'SensorData',
  fields: {
    id: { type: GraphQLString },
    floor: { type: GraphQLInt },
    type: { type: GraphQLString },
    value: { type: GraphQLFloat },
    timestamp: { type: GraphQLString }
  }
});

// Threat Type
const ThreatType = new GraphQLObjectType({
  name: 'Threat',
  fields: {
    type: { type: GraphQLString },
    severity: { type: GraphQLString },
    confidence: { type: GraphQLFloat },
    floor: { type: GraphQLInt },
    message: { type: GraphQLString }
  }
});

// Root Query
const RootQuery = new GraphQLObjectType({
  name: 'Query',
  fields: {
    sensorData: {
      type: new GraphQLList(SensorDataType),
      args: {
        floor: { type: GraphQLInt },
        type: { type: GraphQLString }
      },
      resolve: async (parent, args) => {
        const SensorData = require('../models/SensorData');
        const query = {};
        if (args.floor) query.floor = String(args.floor);
        if (args.type) query.type = args.type;
        
        const data = await SensorData.find(query)
          .sort({ createdAt: -1 })
          .limit(100)
          .lean();
        
        return data.map(d => ({
          id: d._id.toString(),
          floor: parseInt(d.floor),
          type: d.type,
          value: d.payload,
          timestamp: d.createdAt.toISOString()
        }));
      }
    },
    threats: {
      type: new GraphQLList(ThreatType),
      args: {
        floor: { type: GraphQLInt }
      },
      resolve: async (parent, args) => {
        // Get threats from ML engine
        const { mlEngine } = require('../ml/mlModels');
        // Return sample threats (in production, get from actual ML predictions)
        return [];
      }
    }
  }
});

// Root Mutation
const RootMutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    updateSensorData: {
      type: SensorDataType,
      args: {
        floor: { type: GraphQLInt },
        type: { type: GraphQLString },
        value: { type: GraphQLFloat }
      },
      resolve: async (parent, args) => {
        const SensorData = require('../models/SensorData');
        const data = new SensorData({
          floor: String(args.floor),
          type: args.type,
          payload: args.value
        });
        await data.save();
        
        // Publish to subscribers
        pubsub.publish('SENSOR_UPDATE', { sensorUpdate: {
          id: data._id.toString(),
          floor: args.floor,
          type: args.type,
          value: args.value,
          timestamp: data.createdAt.toISOString()
        }});
        
        return {
          id: data._id.toString(),
          floor: args.floor,
          type: args.type,
          value: args.value,
          timestamp: data.createdAt.toISOString()
        };
      }
    }
  }
});

// Subscription
const RootSubscription = new GraphQLObjectType({
  name: 'Subscription',
  fields: {
    sensorUpdate: {
      type: SensorDataType,
      subscribe: () => pubsub.asyncIterator(['SENSOR_UPDATE'])
    },
    threatAlert: {
      type: ThreatType,
      subscribe: () => pubsub.asyncIterator(['THREAT_ALERT'])
    }
  }
});

// Schema
const schema = new GraphQLSchema({
  query: RootQuery,
  mutation: RootMutation,
  subscription: RootSubscription
});

module.exports = { schema, pubsub };

