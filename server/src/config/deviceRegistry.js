/**
 * Device Registry — static metadata for all registered Raspberry Pi monitoring nodes.
 * Latitude, longitude, and locationName are physical facts that don't change with
 * sensor readings, so they live here rather than in the time-series SensorData collection.
 *
 * Add a new entry here whenever a new Pi is deployed at a bus stop.
 */
const DEVICE_REGISTRY = [
  {
    deviceId: 'BUS_STOP_01',
    locationName: 'Patia Bus Stop',
    latitude: 20.3548,
    longitude: 85.8186,
  },
  {
    deviceId: 'SCHOOL',
    locationName: 'Master Canteen Square',
    latitude: 20.2670,
    longitude: 85.8430,
  },
];

export default DEVICE_REGISTRY;
