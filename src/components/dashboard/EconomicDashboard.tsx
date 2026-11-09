import { RefreshCw } from 'lucide-react';
import { useEconomicDashboard } from '../../hooks/useEconomicDashboard';
import { ExecutiveSummary } from './ExecutiveSummary';
import { InflationSection } from './InflationSection';
import { FxSection } from './FxSection';
import { CommoditiesSection } from './CommoditiesSection';
import { InterestRatesSection } from './InterestRatesSection';
import { BidCostModel } from './BidCostModel';

export function EconomicDashboard({ isAdmin }: { isAdmin: boolean }) {
  const { data, loading, error, refresh, saveScenario, forceRefresh } = useEconomicDashboard();

  if (loading && !data) {
    return <div className="p-8 text-sm text-slate-400">경제지표를 불러오는 중… 서버 캐시가 없으면 최초 수집에 시간이 걸릴 수 있습니다.</div>;
  }
  if (error && !data) {
    return (
      <div className="p-8">
        <p className="text-rose-300">{error}</p>
        <button onClick={() => void refresh()} className="mt-3 rounded-lg bg-slate-800 px-3 py-2 text-sm">
          다시 시도
        </button>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-10 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-sky-400">POSCO STEELEON</p>
          <h1 className="text-2xl font-semibold">입찰 경제지표 대시보드</h1>
          <p className="mt-1 text-sm text-slate-400">현재 시장환경 기준 원가 변화와 가장 큰 원인을 추적합니다.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => void forceRefresh()}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300"
          >
            <RefreshCw size={14} /> 캐시 갱신
          </button>
        )}
      </div>
      <ExecutiveSummary summary={data.summary} providerStatus={data.providerStatus} />
      <InflationSection data={data} />
      <FxSection data={data} />
      <CommoditiesSection data={data} />
      <InterestRatesSection data={data} />
      <BidCostModel data={data} onSave={saveScenario} isAdmin={isAdmin} />
      <p className="pb-8 text-[11px] text-slate-600">카탈로그 확인일 {data.catalogVerifiedAt} · 공급자 ECOS / EIA / IMF PCPS만 사용</p>
    </div>
  );
}
