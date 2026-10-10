import express from 'express';
import {
  receiveSensorData,
  getLatestSensorData,
  getHistoricalSensorData,
  getDeviceStatus,
  getDevices
} from '../controllers/sensorController.js';
import { authDevice } from '../middleware/authDevice.js';

const router = express.Router();

// Public routes for frontend
router.get('/devices', getDevices);
router.get('/sensor-data/latest/:deviceId', getLatestSensorData);
router.get('/sensor-data/history/:deviceId', getHistoricalSensorData);
router.get('/devices/:deviceId/status', getDeviceStatus);

// Private route for Raspberry Pi
router.post('/sensor-data', authDevice, receiveSensorData);

export default router;
