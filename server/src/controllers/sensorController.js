import { z } from 'zod';
import SensorData from '../models/SensorData.js';
import { getIo } from '../socket/socket.js';
import DEVICE_REGISTRY from '../config/deviceRegistry.js';

// Global cache for device status (in-memory)
// Keys: deviceId, Values: timestamp of last seen
export const deviceStatusCache = new Map();

const sensorDataSchema = z.object({
  deviceId: z.string().min(1, "Device ID is required"),
  temperature: z.number({ required_error: "Temperature is required" }),
  humidity: z.number({ required_error: "Humidity is required" }),
  predictedTemperature: z.number().optional(),
  predictionMinutes: z.number().int().positive().max(60).default(5),
  predictedRisk: z.enum(['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH']).optional(),
  riskClass: z.union([z.string().min(1), z.number()]).optional(),
  riskLabel: z.string().min(1).optional(),
  gps: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional(),
  risk: z.enum(['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH']).optional(),
  timestamp: z.string().datetime({ message: "Invalid timestamp format, must be ISO 8601" }).optional()
}).superRefine((data, context) => {
  const hasLegacyRisk = data.risk !== undefined;
  const hasNewRiskFields = data.riskClass !== undefined && data.riskLabel !== undefined;

  if (!hasLegacyRisk && !hasNewRiskFields) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide risk or both riskClass and riskLabel'
    });
  }
});

// @desc    Receive sensor data from Raspberry Pi
// @route   POST /api/sensor-data
// @access  Private (Device API Key)
export const receiveSensorData = async (req, res, next) => {
  try {
    const validatedData = sensorDataSchema.parse(req.body);
    console.log('HeatWatch sensor reading:', validatedData);

    const risk =
      validatedData.risk ??
      (['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH'].includes(validatedData.riskLabel?.toUpperCase())
        ? validatedData.riskLabel.toUpperCase()
        : undefined);
    const timestamp = validatedData.timestamp ? new Date(validatedData.timestamp) : new Date();

    const sensorData = await SensorData.create({
      deviceId: validatedData.deviceId,
      temperature: validatedData.temperature,
      humidity: validatedData.humidity,
      predictedTemperature: validatedData.predictedTemperature ?? validatedData.temperature,
      predictionMinutes: validatedData.predictionMinutes,
      predictedRisk: validatedData.predictedRisk,
      riskClass: validatedData.riskClass,
      riskLabel: validatedData.riskLabel,
      gps: validatedData.gps,
      risk,
      timestamp
    });

    // Update device last seen status
    deviceStatusCache.set(validatedData.deviceId, Date.now());

    // Emit Socket.IO event to clients in the device room
    const io = getIo();
    io.to(validatedData.deviceId).emit("sensor:update", {
      deviceId: sensorData.deviceId,
      temperature: sensorData.temperature,
      humidity: sensorData.humidity,
      predictedTemperature: sensorData.predictedTemperature,
      predictionMinutes: sensorData.predictionMinutes,
      predictedRisk: sensorData.predictedRisk,
      riskClass: sensorData.riskClass,
      riskLabel: sensorData.riskLabel,
      gps: sensorData.gps,
      risk: sensorData.risk,
      timestamp: sensorData.timestamp
    });

    res.status(200).json({
      success: true,
      message: "Sensor data received"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400);
      return next(new Error(`Validation Error: ${error.errors.map(e => e.message).join(', ')}`));
    }
    next(error);
  }
};

// @desc    Get latest sensor data for a device
// @route   GET /api/sensor-data/latest/:deviceId
// @access  Public (for frontend)
export const getLatestSensorData = async (req, res, next) => {
  try {
    const { deviceId } = req.params;

    const latestData = await SensorData.findOne({ deviceId }).sort({ timestamp: -1 });

    if (!latestData) {
      res.status(404);
      throw new Error('No data found for this device');
    }

    res.status(200).json({
      success: true,
      data: latestData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get historical sensor data for a device
// @route   GET /api/sensor-data/history/:deviceId
// @access  Public (for frontend)
export const getHistoricalSensorData = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const hours = parseInt(req.query.hours, 10) || 24;

    const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);

    const historyData = await SensorData.find({
      deviceId,
      timestamp: { $gte: timeThreshold }
    }).sort({ timestamp: 1 }); // Chronological order

    res.status(200).json({
      success: true,
      count: historyData.length,
      data: historyData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get device online/offline status
// @route   GET /api/devices/:deviceId/status
// @access  Public (for frontend)
export const getDeviceStatus = (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const lastSeen = deviceStatusCache.get(deviceId);
    
    let status = "OFFLINE";
    const TWO_MINUTES_MS = 2 * 60 * 1000;

    if (lastSeen && (Date.now() - lastSeen) <= TWO_MINUTES_MS) {
      status = "ONLINE";
    }

    res.status(200).json({
      success: true,
      deviceId,
      status,
      lastSeen: lastSeen ? new Date(lastSeen).toISOString() : null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all registered devices with latest sensor data and status
// @route   GET /api/devices
// @access  Public (for frontend)
export const getDevices = async (req, res, next) => {
  try {
    const TWO_MINUTES_MS = 2 * 60 * 1000;

    // Fetch latest sensor reading for each registered device in parallel
    const devices = await Promise.all(
      DEVICE_REGISTRY.map(async (device) => {
        const latest = await SensorData.findOne({ deviceId: device.deviceId })
          .sort({ timestamp: -1 })
          .lean();

        const lastSeenMs = deviceStatusCache.get(device.deviceId);
        const status =
          lastSeenMs && Date.now() - lastSeenMs <= TWO_MINUTES_MS
            ? 'ONLINE'
            : 'OFFLINE';

        return {
          deviceId: device.deviceId,
          locationName: device.locationName,
          latitude: latest?.gps?.lat ?? device.latitude,
          longitude: latest?.gps?.lng ?? device.longitude,
          temperature: latest?.temperature ?? null,
          humidity: latest?.humidity ?? null,
          predictedTemperature: latest?.predictedTemperature ?? null,
          predictionMinutes: latest?.predictionMinutes ?? 5,
          predictedRisk: latest?.predictedRisk ?? null,
          riskClass: latest?.riskClass ?? null,
          riskLabel: latest?.riskLabel ?? null,
          gps: latest?.gps ?? null,
          risk: latest?.risk ?? 'LOW',
          status,
          lastSeen: lastSeenMs ? new Date(lastSeenMs).toISOString() : null,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: devices.length,
      data: devices,
    });
  } catch (error) {
    next(error);
  }
};
