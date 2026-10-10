import mongoose from 'mongoose';

const sensorDataSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  temperature: {
    type: Number,
    required: true
  },
  humidity: {
    type: Number,
    required: true
  },
  predictedTemperature: {
    type: Number,
    required: true
  },
  predictionMinutes: {
    type: Number,
    default: 5
  },
  predictedRisk: {
    type: String,
    enum: ['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH']
  },
  gps: {
    lat: Number,
    lng: Number
  },
  risk: {
    type: String,
    enum: ['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH'],
    required: true
  },
  timestamp: {
    type: Date,
    required: true
  }
}, {
  timestamps: true // adds createdAt and updatedAt
});

// Index for frequently querying the latest reading of a device
sensorDataSchema.index({ deviceId: 1, timestamp: -1 });

const SensorData = mongoose.model('SensorData', sensorDataSchema);

export default SensorData;
