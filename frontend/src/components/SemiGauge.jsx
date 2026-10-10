import React from 'react';

const polar = (cx, cy, r, angleDeg) => {
  const rad = ((angleDeg - 180) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
};

const arcPath = (cx, cy, r, startDeg, endDeg) => {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const sweep = Math.abs(endDeg - startDeg);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const SemiGauge = ({
  value,
  min = 0,
  max = 50,
  unit = '',
  title = '',
  isDark = true,
  thresholds = [
    { upTo: 0.7, color: '#73bf69' },
    { upTo: 0.85, color: '#fade2a' },
    { upTo: 1, color: '#f2495c' },
  ],
}) => {
  const cx = 120;
  const cy = 122;
  const r = 88;
  const start = 0;
  const end = 180;
  const unused = isDark ? '#22252b' : '#cfd6de';
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : null;
  const ratio = safeValue == null ? 0 : clamp((safeValue - min) / (max - min), 0, 1);
  const valueAngle = start + ratio * (end - start);
  const display = safeValue == null ? '—' : safeValue.toFixed(1);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[220px] px-4 pb-3 pt-2">
      {title ? (
        <h3 className="text-[13px] font-medium text-text-muted mb-1">{title}</h3>
      ) : null}
      <svg
        viewBox="0 0 240 155"
        className="w-full max-w-[360px] h-auto"
        role="img"
        aria-label={`${title || 'Gauge'}: ${display} ${unit}`}
      >
        {thresholds.map((t, i) => {
          const prev = i === 0 ? 0 : thresholds[i - 1].upTo;
          const a0 = start + prev * (end - start);
          const a1 = start + t.upTo * (end - start);
          return (
            <path
              key={t.color}
              d={arcPath(cx, cy, r, a0, a1)}
              fill="none"
              stroke={t.color}
              strokeWidth="18"
              strokeLinecap="butt"
            />
          );
        })}
        {ratio < 0.995 && (
          <path
            d={arcPath(cx, cy, r, Math.max(valueAngle, start + 0.4), end)}
            fill="none"
            stroke={unused}
            strokeWidth="18.5"
            strokeLinecap="butt"
          />
        )}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fill="#73bf69"
          fontSize="34"
          fontWeight="600"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {display}
        </text>
        <text
          x={cx}
          y={cy + 22}
          textAnchor="middle"
          fill="#73bf69"
          fontSize="16"
          fontWeight="500"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {unit}
        </text>
      </svg>
    </div>
  );
};

export default SemiGauge;
