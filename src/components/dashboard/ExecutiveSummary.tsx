import type { ExecutiveSummaryPayload, EconomicDashboardPayload } from '../../types';

const riskTone: Record<string, string> = {
  LOW: 'bg-emerald-500/15 text-emerald-300',
  MEDIUM: 'bg-amber-500/15 text-amber-300',
  HIGH: 'bg-orange-500/15 text-orange-300',
  VERY_HIGH: 'bg-rose-500/15 text-rose-300',
};

export function ExecutiveSummary({
  summary,
  providerStatus,
}: {
  summary: ExecutiveSummaryPayload;
  providerStatus: EconomicDashboardPayload['providerStatus'];
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slatepanel to-night p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sky-400">Executive Summary</p>
          <h2 className="mt-1 text-xl font-semibold">입찰 원가 환경 한눈에</h2>
        </div>
        <div className="text-right text-xs text-slate-400">
          <div>가장 오래된 핵심 기준: {summary.asOf.oldestCoreName ?? 'N/A'} {summary.asOf.oldestCorePeriod ?? ''}</div>
          <div>수집 시각: {summary.asOf.fetchedAt ? new Date(summary.asOf.fetchedAt).toLocaleString('ko-KR') : 'N/A'}</div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-night/70 p-4">
          <p className="text-xs text-slate-500">추정 원가 변화율 (3M 가중)</p>
          <p className="mt-2 text-3xl font-semibold">
            {summary.estimatedCostChangePct == null ? 'N/A' : `${summary.estimatedCostChangePct.toFixed(2)}%`}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">상태 {summary.status.toUpperCase()}</p>
        </div>
        <div className="rounded-xl bg-night/70 p-4">
          <p className="text-xs text-slate-500">Risk Level</p>
          <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-lg font-semibold ${riskTone[summary.riskLevel ?? ''] || 'text-slate-400'}`}>
            {summary.riskLevel ?? 'N/A'}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{summary.riskRule}</p>
        </div>
        <div className="rounded-xl bg-night/70 p-4">
          <p className="text-xs text-slate-500">상승 요인 Top 3</p>
          <ul className="mt-2 space-y-1 text-sm">
            {summary.topUp.length ? summary.topUp.map((f) => (
              <li key={f.key} className="flex justify-between text-rose-200">
                <span>{f.name}</span>
                <span>{f.contributionPct == null ? 'N/A' : `+${f.contributionPct.toFixed(2)}%p`}</span>
              </li>
            )) : <li className="text-slate-500">해당 없음</li>}
          </ul>
        </div>
        <div className="rounded-xl bg-night/70 p-4">
          <p className="text-xs text-slate-500">하락 요인 Top 3</p>
          <ul className="mt-2 space-y-1 text-sm">
            {summary.topDown.length ? summary.topDown.map((f) => (
              <li key={f.key} className="flex justify-between text-emerald-200">
                <span>{f.name}</span>
                <span>{f.contributionPct == null ? 'N/A' : `${f.contributionPct.toFixed(2)}%p`}</span>
              </li>
            )) : <li className="text-slate-500">해당 없음</li>}
          </ul>
        </div>
      </div>
      {summary.weightWarning && <p className="mt-3 text-xs text-amber-300">{summary.weightWarning}</p>}
      {summary.missing.length > 0 && (
        <p className="mt-2 text-xs text-rose-300">결측 지표: {summary.missing.join(', ')}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
        {Object.entries(providerStatus).map(([k, v]) => (
          <span key={k} className="rounded-full border border-slate-700 px-2 py-1 text-slate-400">
            {k}: {v.status}{v.message ? ` · ${v.message}` : ''}
          </span>
        ))}
      </div>
    </section>
  );
}
