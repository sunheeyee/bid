import { IndicatorCard } from './IndicatorCard';
import { TrendChart } from './TrendChart';
import type { EconomicDashboardPayload } from '../../types';

const energy = ['eia_wti', 'eia_brent', 'eia_natgas'] as const;
const metals = ['imf_copper', 'imf_aluminum', 'imf_nickel', 'imf_zinc'] as const;

export function CommoditiesSection({ data }: { data: EconomicDashboardPayload }) {
  const find = (k: string) => data.indicators.find((i) => i.key === k);
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Commodities</h2>
      <p className="mb-3 text-xs text-slate-500">에너지: U.S. EIA (일간) · 비철금속: IMF PCPS (월간, 일간처럼 보간하지 않음)</p>
      <div className="grid gap-4 md:grid-cols-3">
        {energy.map((k) => (
          <IndicatorCard key={k} item={find(k)} />
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {energy.map((k) => (
          <div key={`${k}-chart`} className="rounded-xl border border-slate-800 bg-slatepanel p-4">
            <p className="mb-2 text-xs text-slate-400">{find(k)?.displayName} · Source: U.S. EIA</p>
            <TrendChart points={(data.series[k]?.points ?? []).slice(-180)} name={k} color="#fb7185" />
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        {metals.map((k) => (
          <IndicatorCard key={k} item={find(k)} />
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {metals.map((k) => (
          <div key={`${k}-chart`} className="rounded-xl border border-slate-800 bg-slatepanel p-4">
            <p className="mb-2 text-xs text-slate-400">{find(k)?.displayName} 24개월 · Source: IMF PCPS</p>
            <TrendChart points={(data.series[k]?.points ?? []).slice(-24)} name={k} color="#c084fc" />
          </div>
        ))}
      </div>
    </section>
  );
}
