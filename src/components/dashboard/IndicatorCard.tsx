import type { ReactNode } from 'react';
import type { IndicatorSummary } from '../../types';

function fmt(n: number | null | undefined, digits = 2) {
  if (n == null || Number.isNaN(n)) return 'N/A';
  return n.toLocaleString('ko-KR', { maximumFractionDigits: digits });
}

function changeClass(n: number | null) {
  if (n == null) return 'text-slate-500';
  if (n > 0) return 'text-rose-300';
  if (n < 0) return 'text-emerald-300';
  return 'text-slate-300';
}

export function IndicatorCard({ item, extra }: { item?: IndicatorSummary; extra?: ReactNode }) {
  if (!item) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slatepanel/60 p-4 text-sm text-slate-500">
        데이터 미수신
      </div>
    );
  }
  const latest = item.latest;
  return (
    <div className="rounded-xl border border-slate-800 bg-slatepanel p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">{item.displayName}</h3>
          <p className="text-[11px] text-slate-500">{item.providerLabel}</p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${
            item.status === 'ok'
              ? 'bg-emerald-500/15 text-emerald-300'
              : item.status === 'stale'
                ? 'bg-amber-500/15 text-amber-300'
                : 'bg-rose-500/15 text-rose-300'
          }`}
        >
          {item.status === 'ok' ? (item.frequency === 'monthly' ? '월간' : '일간') : item.status}
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">
        {latest ? fmt(latest.value) : 'N/A'}
        <span className="ml-1 text-xs font-normal text-slate-500">{item.unit}</span>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        {item.frequency === 'monthly' ? '기준월' : '기준일'} {latest?.period ?? 'N/A'}
        {latest?.isEstimated ? ' · 추정값' : ''}
      </p>
      <div className="mt-3 grid grid-cols-4 gap-1 text-[11px]">
        {(['m1', 'm3', 'm6', 'm12'] as const).map((k) => (
          <div key={k} className="rounded-md bg-night/80 px-1.5 py-1 text-center">
            <div className="text-slate-500">{k.toUpperCase()}</div>
            <div className={changeClass(item.changes[k])}>{item.changes[k] == null ? 'N/A' : `${item.changes[k]!.toFixed(1)}%`}</div>
          </div>
        ))}
      </div>
      {item.frequency === 'daily' && (
        <p className="mt-2 text-[11px] text-slate-500">
          30D {fmt(item.averages.d30)} · 90D {fmt(item.averages.d90)}
        </p>
      )}
      {extra}
    </div>
  );
}
