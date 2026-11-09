import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { NormalizedIndicatorPoint } from '../../types';

export function TrendChart({
  points,
  name,
  color = '#38bdf8',
  extraLines = [],
}: {
  points: NormalizedIndicatorPoint[];
  name: string;
  color?: string;
  extraLines?: { key: string; color: string; name: string }[];
}) {
  const data = points.map((p) => ({ period: p.period, [name]: p.value, ...p }));
  if (!data.length) {
    return <div className="flex h-48 items-center justify-center text-sm text-slate-500">시계열 없음</div>;
  }
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 10 }} minTickGap={24} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} width={48} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }}
            labelStyle={{ color: '#cbd5e1' }}
          />
          <Line type="monotone" dataKey={name} stroke={color} dot={false} strokeWidth={2} connectNulls={false} />
          {extraLines.map((l) => (
            <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color} dot={false} strokeWidth={1.5} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
