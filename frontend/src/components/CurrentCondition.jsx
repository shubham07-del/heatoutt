import React from 'react';
import { getRiskTailwindClass } from '../utils/riskUtils';
import { Thermometer, Droplets, Wind, AlertTriangle } from 'lucide-react';

const FALLBACK_WEATHER = {
  temperature: 25.8,
  apparentTemperature: 31,
  humidity: 95,
  windSpeed: 9.3,
};

const CurrentCondition = ({ weatherData, device }) => {
  // Use real data or fallback so we never get stuck on loading
  const raw = weatherData || FALLBACK_WEATHER;

  const data = {
    temperature: device?.temperature ?? raw.temperature,
    feelsLike: raw.apparentTemperature,
    humidity: device?.humidity ?? raw.humidity,
    wind: raw.windSpeed,
    predictedTemp: device?.predictedTemperature,
    predictionMinutes: device?.predictionMinutes ?? 5,
    risk: device?.risk ?? (raw.temperature > 38 ? 'VERY_HIGH'
        : raw.temperature > 35 ? 'HIGH'
        : raw.temperature > 32 ? 'MODERATE'
        : 'LOW')
  };

  const risk = data?.risk || 'MODERATE';
  const riskDisplay = device?.riskLabel ?? risk.replace('_', ' ');

  return (
    <div className="bg-bg-surface p-8 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-border-subtle flex flex-col gap-8 relative overflow-hidden transition-colors">
      
      {/* Subtle glow effect behind */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex justify-between items-start relative z-10">
        <div>
          <h2 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] mb-1">Live Sensor Reading</h2>
          <div className="text-sm font-medium text-text-muted">
            {device ? `${device.locationName} · ${device.deviceId}` : 'City-wide aggregate'}
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded border shadow-sm ${getRiskTailwindClass(risk)}`}>
          <AlertTriangle className="w-4 h-4" />
          <span className="font-bold text-xs tracking-wider">{riskDisplay} RISK</span>
        </div>
      </div>

      <div className="flex items-baseline gap-2 relative z-10">
        <span className="text-7xl font-bold tracking-tighter text-text-main drop-shadow-sm">{data?.temperature}</span>
        <span className="text-3xl font-medium text-text-muted">°C</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 relative z-10">
        <div className="bg-bg-element p-3 sm:p-4 rounded-lg border border-border-subtle flex sm:flex-col justify-between sm:justify-start items-center sm:items-start transition-colors">
          <div className="flex items-center gap-2 sm:mb-2">
            <Thermometer className="w-4 h-4 text-text-muted" />
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Feels Like</div>
          </div>
          <div className="text-lg sm:text-xl font-semibold text-text-main">{data?.feelsLike}°C</div>
        </div>

        <div className="bg-bg-element p-3 sm:p-4 rounded-lg border border-border-subtle flex sm:flex-col justify-between sm:justify-start items-center sm:items-start transition-colors">
          <div className="flex items-center gap-2 sm:mb-2">
            <Droplets className="w-4 h-4 text-blue-500/70" />
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Humidity</div>
          </div>
          <div className="text-lg sm:text-xl font-semibold text-text-main">{data?.humidity}%</div>
        </div>

        <div className="bg-bg-element p-3 sm:p-4 rounded-lg border border-border-subtle flex sm:flex-col justify-between sm:justify-start items-center sm:items-start transition-colors">
          <div className="flex items-center gap-2 sm:mb-2">
            <Wind className="w-4 h-4 text-teal-500/70" />
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Wind</div>
          </div>
          <div className="text-lg sm:text-xl font-semibold text-text-main">{data?.wind} <span className="text-sm font-medium text-text-muted">km/h</span></div>
        </div>
      </div>

      <div className="mt-2 bg-bg-element rounded-lg border border-orange-500/30 p-5 relative overflow-hidden flex items-center justify-between z-10 transition-colors">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
        <div>
          <div className="text-[11px] font-bold text-orange-500 uppercase tracking-widest mb-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
            {data.predictionMinutes} Min Outlook
          </div>
          <div className="text-sm text-text-muted">
            {device?.predictedRisk
              ? `${device.predictedRisk.replace('_', ' ')} predicted risk`
              : 'Model prediction'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-text-main">
            {data.predictedTemp != null ? `${data.predictedTemp}°C` : '—'}
          </div>
          {device?.predictedRisk && (
            <div className="text-xs text-orange-500 font-medium">
              {device.predictedRisk.replace('_', ' ')} risk
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CurrentCondition;
