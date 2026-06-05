"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

export function TimelineChart({ data, title, type = 'area', unit = '' }: { data: any[]; title: string; type?: 'area' | 'bar', unit?: string }) {
  if (!data || data.length === 0) return null;

  const formatYAxis = (value: number) => {
    if (unit === '$M') return `$${value}M`;
    return value.toLocaleString();
  };

  const tooltipFormatter = (value: number) => {
    if (unit === '$M') return [`$${value}M`, 'Revenue / Funding'];
    return [value.toLocaleString(), unit || 'Value'];
  };

  return (
    <div className="rounded-xl bg-surface-2 p-4">
      <p className="text-xs font-medium text-brand-glow mb-4">{title}</p>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'area' ? (
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#666" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8} 
              />
              <YAxis 
                stroke="#666" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={formatYAxis} 
                width={50} 
                label={{ value: unit || 'Value', angle: -90, position: 'insideLeft', fill: '#666', fontSize: 10, offset: 0 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#e5e7eb' }}
                formatter={tooltipFormatter}
                labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
              />
              <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#666" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8} 
              />
              <YAxis 
                stroke="#666" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={formatYAxis} 
                width={50} 
                label={{ value: unit || 'Value', angle: -90, position: 'insideLeft', fill: '#666', fontSize: 10, offset: 0 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', borderRadius: '8px', fontSize: '12px' }}
                cursor={{ fill: '#2a2a2a' }}
                formatter={tooltipFormatter}
                labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
