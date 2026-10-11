import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { RefreshCw } from 'lucide-react';
import SemiGauge from './SemiGauge';
import { getSensorHistory } from '../services/api';

const RANGE_OPTIONS = [
  { label: 'All records', hours: 'all' },
  { label: 'Last 15 min', hours: 0.25 },
  { label: 'Last 1 hour', hours: 1 },
  { label: 'Last 6 hours', hours: 6 },
  { label: 'Last 24 hours', hours: 24 },
];

const formatTick = (iso, hours) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (hours === 'all') {
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (hours >= 6) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const ChartTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-md px-2.5 py-1.5 text-xs shadow-lg">
      <div className="text-text-muted mb-0.5">
        {new Date(label).toLocaleTimeString()}
      </div>
      <div className="font-semibold text-[#73bf69]">
        {Number(payload[0].value).toFixed(1)} {unit}
      </div>
    </div>
  );
};

const SparkChart = ({ data, dataKey, unit, yDomain, isDark, hours }) => {
  const stroke = '#73bf69';
  const grid = isDark ? '#2d2f36' : '#cbd5e1';
  const tick = isDark ? '#9ca3af' : '#64748b';

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={grid} strokeDasharray="0" vertical={true} horizontal={true} />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(v) => formatTick(v, hours)}
          tick={{ fill: tick, fontSize: 11 }}
          axisLine={{ stroke: grid }}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          domain={yDomain}
          tick={{ fill: tick, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={52}
          tickFormatter={(v) => `${Number(v).toFixed(1)}${unit}`}
        />
        <Tooltip content={<ChartTooltip unit={unit} />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={stroke}
          strokeWidth={1.6}
          fill={`url(#fill-${dataKey})`}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const Panel = ({ children, className = '' }) => (
  <div
    className={`bg-bg-element/50 border border-border-subtle rounded-md overflow-hidden ${className}`}
  >
    {children}
  </div>
);

const TempHumidityMonitor = ({
  selectedDevice,
  devices = [],
  isDark,
}) => {
  const [hours, setHours] = useState('all');
  const [history, setHistory] = useState([]);
  const [historyLoadedKey, setHistoryLoadedKey] = useState(null);
  const [historyError, setHistoryError] = useState(null);

  const sourceDevice = selectedDevice || devices[0] || null;
  const historyKey = `${sourceDevice?.deviceId ?? 'none'}:${hours}`;
  const temperature = sourceDevice?.temperature ?? null;
  const humidity = sourceDevice?.humidity ?? null;

  const locationLabel = sourceDevice
    ? `${sourceDevice.locationName} · ${sourceDevice.deviceId}`
    : 'City-wide aggregate';
  const currentHistoryError =
    historyError?.key === historyKey ? historyError.message : null;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!sourceDevice?.deviceId) {
        return;
      }
      try {
        const json = await getSensorHistory(sourceDevice.deviceId, hours);
        const rows = Array.isArray(json?.data) ? json.data : [];
        const mapped = rows
          .map((r) => ({
            id: r._id,
            timestamp: new Date(r.timestamp).toISOString(),
            temperature: r.temperature,
            humidity: r.humidity,
            deviceId: sourceDevice.deviceId,
          }));
        if (!cancelled) {
          setHistory(mapped);
          setHistoryError(null);
          setHistoryLoadedKey(historyKey);
        }
      } catch (error) {
        if (!cancelled) {
          setHistory([]);
          setHistoryError({
            key: historyKey,
            message: error.message || 'Could not load saved sensor readings.',
          });
          setHistoryLoadedKey(historyKey);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [sourceDevice?.deviceId, hours, historyKey]);

  useEffect(() => {
    if (
      !sourceDevice?.deviceId ||
      historyLoadedKey !== historyKey
    ) return undefined;

    const refreshHistory = async () => {
      const latestTimestamp = history[history.length - 1]?.timestamp;
      try {
        const json = await getSensorHistory(
          sourceDevice.deviceId,
          hours,
          latestTimestamp
        );
        const rows = Array.isArray(json?.data) ? json.data : [];
        setHistoryError((previous) =>
          previous?.key === historyKey ? null : previous
        );
        if (rows.length === 0) return;

        const newPoints = rows.map((row) => ({
          id: row._id,
          timestamp: new Date(row.timestamp).toISOString(),
          temperature: row.temperature,
          humidity: row.humidity,
          deviceId: sourceDevice.deviceId,
        }));
        const cutoff =
          hours === 'all'
            ? null
            : Date.now() - Number(hours) * 60 * 60 * 1000;

        setHistory((previous) => {
          const pointsById = new Map(previous.map((point) => [point.id, point]));
          let changed = false;
          newPoints.forEach((point) => {
            const existing = pointsById.get(point.id);
            if (
              !existing ||
              existing.timestamp !== point.timestamp ||
              existing.temperature !== point.temperature ||
              existing.humidity !== point.humidity
            ) {
              changed = true;
              pointsById.set(point.id, point);
            }
          });
          if (!changed) return previous;

          return [...pointsById.values()]
            .filter(
              (point) =>
                cutoff === null || new Date(point.timestamp).getTime() >= cutoff
            )
            .sort(
              (a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
        });
      } catch (error) {
        console.error('Failed to refresh saved sensor readings:', error);
      }
    };

    const interval = setInterval(refreshHistory, 30000);
    return () => clearInterval(interval);
  }, [
    currentHistoryError,
    history,
    historyKey,
    historyLoadedKey,
    hours,
    sourceDevice?.deviceId,
  ]);

  const visibleHistory = useMemo(
    () => (historyLoadedKey === historyKey ? history : []),
    [history, historyKey, historyLoadedKey]
  );
  const historyLoading = Boolean(sourceDevice?.deviceId) && historyLoadedKey !== historyKey;

  const tempDomain = useMemo(() => {
    const vals = visibleHistory.map((p) => p.temperature).filter(Number.isFinite);
    if (!vals.length) return ['auto', 'auto'];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max(0.2, (max - min) * 0.15);
    return [Number((min - pad).toFixed(1)), Number((max + pad).toFixed(1))];
  }, [visibleHistory]);

  const humDomain = useMemo(() => {
    const vals = visibleHistory.map((p) => p.humidity).filter(Number.isFinite);
    if (!vals.length) return ['auto', 'auto'];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max(0.3, (max - min) * 0.15);
    return [Number((min - pad).toFixed(1)), Number((max + pad).toFixed(1))];
  }, [visibleHistory]);

  return (
    <section className="bg-bg-surface border border-border-subtle rounded-xl shadow-md overflow-hidden flex flex-col transition-colors">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-border-subtle bg-bg-element/40">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-orange-500 text-sm">▦</span>
          <h2 className="text-sm font-semibold text-text-main truncate">
            General / Temperature and Humidity
          </h2>
          <span className="hidden sm:inline text-[11px] text-text-muted truncate">
            {locationLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={hours}
            onChange={(e) =>
              setHours(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="bg-bg-base border border-border-subtle text-xs text-text-main rounded-md px-2 py-1.5 outline-none"
            aria-label="Time range"
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.hours} value={opt.hours}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted px-2 py-1 rounded-md border border-border-subtle">
            <RefreshCw className="w-3 h-3" />
            {visibleHistory.length} records
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
        <Panel>
          <SemiGauge
            title="Current Temperature"
            value={temperature}
            min={0}
            max={50}
            unit="°C"
            isDark={isDark}
            thresholds={[
              { upTo: 0.64, color: '#73bf69' },
              { upTo: 0.82, color: '#fade2a' },
              { upTo: 1, color: '#f2495c' },
            ]}
          />
        </Panel>
        <Panel>
          <SemiGauge
            title="Current Humidity"
            value={humidity}
            min={0}
            max={100}
            unit="%H"
            isDark={isDark}
            thresholds={[
              { upTo: 0.55, color: '#73bf69' },
              { upTo: 0.75, color: '#fade2a' },
              { upTo: 1, color: '#f2495c' },
            ]}
          />
        </Panel>
        <Panel className="h-[240px] sm:h-[260px] flex flex-col">
          <h3 className="text-[13px] font-medium text-text-muted text-center pt-3">
            Temperature
          </h3>
          <div className="relative flex-1 min-h-0 px-1 pb-2">
            <SparkChart
              data={visibleHistory}
              dataKey="temperature"
              unit="°C"
              yDomain={tempDomain}
              isDark={isDark}
              hours={hours}
            />
            {visibleHistory.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-text-muted">
                {currentHistoryError ??
                  (historyLoading
                    ? 'Loading saved readings...'
                    : sourceDevice
                      ? 'No saved readings for this device.'
                      : 'No sensor device selected.')}
              </div>
            )}
          </div>
        </Panel>
        <Panel className="h-[240px] sm:h-[260px] flex flex-col">
          <h3 className="text-[13px] font-medium text-text-muted text-center pt-3">
            Humidity
          </h3>
          <div className="relative flex-1 min-h-0 px-1 pb-2">
            <SparkChart
              data={visibleHistory}
              dataKey="humidity"
              unit="%H"
              yDomain={humDomain}
              isDark={isDark}
              hours={hours}
            />
            {visibleHistory.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-text-muted">
                {currentHistoryError ??
                  (historyLoading
                    ? 'Loading saved readings...'
                    : sourceDevice
                      ? 'No saved readings for this device.'
                      : 'No sensor device selected.')}
              </div>
            )}
          </div>
        </Panel>
      </div>
    </section>
  );
};

export default TempHumidityMonitor;
