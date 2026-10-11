import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL
});

export const getCurrentWeather = async () => {
  const response = await api.get('/api/weather');
  return response.data;
};

export const getDevices = async () => {
  const response = await api.get('/api/devices');
  return response.data;
};

export const getLatestSensorData = async (deviceId) => {
  const response = await api.get(`/api/sensor-data/latest/${deviceId}`);
  return response.data;
};

export const getSensorHistory = async (deviceId, hours, since) => {
  const params = hours == null || hours === 'all' ? {} : { hours };
  if (since) params.since = since;
  const response = await api.get(`/api/sensor-data/history/${deviceId}`, {
    params,
  });
  return response.data;
};

export const getDeviceStatus = async (deviceId) => {
  const response = await api.get(`/api/devices/${deviceId}/status`);
  return response.data;
};

export default api;
