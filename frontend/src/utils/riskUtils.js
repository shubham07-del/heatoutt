export const getRiskColor = (risk) => {
  switch (risk?.toUpperCase()) {
    case 'LOW':
      return '#22c55e'; // green-500
    case 'MODERATE':
      return '#fbbf24'; // amber-400
    case 'HIGH':
      return '#f97316'; // orange-500
    case 'VERY HIGH':
    case 'VERY_HIGH':
      return '#ef4444'; // red-500
    default:
      return '#9ca3af'; // gray-400
  }
};

export const getRiskTailwindClass = (risk) => {
  switch (risk?.toUpperCase()) {
    case 'LOW':
      return 'text-green-500 border-green-500/20 bg-green-500/10';
    case 'MODERATE':
      return 'text-amber-400 border-amber-400/20 bg-amber-400/10';
    case 'HIGH':
      return 'text-orange-500 border-orange-500/20 bg-orange-500/10';
    case 'VERY HIGH':
    case 'VERY_HIGH':
      return 'text-red-500 border-red-500/20 bg-red-500/10';
    default:
      return 'text-gray-400 border-gray-400/20 bg-gray-400/10';
  }
};
