import React from 'react';
import { 
  ComposedChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Scatter
} from 'recharts';

interface EloConfidenceChartProps {
  mean: number;
  lower: number;
  upper: number;
  label: string;
  color?: string;
}

export function EloConfidenceChart({ mean, lower, upper, label, color = "#10b981" }: EloConfidenceChartProps) {
  // We create a single data point for the chart
  const data = [
    {
      name: label,
      mean: mean,
      range: [lower, upper],
      lower: lower,
      upper: upper,
    }
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-black/10 p-3 shadow-xl">
          <p className="text-[10px] uppercase tracking-widest text-black/40 mb-1 font-bold">{label}</p>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between gap-4">
              <span className="text-xs text-black/60">Estimated Mean:</span>
              <span className="text-xs font-mono text-black font-bold">{mean}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-xs text-black/60">95% Confidence:</span>
              <span className="text-xs font-mono text-black/80">{lower} - {upper}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-48 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          layout="vertical"
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false} />
          <XAxis 
            type="number" 
            domain={[Math.max(0, lower - 200), upper + 200]} 
            stroke="rgba(0,0,0,0.2)" 
            tick={{ fill: 'rgba(0,0,0,0.4)', fontSize: 10, fontFamily: 'monospace' }}
          />
          <YAxis 
            dataKey="name" 
            type="category" 
            hide 
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
          
          {/* The Range Bar */}
          <Bar dataKey="range" barSize={4} fill={color} opacity={0.3} radius={[2, 2, 2, 2]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={color} />
            ))}
          </Bar>

          {/* The Mean Point */}
          <Scatter dataKey="mean" fill={color} shape="circle" />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex justify-between px-4 text-[10px] font-mono text-black/20 uppercase tracking-widest">
        <span>Lower: {lower}</span>
        <span className="text-black/60">Mean: {mean}</span>
        <span>Upper: {upper}</span>
      </div>
    </div>
  );
}
