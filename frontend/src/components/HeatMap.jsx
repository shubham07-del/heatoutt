import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getRiskColor, getRiskTailwindClass } from '../utils/riskUtils';
import {
  ArrowLeft,
  Thermometer,
  Droplets,
  TrendingUp,
  MapPin,
  Cpu,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  Layers,
  ChevronRight,
  ZoomIn,
} from 'lucide-react';

// ─── Fix Leaflet default icon path in Webpack/Vite builds ───────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ─── Risk-based custom DivIcon ────────────────────────────────────────────────
const createCustomIcon = (risk, isSelected = false) => {
  const color = getRiskColor(risk);
  const isAlert =
    risk === 'HIGH' || risk === 'VERY_HIGH' || risk === 'VERY HIGH';

  const ringHtml = isAlert
    ? `<div style="
        position:absolute; inset:-8px; border-radius:50%;
        background:${color}; opacity:0.35;
        animation:heatpulse 2s ease-out infinite;
      "></div>`
    : '';

  const selectedRing = isSelected
    ? `<div style="
        position:absolute; inset:-6px; border-radius:50%;
        border:2px solid white; box-shadow:0 0 0 3px ${color};
        animation:pingRing 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>`
    : '';

  const size = isSelected ? 24 : 18;
  const anchor = isSelected ? 12 : 9;

  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
      <div style="position:relative; display:flex; align-items:center; justify-content:center; width:${size}px; height:${size}px;">
        ${ringHtml}
        ${selectedRing}
        <div style="
          position:relative; width:${size}px; height:${size}px; border-radius:50%;
          background:${color}; border:2px solid white;
          box-shadow:0 3px 10px rgba(0,0,0,0.5); z-index:10;
        "></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
    popupAnchor: [0, -(anchor + 4)],
  });
};

