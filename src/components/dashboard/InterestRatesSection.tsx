import { IndicatorCard } from './IndicatorCard';
import { TrendChart } from './TrendChart';
import type { EconomicDashboardPayload } from '../../types';

const keys = ['ecos_base_rate', 'ecos_cd_91', 'ecos_ktb_3y', 'ecos_corp_aa_3y'] as const;

export function InterestRatesSection({ data }: { data: EconomicDashboardPayload }) {
  const find = (k: string) => data.indicators.find((i) => i.key === k);
  const corp = data.series.ecos_corp_aa_3y?.points ?? [];
  const ktb = data.series.ecos_ktb_3y?.points ?? [];
  const spreadMap = new Map(ktb.map((p) => [p.period, p.value]));
  const spread = corp
    .map((p) => {
      const k = spreadMap.get(p.period);
      return k == null ? null : { ...p, value: p.value - k };
    })
    .filter((p): p is NonNullable<typeof p> => p != null);

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Interest Rates</h2>
      <div className="grid gap-4 md:grid-cols-4">
        {keys.map((k) => (
          <IndicatorCard key={k} item={find(k)} />
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slatepanel p-4">
          <p className="mb-2 text-xs text-slate-400">국고채 3년 · Source: Bank of Korea ECOS</p>
          <TrendChart points={(data.series.ecos_ktb_3y?.points ?? []).slice(-260)} name="KTB3Y" color="#38bdf8" />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slatepanel p-4">
          <p className="mb-2 text-xs text-slate-400">회사채 AA- − 국고채 3년 스프레드 (둘 다 있을 때만) · Calculated</p>
          <TrendChart points={spread.slice(-260)} name="Spread" color="#fbbf24" />
        </div>
      </div>
    </section>
  );
}
