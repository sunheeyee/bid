import { IndicatorCard } from './IndicatorCard';
import { TrendChart } from './TrendChart';
import type { EconomicDashboardPayload } from '../../types';

export function FxSection({ data }: { data: EconomicDashboardPayload }) {
  const fx = data.indicators.find((i) => i.key === 'ecos_usd_krw');
  const points = data.series.ecos_usd_krw?.points ?? [];
  const last = points.slice(-260);
  const avg = (n: number) => {
    const slice = last.slice(-n);
    if (!slice.length) return null;
    return slice.reduce((s, p) => s + p.value, 0) / slice.length;
  };
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">FX</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <IndicatorCard
          item={fx}
          extra={
            <p className="mt-2 text-[11px] text-slate-500">
              1M 평균 {avg(22)?.toFixed(1) ?? 'N/A'} · 3M {avg(66)?.toFixed(1) ?? 'N/A'} · 6M {avg(132)?.toFixed(1) ?? 'N/A'}
            </p>
          }
        />
        <div className="rounded-xl border border-slate-800 bg-slatepanel p-4">
          <p className="mb-2 text-xs text-slate-400">USD/KRW 최근 12개월 · 일간 영업일 · Source: Bank of Korea ECOS</p>
          <TrendChart points={last} name="USD/KRW" color="#34d399" />
        </div>
      </div>
    </section>
  );
}
