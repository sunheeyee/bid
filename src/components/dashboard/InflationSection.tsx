import { IndicatorCard } from './IndicatorCard';
import { TrendChart } from './TrendChart';
import type { EconomicDashboardPayload } from '../../types';

export function InflationSection({ data }: { data: EconomicDashboardPayload }) {
  const ppi = data.indicators.find((i) => i.key === 'ecos_ppi');
  const cpi = data.indicators.find((i) => i.key === 'ecos_cpi');
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Inflation</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <IndicatorCard item={ppi} />
        <IndicatorCard item={cpi} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slatepanel p-4">
          <p className="mb-2 text-xs text-slate-400">PPI 최근 24개월 · Source: Bank of Korea ECOS</p>
          <TrendChart points={(data.series.ecos_ppi?.points ?? []).slice(-24)} name="PPI" color="#38bdf8" />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slatepanel p-4">
          <p className="mb-2 text-xs text-slate-400">CPI 최근 24개월 · Source: Bank of Korea ECOS</p>
          <TrendChart points={(data.series.ecos_cpi?.points ?? []).slice(-24)} name="CPI" color="#fbbf24" />
        </div>
      </div>
    </section>
  );
}
