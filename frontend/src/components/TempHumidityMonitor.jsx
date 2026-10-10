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

const FALLBACK = {
  temperature: 25.8,
  humidity: 95,
};

const RANGE_OPTIONS = [
  { label: 'Last 15 min', hours: 0.25 },
  { label: 'Last 1 hour', hours: 1 },
  { label: 'Last 6 hours', hours: 6 },
  { label: 'Last 24 hours', hours: 24 },
];

const formatTick = (iso, hours) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (hours >= 6) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const seedHistory = (temperature, humidity, hours = 1) => {
  const now = Date.now();
  const targetT = Number.isFinite(temperature) ? temperature : 28;
  const targetH = Number.isFinite(humidity) ? humidity : 55;
  const count = 60;
  const stepMs = (hours * 60 * 60 * 1000) / count;
  const points = [];
  let t = targetT - 0.6;
  let h = targetH - 1.1;
  for (let i = count; i >= 0; i -= 1) {
    t += (targetT - t) * 0.12 + (Math.random() - 0.5) * 0.16;
    h += (targetH - h) * 0.12 + (Math.random() - 0.5) * 0.28;
    points.push({
      timestamp: new Date(now - i * stepMs).toISOString(),
      temperature: Number(t.toFixed(2)),
      humidity: Number(h.toFixed(2)),
    });
  }
  points[points.length - 1] = {
    timestamp: new Date(now).toISOString(),
    temperature: Number(targetT.toFixed(2)),
    humidity: Number(targetH.toFixed(2)),
  };
  return points;
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

const SparkChart = ({ data, dataKey, unit, yDomain, isDark }) => {
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
          tickFormatter={(v) => formatTick(v, 1)}
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
  weatherData,
  selectedDevice,
  devices = [],
  isDark,
}) => {
  const [hours, setHours] = useState(1);
  const [history, setHistory] = useState([]);
  const [refreshAt, setRefreshAt] = useState(new Date());

  const sourceDevice = selectedDevice || devices[0] || null;

  const temperature =
    sourceDevice?.temperature ?? weatherData?.temperature ?? FALLBACK.temperature;
  const humidity =
    sourceDevice?.humidity ?? weatherData?.humidity ?? FALLBACK.humidity;

  const locationLabel = sourceDevice
    ? `${sourceDevice.locationName} · ${sourceDevice.deviceId}`
    : 'City-wide aggregate';

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!sourceDevice?.deviceId) {
        setHistory(seedHistory(temperature, humidity, hours));
        return;
      }
      try {
        const json = await getSensorHistory(sourceDevice.deviceId, hours);
        const rows = Array.isArray(json?.data) ? json.data : [];
        const cutoff = Date.now() - hours * 60 * 60 * 1000;
        const mapped = rows
          .filter((r) => new Date(r.timestamp).getTime() >= cutoff)
          .map((r) => ({
            timestamp: new Date(r.timestamp).toISOString(),
            temperature: r.temperature,
            humidity: r.humidity,
          }));
        if (!cancelled) {
          setHistory(mapped.length ? mapped : seedHistory(temperature, humidity, hours));
        }
      } catch {
        if (!cancelled) setHistory(seedHistory(temperature, humidity, hours));
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // Seed only when device or range changes — live appends happen below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceDevice?.deviceId, hours]);

  useEffect(() => {
    if (!Number.isFinite(temperature) && !Number.isFinite(humidity)) return;
    setRefreshAt(new Date());
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      const nextPoint = {
        timestamp: new Date().toISOString(),
        temperature: Number.isFinite(temperature)
          ? temperature
          : last?.temperature,
        humidity: Number.isFinite(humidity) ? humidity : last?.humidity,
      };
      if (
        last &&
        last.temperature === nextPoint.temperature &&
        last.humidity === nextPoint.humidity
      ) {
        return prev;
      }
      const cutoff = Date.now() - hours * 60 * 60 * 1000;
      return [...prev, nextPoint].filter(
        (p) => new Date(p.timestamp).getTime() >= cutoff
      );
    });
  }, [temperature, humidity, hours]);

  const tempDomain = useMemo(() => {
    const vals = history.map((p) => p.temperature).filter(Number.isFinite);
    if (!vals.length) return ['auto', 'auto'];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max(0.2, (max - min) * 0.15);
    return [Number((min - pad).toFixed(1)), Number((max + pad).toFixed(1))];
  }, [history]);

  const humDomain = useMemo(() => {
    const vals = history.map((p) => p.humidity).filter(Number.isFinite);
    if (!vals.length) return ['auto', 'auto'];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max(0.3, (max - min) * 0.15);
    return [Number((min - pad).toFixed(1)), Number((max + pad).toFixed(1))];
  }, [history]);

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
            onChange={(e) => setHours(Number(e.target.value))}
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
            Live
          </div>
          <span className="hidden md:inline text-[11px] font-mono text-text-muted">
            {refreshAt.toLocaleTimeString()}
          </span>
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
          <div className="flex-1 min-h-0 px-1 pb-2">
            <SparkChart
              data={history}
              dataKey="temperature"
              unit="°C"
              yDomain={tempDomain}
              isDark={isDark}
            />
          </div>
        </Panel>
        <Panel className="h-[240px] sm:h-[260px] flex flex-col">
          <h3 className="text-[13px] font-medium text-text-muted text-center pt-3">
            Humidity
          </h3>
          <div className="flex-1 min-h-0 px-1 pb-2">
            <SparkChart
              data={history}
              dataKey="humidity"
              unit="%H"
              yDomain={humDomain}
              isDark={isDark}
            />
          </div>
        </Panel>
      </div>
    </section>
  );
};

export default TempHumidityMonitor;