// ─── MapController — drives fitBounds and flyTo zoom in animation ─────────────
const MapController = ({ devices, selectedDevice }) => {
  const map = useMap();
  const prevSelectedRef = useRef(null);

  useEffect(() => {
    const hasCoordinates = (device) =>
      Number.isFinite(device?.latitude) && Number.isFinite(device?.longitude);
    const locatedDevices = devices.filter(hasCoordinates);

    if (selectedDevice && hasCoordinates(selectedDevice)) {
      // Smooth flyTo zoom in animation to the selected node
      map.flyTo(
        [selectedDevice.latitude, selectedDevice.longitude],
        16,
        { animate: true, duration: 1.4, easeLinearity: 0.25 }
      );
    } else {
      // Fit all devices when no device is selected
      if (locatedDevices.length === 0) return;
      if (locatedDevices.length === 1) {
        map.setView([locatedDevices[0].latitude, locatedDevices[0].longitude], 15, { animate: true });
        return;
      }
      const bounds = L.latLngBounds(
        locatedDevices.map((d) => [d.latitude, d.longitude])
      );
      map.fitBounds(bounds, { padding: [70, 70], animate: true, duration: 1.2 });
    }
    prevSelectedRef.current = selectedDevice;
  }, [selectedDevice, devices, map]);

  return null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatLastSeen = (isoString) => {
  if (!isoString) return 'Never';
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

const StatRow = ({ icon: Icon, label, value, valueClass = '' }) => (
  <div className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
    <div className="flex items-center gap-2 text-xs text-text-muted">
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{label}</span>
    </div>
    <span className={`text-xs font-semibold text-text-main ${valueClass}`}>
      {value ?? '—'}
    </span>
  </div>
);

// ─── Node Card Component ──────────────────────────────────────────────────────
const NodeCard = ({ device, isSelected, onClick }) => {
  const riskColor = getRiskColor(device.risk);

  return (
    <div
      onClick={onClick}
      className={`group relative flex-shrink-0 cursor-pointer rounded-xl p-3.5 transition-all duration-300 border backdrop-blur-md select-none ${
        isSelected
          ? 'bg-bg-surface border-orange-500 ring-2 ring-orange-500/40 shadow-xl scale-[1.02]'
          : 'bg-bg-surface/90 hover:bg-bg-surface border-border-subtle hover:border-orange-500/50 shadow-md hover:shadow-lg hover:scale-[1.01]'
      }`}
      style={{ width: '220px' }}
    >
      {/* Top Header: deviceId tag & online status indicator */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[11px] font-bold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded tracking-wide">
          [{device.deviceId}]
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              device.status === 'ONLINE' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className="text-[10px] font-semibold text-text-muted">
            {device.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Node Location Name */}
      <h4 className="text-sm font-bold text-text-main group-hover:text-orange-500 transition-colors truncate mb-2">
        {device.locationName}
      </h4>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3 bg-bg-element/60 p-2 rounded-lg border border-border-subtle/50">
        <div>
          <div className="text-[9px] text-text-muted uppercase font-bold tracking-wider">Temp</div>
          <div className="text-sm font-bold text-text-main flex items-center gap-1">
            <Thermometer className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            {device.temperature != null ? `${device.temperature}°C` : '—'}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-text-muted uppercase font-bold tracking-wider">Humidity</div>
          <div className="text-sm font-bold text-text-main flex items-center gap-1">
            <Droplets className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            {device.humidity != null ? `${device.humidity}%` : '—'}
          </div>
        </div>
      </div>

      {/* Footer: Risk Badge & Zoom indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-bold tracking-wider ${getRiskTailwindClass(
              device.risk
            )}`}
          >
            {device.riskLabel ?? (device.risk ?? 'UNKNOWN').replace('_', ' ')}
          </span>
          {device.riskClass != null && (
            <span className="text-[9px] font-mono text-text-muted">
              CLASS {device.riskClass}
            </span>
          )}
        </div>
        <span className="text-[10px] font-semibold text-orange-500 flex items-center gap-0.5 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
          <ZoomIn className="w-3 h-3" /> Zoom Map
        </span>
      </div>
    </div>
  );
};

// ─── Selected Device Detail Panel (Slide-in) ──────────────────────────────────
const DeviceDetailPanel = ({ device, onBack }) => {
  const riskLabel = device.riskLabel ?? (device.risk ?? 'UNKNOWN').replace('_', ' ');

  return (
    <div
      className="absolute top-4 right-4 z-[500] w-80 bg-bg-surface/95 backdrop-blur-md border border-border-subtle rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all animate-in fade-in slide-in-from-right-4 duration-300"
      style={{ maxHeight: 'calc(100% - 2rem)' }}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-bg-element border-b border-border-subtle flex items-center gap-2">
        <button
          onClick={onBack}
          aria-label="Back to all nodes"
          className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-bg-surface border border-transparent hover:border-border-subtle transition-all shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] font-bold text-orange-500 bg-orange-500/10 px-1.5 py-0.2 rounded border border-orange-500/20">
              [{device.deviceId}]
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                device.status === 'ONLINE' ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
          </div>
          <p className="text-sm font-bold text-text-main truncate leading-tight mt-0.5">
            {device.locationName}
          </p>
        </div>
      </div>

      {/* Risk Alert Header */}
      <div className="px-4 py-2.5 border-b border-border-subtle bg-bg-element/40">
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold tracking-wider ${getRiskTailwindClass(
            device.risk
          )}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {riskLabel} HEAT RISK
        </div>
      </div>

      {/* Sensor Readings & Specs */}
      <div className="px-4 py-2 overflow-y-auto flex-1 custom-scrollbar">
        <div className="py-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            Live Telemetry
          </span>
        </div>

        <StatRow
          icon={Thermometer}
          label="Temperature"
          value={device.temperature != null ? `${device.temperature}°C` : null}
          valueClass="text-base font-extrabold text-orange-500"
        />
        <StatRow
          icon={Droplets}
          label="Humidity"
          value={device.humidity != null ? `${device.humidity}%` : null}
        />
        <StatRow
          icon={TrendingUp}
          label={`Predicted (${device.predictionMinutes ?? 5} min)`}
          value={
            device.predictedTemperature != null
              ? `${device.predictedTemperature}°C`
              : null
          }
          valueClass="text-amber-500 font-bold"
        />
        {device.riskClass != null && (
          <StatRow icon={AlertTriangle} label="Risk class" value={device.riskClass} />
        )}
        {device.predictedRisk && (
          <StatRow
            icon={AlertTriangle}
            label="Predicted risk"
            value={device.predictedRisk.replace('_', ' ')}
            valueClass="text-amber-500 font-bold"
          />
        )}

        <div className="py-2 mt-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            Node Details
          </span>
        </div>

        <StatRow icon={Cpu} label="Device ID" value={device.deviceId} />
        <StatRow
          icon={MapPin}
          label="Latitude"
          value={device.latitude?.toFixed(4)}
        />
        <StatRow
          icon={MapPin}
          label="Longitude"
          value={device.longitude?.toFixed(4)}
        />
        {Number.isFinite(device.latitude) && Number.isFinite(device.longitude) && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${device.latitude},${device.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="my-2 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 hover:text-orange-600"
          >
            <MapPin className="w-3.5 h-3.5" />
            {device.gps ? 'Navigate to live GPS location' : 'Navigate to registered location'}
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        )}

        <div className="flex items-center justify-between py-2 border-b border-border-subtle">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            {device.status === 'ONLINE' ? (
              <Wifi className="w-3.5 h-3.5 shrink-0 text-green-500" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 shrink-0 text-red-500" />
            )}
            <span>Connection</span>
          </div>
          <span
            className={`text-xs font-semibold ${
              device.status === 'ONLINE' ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {device.status ?? 'UNKNOWN'}
          </span>
        </div>

        <StatRow
          icon={Clock}
          label="Last Update"
          value={formatLastSeen(device.lastSeen)}
        />
      </div>

      {/* Reset button footer */}
      <div className="px-4 py-3 border-t border-border-subtle bg-bg-element/50">
        <button
          onClick={onBack}
          className="w-full py-2 px-4 rounded-xl bg-bg-surface border border-border-subtle text-xs font-bold text-text-main hover:border-orange-500/50 hover:text-orange-500 shadow-sm transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to All Location Cards
        </button>
      </div>
    </div>
  );
};

// ─── Map Legend ───────────────────────────────────────────────────────────────
const MapLegend = () => (
  <div className="absolute bottom-4 left-4 z-[400] bg-bg-surface/90 backdrop-blur-md border border-border-subtle p-3 rounded-xl shadow-lg transition-colors">
    <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 flex items-center gap-1.5">
      <Layers className="w-3 h-3 text-orange-500" /> Heat Risk Index
    </h3>
    <div className="flex flex-col gap-1.5">
      {['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH'].map((risk) => (
        <div key={risk} className="flex items-center gap-2 text-xs text-text-main font-medium">
          <span
            className="w-3 h-3 rounded-full border border-black/10 dark:border-white/20 shadow-inner shrink-0"
            style={{ backgroundColor: getRiskColor(risk) }}
          />
          <span>{risk.replace('_', ' ')}</span>
        </div>
      ))}
    </div>
  </div>
);

// ─── Main HeatMap Component ──────────────────────────────────────────────────
const HeatMap = ({
  isDark,
  devices = [],
  selectedDevice,
  onSelectDevice,
  onDeselectDevice,
  loading = false,
  error = null,
}) => {
  const initialCenter = [20.296, 85.824];
  const initialZoom = 12;

  // ── Loading State ──
  if (loading) {
    return (
      <div className="bg-bg-surface border border-border-subtle rounded-2xl shadow-sm flex flex-col h-full overflow-hidden items-center justify-center gap-3 min-h-[450px]">
        <div
          className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"
          role="status"
          aria-label="Loading map"
        />
        <p className="text-sm font-medium text-text-muted">Loading monitoring nodes...</p>
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="bg-bg-surface border border-border-subtle rounded-2xl shadow-sm flex flex-col h-full overflow-hidden items-center justify-center gap-3 min-h-[450px] p-6">
        <AlertTriangle className="w-8 h-8 text-red-500" />
        <p className="text-sm text-text-main font-semibold">Map unavailable</p>
        <p className="text-xs text-text-muted text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-2xl shadow-md flex flex-col h-full overflow-hidden relative transition-colors">
      
      {/* ── TOP SECTION: Node Cards Overlay Header ── */}
      <div className="absolute top-4 left-4 right-4 z-[450] pointer-events-none">
        <div className="flex flex-col gap-2">
          {/* Section title & count */}
          <div className="flex items-center justify-between bg-bg-surface/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-border-subtle shadow-md pointer-events-auto max-w-fit">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-bold text-text-main">
                Monitoring Nodes Card View
              </span>
              <span className="text-[10px] font-extrabold font-mono bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full border border-orange-500/20">
                {devices.length} Nodes
              </span>
            </div>
          </div>

          {/* Scrollable Node Cards Container */}
          <div className="flex gap-3 overflow-x-auto pb-2 pt-1 pointer-events-auto custom-scrollbar no-scrollbar">
            {devices.map((device) => (
              <NodeCard
                key={device.deviceId}
                device={device}
                isSelected={selectedDevice?.deviceId === device.deviceId}
                onClick={() => onSelectDevice(device)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Legend — floating at bottom left */}
      <MapLegend />

      {/* Selected device detail panel overlay */}
      {selectedDevice && (
        <DeviceDetailPanel device={selectedDevice} onBack={onDeselectDevice} />
      )}

      {/* Empty state overlay */}
      {devices.length === 0 && (
        <div className="absolute inset-0 z-[400] flex flex-col items-center justify-center gap-3 bg-bg-surface/80 backdrop-blur-sm pointer-events-none">
          <MapPin className="w-10 h-10 text-text-muted opacity-40" />
          <p className="text-sm font-medium text-text-muted">
            No monitoring nodes registered
          </p>
          <p className="text-xs text-text-muted opacity-60">
            Deploy a Raspberry Pi to start monitoring
          </p>
        </div>
      )}

      {/* Selected location pill indicator at bottom center */}
      {selectedDevice && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[400] bg-bg-surface/95 backdrop-blur border border-orange-500/50 px-4 py-2 rounded-full text-xs font-bold text-text-main shadow-xl flex items-center gap-2 pointer-events-none animate-in fade-in zoom-in-95">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
          Zoomed to: <span className="text-orange-500">{selectedDevice.locationName}</span> [{selectedDevice.deviceId}]
        </div>
      )}

      {/* ── Leaflet Map Container ── */}
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        style={{ flex: 1, height: '100%', width: '100%', minHeight: '100%', zIndex: 10 }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Declarative map controller — handles fitBounds & smooth flyTo zoom-in */}
        <MapController devices={devices} selectedDevice={selectedDevice} />

        {/* Render Map Markers */}
        {devices.filter((device) =>
          Number.isFinite(device.latitude) && Number.isFinite(device.longitude)
        ).map((device) => {
          const isSelected = selectedDevice?.deviceId === device.deviceId;
          return (
            <Marker
              key={device.deviceId}
              position={[device.latitude, device.longitude]}
              icon={createCustomIcon(device.risk, isSelected)}
              eventHandlers={{
                click: () => onSelectDevice(device),
              }}
              title={`[${device.deviceId}] ${device.locationName} — ${(device.risk ?? 'UNKNOWN').replace('_', ' ')} risk`}
            >
              <Popup className="custom-popup" closeButton={false}>
                <div className="bg-bg-surface min-w-[200px] text-text-main p-1">
                  <div className="font-mono text-[10px] font-bold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded w-max mb-1 border border-orange-500/20">
                    [{device.deviceId}]
                  </div>
                  <div className="font-bold text-text-main mb-2 text-sm leading-tight">
                    {device.locationName}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2 bg-bg-element p-1.5 rounded">
                    <div>
                      <div className="text-[9px] text-text-muted uppercase font-bold">Temp</div>
                      <div className="text-sm font-extrabold text-orange-500">
                        {device.temperature != null ? `${device.temperature}°C` : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-text-muted uppercase font-bold">Humidity</div>
                      <div className="text-sm font-bold text-text-muted">
                        {device.humidity != null ? `${device.humidity}%` : '—'}
                      </div>
                    </div>
                  </div>

                  <div
                    className="text-[10px] font-bold px-2 py-1 rounded border text-center mb-2"
                    style={{
                      color: getRiskColor(device.risk),
                      borderColor: getRiskColor(device.risk) + '40',
                      backgroundColor: getRiskColor(device.risk) + '15',
                    }}
                  >
                    {device.riskLabel ?? (device.risk ?? 'UNKNOWN').replace('_', ' ')} RISK
                  </div>

                  <button
                    onClick={() => onSelectDevice(device)}
                    className="w-full text-[10px] font-bold py-1.5 px-3 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-all flex items-center justify-center gap-1 shadow"
                  >
                    <ZoomIn className="w-3 h-3" /> Zoom Map & Details
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Custom styles & animations */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.4);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.7);
        }
        .leaflet-popup-content-wrapper, .leaflet-popup-tip {
          background-color: var(--bg-surface) !important;
          color: var(--text-main) !important;
          border: 1px solid var(--border-subtle) !important;
          box-shadow: 0 4px 24px rgba(0,0,0,0.2) !important;
          border-radius: 12px !important;
        }
        .leaflet-container a.leaflet-popup-close-button {
          color: var(--text-muted) !important;
        }
        .leaflet-popup-content {
          margin: 10px !important;
        }
        html.dark .leaflet-tile-pane {
          filter: invert(100%) hue-rotate(180deg) brightness(85%) contrast(90%);
        }
        .custom-leaflet-icon {
          background: transparent !important;
          border: none !important;
        }
        @keyframes heatpulse {
          0%   { transform: scale(1);   opacity: 0.35; }
          50%  { transform: scale(1.6); opacity: 0.15; }
          100% { transform: scale(2);   opacity: 0; }
        }
        @keyframes pingRing {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default HeatMap;
