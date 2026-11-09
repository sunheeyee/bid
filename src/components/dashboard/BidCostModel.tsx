import { useEffect, useState } from 'react';
import type { BidCostScenario, EconomicDashboardPayload } from '../../types';

export function BidCostModel({
  data,
  onSave,
  isAdmin,
}: {
  data: EconomicDashboardPayload;
  onSave: (scenario: BidCostScenario) => Promise<unknown>;
  isAdmin: boolean;
}) {
  const [scenario, setScenario] = useState(data.bidCost.scenario);
  const [busy, setBusy] = useState(false);
  useEffect(() => setScenario(data.bidCost.scenario), [data.bidCost.scenario]);
  const result = data.bidCost;
  const updateLine = (id: string, weightPct: number) => {
    setScenario((s) => ({ ...s, lines: s.lines.map((l) => (l.id === id ? { ...l, weightPct } : l)) }));
  };

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Bid Cost Model</h2>
      <p className="mb-3 text-xs text-slate-500">
        철강은 국제 현물가가 아닌 ECOS 철강 PPI·수입물가·USD/KRW 대리 지표입니다. 비중 합이 100%가 아니면 자동 보정하지 않습니다.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slatepanel p-4">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <input
              value={scenario.name}
              onChange={(e) => setScenario({ ...scenario, name: e.target.value })}
              className="rounded-lg border border-slate-700 bg-night px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={scenario.baseCost ?? ''}
              onChange={(e) => setScenario({ ...scenario, baseCost: e.target.value === '' ? null : Number(e.target.value) })}
              className="rounded-lg border border-slate-700 bg-night px-3 py-2 text-sm"
              placeholder="기준 원가"
            />
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="py-1 text-left">항목</th>
                <th className="py-1 text-right">비중%</th>
                <th className="py-1 text-right">영향</th>
              </tr>
            </thead>
            <tbody>
              {scenario.lines.map((line) => {
                const r = result.lines.find((x) => x.id === line.id);
                return (
                  <tr key={line.id} className="border-t border-slate-800">
                    <td className="py-2">
                      {line.name}
                      <div className="text-[10px] text-slate-500">{line.indicatorKeys.join(', ')}</div>
                    </td>
                    <td className="py-2 text-right">
                      <input
                        type="number"
                        value={line.weightPct}
                        onChange={(e) => updateLine(line.id, Number(e.target.value))}
                        className="w-20 rounded bg-night px-2 py-1 text-right"
                      />
                    </td>
                    <td className="py-2 text-right text-xs">
                      {r?.itemChangePct == null ? 'N/A' : `${r.itemChangePct.toFixed(2)}%`}
                      <div className="text-slate-500">{r?.status}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {result.weightWarning && <p className="mt-2 text-xs text-amber-300">{result.weightWarning}</p>}
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave(scenario);
              } finally {
                setBusy(false);
              }
            }}
            className="mt-3 rounded-lg bg-sky-600 px-3 py-2 text-sm"
          >
            {isAdmin ? '저장 후 재계산' : '재계산'}
          </button>
        </div>
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slatepanel p-4">
          <div className="text-sm text-slate-400">총 추정 원가 변화율</div>
          <div className="text-3xl font-semibold">
            {result.totalChangePct == null ? 'N/A' : `${result.totalChangePct.toFixed(2)}%`}
          </div>
          <div className="text-sm text-slate-400">
            추정 원가 {result.estimatedCost == null ? 'N/A' : result.estimatedCost.toLocaleString('ko-KR')} · Risk {result.riskLevel ?? 'N/A'} · {result.status.toUpperCase()}
          </div>
          <h3 className="pt-2 text-sm font-semibold">기여도 순위</h3>
          <ul className="space-y-1 text-sm">
            {result.ranked.map((l) => (
              <li key={l.id} className="flex justify-between">
                <span>{l.name}</span>
                <span>{l.contributionPct == null ? 'N/A' : `${l.contributionPct.toFixed(2)}%p`}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] leading-relaxed text-slate-500">{result.riskRule}</p>
        </div>
      </div>
    </section>
  );
}
