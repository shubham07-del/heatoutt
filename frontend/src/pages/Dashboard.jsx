import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import Sidebar from '../components/Sidebar';
import CurrentCondition from '../components/CurrentCondition';
import TempHumidityMonitor from '../components/TempHumidityMonitor';
import HeatMap from '../components/HeatMap';
import AlertPanel from '../components/AlertPanel';
import { getCurrentWeather, getDevices } from '../services/api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Dev-only static fallback ─────────────────────────────────────────────────
// Used ONLY when the backend /api/devices call fails in development.
const DEV_FALLBACK_DEVICES =
  import.meta.env.DEV
    ? [
        {
          deviceId: 'BUS_STOP_01',
          locationName: 'Patia Bus Stop',
          latitude: 20.3548,
          longitude: 85.8186,
          temperature: 35.4,
          humidity: 68,
          predictedTemperature: 37.1,
          risk: 'HIGH',
          status: 'ONLINE',
          lastSeen: new Date(Date.now() - 12000).toISOString(),
        },
        {
          deviceId: 'SCHOOL',
          locationName: 'Master Canteen Square',
          latitude: 20.267,
          longitude: 85.843,
          temperature: 39.2,
          humidity: 72,
          predictedTemperature: 40.4,
          risk: 'VERY_HIGH',
          status: 'ONLINE',
          lastSeen: new Date(Date.now() - 8000).toISOString(),
        },
      ]
    : [];

