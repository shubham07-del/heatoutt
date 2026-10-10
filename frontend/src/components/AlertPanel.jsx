import React from 'react';
import { getRiskTailwindClass } from '../utils/riskUtils';

const AlertPanel = ({ locations }) => {
  const alerts = locations?.filter(loc => {
    const r = loc.risk?.toUpperCase();
    return r === 'VERY_HIGH' || r === 'VERY HIGH' || r === 'HIGH';
  }) || [];

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm flex flex-col overflow-hidden h-full transition-colors">
      <div className="bg-bg-element px-5 py-4 border-b border-border-subtle flex items-center justify-between">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-widest">Active Heat Alerts</h3>
        <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-bold px-2 py-0.5 rounded">
          {alerts.length} ACTIVE
        </span>
      </div>
      
      <div className="flex flex-col divide-y divide-border-subtle overflow-auto max-h-[400px]">
        {alerts.length === 0 ? (
          <div className="p-6 text-center text-sm text-text-muted">
            No active heat alerts.
          </div>
        ) : (
          alerts.map(alert => (
            <div key={alert.deviceId} className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getRiskTailwindClass(alert.risk)}`}>
                  {alert.risk.replace('_', ' ')}
                </span>
                <span className="text-xs text-text-muted">Updated {alert.lastSeen}</span>
              </div>
              <div className="font-semibold text-text-main">{alert.locationName}</div>
              <div className="text-sm text-text-muted bg-bg-element p-3 border border-border-subtle rounded flex items-center justify-between">
                <span>{alert.temperature}°C</span>
                <span className="text-text-muted/60">&rarr;</span>
                <span className="text-orange-500 font-medium">{alert.predictedTemperature}°C predicted</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertPanel;