// ─── Section Header ────────────────────────────────────────────────────────────
const SectionHeader = ({ title, subtitle, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-5">
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-text-main tracking-tight">{title}</h2>
      {subtitle && <p className="text-xs sm:text-sm text-text-muted mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [lastSync, setLastSync] = useState(new Date());
  const [isDark, setIsDark] = useState(true);
  const [weatherData, setWeatherData] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Device state
  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [devicesError, setDevicesError] = useState(null);

  // Selected device for the map focus view
  const [selectedDevice, setSelectedDevice] = useState(null);

  // Socket ref — stable across renders
  const socketRef = useRef(null);
  // Track subscribed device rooms
  const subscribedRoomsRef = useRef(new Set());

  // Section refs for scrolling
  const sectionRefs = useRef({});

  // ── Dark mode ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // ── Fetch weather (city aggregate) ───────────────────────────────────────
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const json = await getCurrentWeather();
        if (json.success && json.data) {
          setWeatherData(json.data);
          setLastSync(new Date());
        }
      } catch (err) {
        console.error('Failed to fetch weather data', err);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Fetch all devices on mount ────────────────────────────────────────────
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setDevicesLoading(true);
        setDevicesError(null);
        const json = await getDevices();
        if (json.success && Array.isArray(json.data)) {
          setDevices(json.data);
        } else {
          throw new Error('Unexpected response from /api/devices');
        }
      } catch (err) {
        console.warn('Failed to fetch devices from API, using fallback:', err.message);
        if (DEV_FALLBACK_DEVICES.length > 0) {
          setDevices(DEV_FALLBACK_DEVICES);
        } else {
          setDevicesError('Could not load monitoring nodes. Please check the backend.');
        }
      } finally {
        setDevicesLoading(false);
      }
    };

    fetchDevices();
  }, []);

  // ── Socket.IO — subscribe to device rooms and handle live updates ─────────
  useEffect(() => {
    const socket = io(BASE_URL, { reconnectionDelay: 2000 });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Subscribe to all known device rooms
      devices.forEach((d) => {
        if (!subscribedRoomsRef.current.has(d.deviceId)) {
          socket.emit('subscribe', d.deviceId);
          subscribedRoomsRef.current.add(d.deviceId);
        }
      });
    });

    socket.on('sensor:update', (data) => {
      if (!data?.deviceId) return;
      setLastSync(new Date());

      // Update matching device in-place — do NOT call fitBounds
      setDevices((prev) => {
        const existingDevice = prev.find((d) => d.deviceId === data.deviceId);
        const updatedDevice = {
          ...(existingDevice ?? {
            deviceId: data.deviceId,
            locationName: data.deviceId,
            latitude: null,
            longitude: null,
          }),
          temperature: data.temperature ?? existingDevice?.temperature,
          humidity: data.humidity ?? existingDevice?.humidity,
          predictedTemperature:
            data.predictedTemperature ?? existingDevice?.predictedTemperature,
          predictionMinutes:
            data.predictionMinutes ?? existingDevice?.predictionMinutes ?? 5,
          predictedRisk: data.predictedRisk ?? existingDevice?.predictedRisk,
          riskClass: data.riskClass ?? existingDevice?.riskClass,
          riskLabel: data.riskLabel ?? existingDevice?.riskLabel,
          gps: data.gps ?? existingDevice?.gps,
          latitude: data.gps?.lat ?? existingDevice?.latitude ?? null,
          longitude: data.gps?.lng ?? existingDevice?.longitude ?? null,
          risk: data.risk ?? existingDevice?.risk,
          lastSeen: data.timestamp ?? new Date().toISOString(),
          status: 'ONLINE',
        };

        return [
          updatedDevice,
          ...prev.filter((d) => d.deviceId !== data.deviceId),
        ];
      });

      // Also update selectedDevice if it's the one that got updated
      setSelectedDevice((prev) => {
        if (!prev || prev.deviceId !== data.deviceId) return prev;
        return {
          ...prev,
          temperature: data.temperature ?? prev.temperature,
          humidity: data.humidity ?? prev.humidity,
          predictedTemperature:
            data.predictedTemperature ?? prev.predictedTemperature,
          predictionMinutes:
            data.predictionMinutes ?? prev.predictionMinutes,
          predictedRisk: data.predictedRisk ?? prev.predictedRisk,
          riskClass: data.riskClass ?? prev.riskClass,
          riskLabel: data.riskLabel ?? prev.riskLabel,
          gps: data.gps ?? prev.gps,
          latitude: data.gps?.lat ?? prev.latitude,
          longitude: data.gps?.lng ?? prev.longitude,
          risk: data.risk ?? prev.risk,
          lastSeen: data.timestamp ?? new Date().toISOString(),
          status: 'ONLINE',
        };
      });
    });

    return () => {
      socket.disconnect();
      subscribedRoomsRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [BASE_URL]);

  // Subscribe to new device rooms whenever devices list changes
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;
    devices.forEach((d) => {
      if (!subscribedRoomsRef.current.has(d.deviceId)) {
        socket.emit('subscribe', d.deviceId);
        subscribedRoomsRef.current.add(d.deviceId);
      }
    });
  }, [devices]);

  // ── Device selection handlers ─────────────────────────────────────────────
  const handleSelectDevice = useCallback((device) => {
    // Find the latest version from devices state (may have been updated via socket)
    const latest = devices.find((d) => d.deviceId === device.deviceId) ?? device;
    setSelectedDevice(latest);
  }, [devices]);

  const handleDeselectDevice = useCallback(() => {
    setSelectedDevice(null);
  }, []);

  // Keep selectedDevice in sync with the devices list (live updates)
  useEffect(() => {
    if (!selectedDevice) return;
    const updated = devices.find((d) => d.deviceId === selectedDevice.deviceId);
    if (updated && updated !== selectedDevice) {
      setSelectedDevice(updated);
    }
  }, [devices]); // eslint-disable-line react-hooks/exhaustive-deps

  // Alert count for the sidebar badge
  const alertCount = devices.filter((loc) => {
    const r = loc.risk?.toUpperCase();
    return r === 'VERY_HIGH' || r === 'VERY HIGH' || r === 'HIGH';
  }).length;

  // ── Handle section change ─────────────────────────────────────────────────
  const handleSectionChange = useCallback((section) => {
    setActiveSection(section);
    // Scroll the main content to top when switching
    const mainEl = document.getElementById('main-content');
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="flex h-screen bg-bg-base overflow-hidden">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        isDark={isDark}
        setIsDark={setIsDark}
        lastSync={lastSync}
        alertCount={alertCount}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <main
        id="main-content"
        className="flex-1 overflow-y-auto overflow-x-hidden pt-14 lg:pt-0"
      >
        <div className="p-4 sm:p-5 md:p-6 lg:p-7 max-w-[1440px] mx-auto w-full">

          {/* ──────────────────── OVERVIEW SECTION ──────────────────── */}
          {activeSection === 'overview' && (
            <div className="animate-fadeIn">
              <SectionHeader
                title="Dashboard Overview"
                subtitle="Real-time heatwave monitoring at a glance"
              >
                <div className="flex items-center gap-2 text-xs font-mono text-text-muted bg-bg-element px-3 py-1.5 rounded-lg border border-border-subtle">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                  </span>
                  SYNC: {lastSync.toLocaleTimeString()}
                </div>
              </SectionHeader>

              {/* Top row: Conditions + Alerts side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5 mb-4 sm:mb-5">
                <div className="lg:col-span-3">
                  <CurrentCondition
                    weatherData={weatherData}
                    device={selectedDevice || devices[0]}
                  />
                </div>
                <div className="lg:col-span-2">
                  <AlertPanel locations={devices} />
                </div>
              </div>

              {/* Heat Map */}
              <div className="h-[400px] sm:h-[480px] lg:h-[520px] mb-4 sm:mb-5">
                <HeatMap
                  isDark={isDark}
                  devices={devices}
                  selectedDevice={selectedDevice}
                  onSelectDevice={handleSelectDevice}
                  onDeselectDevice={handleDeselectDevice}
                  loading={devicesLoading}
                  error={devicesError}
                />
              </div>

              {/* Charts */}
              <TempHumidityMonitor
                weatherData={weatherData}
                selectedDevice={selectedDevice}
                devices={devices}
                isDark={isDark}
              />
            </div>
          )}

          {/* ──────────────────── MAP SECTION ──────────────────── */}
          {activeSection === 'map' && (
            <div className="animate-fadeIn">
              <SectionHeader
                title="Live Heat Map"
                subtitle="Interactive map with real-time device telemetry"
              >
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="bg-bg-element px-2.5 py-1 rounded-md border border-border-subtle font-mono">
                    {devices.length} nodes
                  </span>
                </div>
              </SectionHeader>
              <div className="h-[calc(100vh-180px)] lg:h-[calc(100vh-140px)] min-h-[400px]">
                <HeatMap
                  isDark={isDark}
                  devices={devices}
                  selectedDevice={selectedDevice}
                  onSelectDevice={handleSelectDevice}
                  onDeselectDevice={handleDeselectDevice}
                  loading={devicesLoading}
                  error={devicesError}
                />
              </div>
            </div>
          )}

          {/* ──────────────────── MONITORING SECTION ──────────────────── */}
          {activeSection === 'monitoring' && (
            <div className="animate-fadeIn">
              <SectionHeader
                title="Monitoring Charts"
                subtitle="Temperature & humidity trends over time"
              />

              {/* Conditions summary at top */}
              <div className="mb-4 sm:mb-5">
                <CurrentCondition
                  weatherData={weatherData}
                  device={selectedDevice || devices[0]}
                />
              </div>

              {/* Charts */}
              <TempHumidityMonitor
                weatherData={weatherData}
                selectedDevice={selectedDevice}
                devices={devices}
                isDark={isDark}
              />
            </div>
          )}

          {/* ──────────────────── ALERTS SECTION ──────────────────── */}
          {activeSection === 'alerts' && (
            <div className="animate-fadeIn">
              <SectionHeader
                title="Heat Alerts"
                subtitle="Active warnings and risk notifications"
              >
                {alertCount > 0 && (
                  <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold px-3 py-1.5 rounded-lg">
                    {alertCount} Active {alertCount === 1 ? 'Alert' : 'Alerts'}
                  </span>
                )}
              </SectionHeader>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                <div className="lg:col-span-1">
                  <AlertPanel locations={devices} />
                </div>
                <div className="lg:col-span-1">
                  <CurrentCondition weatherData={weatherData} />
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default Dashboard;
