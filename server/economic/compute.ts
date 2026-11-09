import type {
  BidCostCalculation,
  BidCostLineResult,
  BidCostScenario,
  DataFreshness,
  EconomicFrequency,
  IndicatorAverages,
  IndicatorChangeSet,
  RiskLevel,
} from '../../src/types/index.ts';

export interface StoredPoint {
  period: string;
  value: number;
  fetchedAt: string;
  sourceTimestamp: string | null;
  isEstimated: boolean;
}

function parsePeriodDate(period: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) return new Date(`${period}T00:00:00Z`);
  if (/^\d{4}-\d{2}$/.test(period)) return new Date(`${period}-01T00:00:00Z`);
  return null;
}

function addMonths(period: string, delta: number): string | null {
  const d = parsePeriodDate(period);
  if (!d) return null;
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + delta;
  const dt = new Date(Date.UTC(y, m, 1));
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    const day = Number(period.slice(8, 10));
    const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
    const dd = String(Math.min(day, last)).padStart(2, '0');
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${dd}`;
  }
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
}

function nearestOnOrBefore(points: StoredPoint[], target: string): StoredPoint | null {
  const prev = points.filter((p) => p.period <= target);
  return prev.at(-1) ?? null;
}

function pctChange(latest: number | undefined, past: number | undefined): number | null {
  if (latest == null || past == null || past === 0) return null;
  return ((latest - past) / past) * 100;
}

export function computeChanges(points: StoredPoint[], frequency: EconomicFrequency): IndicatorChangeSet {
  const sorted = [...points].sort((a, b) => a.period.localeCompare(b.period));
  const latest = sorted.at(-1);
  if (!latest) return { m1: null, m3: null, m6: null, m12: null };
  const offsets = frequency === 'daily' ? { m1: 30, m3: 90, m6: 180, m12: 365 } : { m1: 1, m3: 3, m6: 6, m12: 12 };

  const byOffset = (n: number) => {
    if (frequency === 'daily') {
      const d = parsePeriodDate(latest.period);
      if (!d) return null;
      d.setUTCDate(d.getUTCDate() - n);
      const target = d.toISOString().slice(0, 10);
      const past = nearestOnOrBefore(sorted, target);
      return pctChange(latest.value, past?.value);
    }
    const target = addMonths(latest.period, -n);
    if (!target) return null;
    const past = nearestOnOrBefore(sorted, target);
    if (past && past.period === latest.period) return null;
    return pctChange(latest.value, past?.value);
  };

  return {
    m1: byOffset(offsets.m1),
    m3: byOffset(offsets.m3),
    m6: byOffset(offsets.m6),
    m12: byOffset(offsets.m12),
  };
}

export function computeAverages(points: StoredPoint[], frequency: EconomicFrequency): IndicatorAverages {
  const sorted = [...points].sort((a, b) => a.period.localeCompare(b.period));
  const latest = sorted.at(-1);
  const empty = { d30: null, d90: null, m3: null, m6: null };
  if (!latest) return empty;

  const avgLast = (n: number) => {
    const slice = sorted.slice(-n).filter((p) => Number.isFinite(p.value));
    if (!slice.length) return null;
    return slice.reduce((s, p) => s + p.value, 0) / slice.length;
  };

  if (frequency === 'daily') {
    const lastNDays = (days: number) => {
      const d = parsePeriodDate(latest.period);
      if (!d) return null;
      d.setUTCDate(d.getUTCDate() - days);
      const from = d.toISOString().slice(0, 10);
      const slice = sorted.filter((p) => p.period > from && p.period <= latest.period);
      if (!slice.length) return null;
      return slice.reduce((s, p) => s + p.value, 0) / slice.length;
    };
    return { d30: lastNDays(30), d90: lastNDays(90), m3: null, m6: null };
  }
  return { d30: null, d90: null, m3: avgLast(3), m6: avgLast(6) };
}

export function freshness(frequency: EconomicFrequency, period: string | null): DataFreshness {
  if (!period) return 'missing';
  const d = parsePeriodDate(period);
  if (!d) return 'missing';
  const ageDays = (Date.now() - d.getTime()) / 86_400_000;
  if (frequency === 'daily') return ageDays > 7 ? 'stale' : 'ok';
  if (frequency === 'monthly') return ageDays > 70 ? 'stale' : 'ok';
  return ageDays > 40 ? 'stale' : 'ok';
}

export function creditSpread(corp: StoredPoint[] | undefined, ktb: StoredPoint[] | undefined) {
  const c = corp?.at(-1);
  const k = ktb?.at(-1);
  if (!c || !k) return null;
  return { period: c.period < k.period ? c.period : k.period, value: c.value - k.value };
}

export function krwEffects(
  commodity: StoredPoint[],
  fx: StoredPoint[],
  months = 3
): { commodity: number | null; fx: number | null; combined: number | null } {
  const cSorted = [...commodity].sort((a, b) => a.period.localeCompare(b.period));
  const latestC = cSorted.at(-1);
  if (!latestC) return { commodity: null, fx: null, combined: null };
  const pastPeriod = addMonths(latestC.period, -months);
  const pastC = pastPeriod ? nearestOnOrBefore(cSorted, pastPeriod) : null;
  const monthAvg = (yyyyMm: string) => {
    const slice = fx.filter((p) => p.period.startsWith(yyyyMm));
    if (!slice.length) {
      const nearest = nearestOnOrBefore(fx, `${yyyyMm}-31`);
      return nearest?.value ?? null;
    }
    return slice.reduce((s, p) => s + p.value, 0) / slice.length;
  };
  const latestMonth = latestC.period.slice(0, 7);
  const pastMonth = pastC?.period.slice(0, 7);
  const fxNow = monthAvg(latestMonth);
  const fxPast = pastMonth ? monthAvg(pastMonth) : null;
  if (!pastC || fxNow == null || fxPast == null || pastC.value === 0 || fxPast === 0) {
    return {
      commodity: pctChange(latestC.value, pastC?.value),
      fx: pctChange(fxNow ?? undefined, fxPast ?? undefined),
      combined: null,
    };
  }
  return {
    commodity: pctChange(latestC.value, pastC.value),
    fx: pctChange(fxNow, fxPast),
    combined: ((latestC.value * fxNow) / (pastC.value * fxPast) - 1) * 100,
  };
}

export function riskFromCostChange(changePct: number | null): RiskLevel | null {
  if (changePct == null) return null;
  const a = Math.abs(changePct);
  if (a < 2) return 'LOW';
  if (a < 5) return 'MEDIUM';
  if (a < 10) return 'HIGH';
  return 'VERY_HIGH';
}

export const DEFAULT_RISK_RULE =
  'Risk Level은 추정 원가 변화율 절대값 기준입니다. |Δ| < 2% LOW, < 5% MEDIUM, < 10% HIGH, 그 외 VERY_HIGH. 핵심 지표 결측 시 확정값으로 표시하지 않습니다.';

export function calculateBidCost(
  scenario: BidCostScenario,
  series: Record<string, StoredPoint[]>,
  horizonMonths = 3
): BidCostCalculation {
  const weightSum = scenario.lines.reduce((s, l) => s + (Number(l.weightPct) || 0), 0);
  const weightWarning =
    Math.abs(weightSum - 100) > 0.05 ? `원가 비중 합이 ${weightSum.toFixed(1)}%입니다. 100%가 아니면 자동 보정하지 않습니다.` : null;

  const fx = series.ecos_usd_krw ?? [];
  const lines: BidCostLineResult[] = scenario.lines.map((line) => {
    const keys = line.indicatorKeys;
    const commodityKey = keys.find((k) => k.startsWith('imf_') || k.startsWith('eia_') || k === 'ecos_ppi_steel');
    const usesFx = keys.includes('ecos_usd_krw');
    let itemChangePct: number | null = null;
    let commodityEffect: number | null = null;
    let fxEffect: number | null = null;
    let combinedKrwEffect: number | null = null;
    let status: BidCostLineResult['status'] = 'ok';
    let note: string | undefined;

    if (commodityKey && usesFx) {
      const effects = krwEffects(series[commodityKey] ?? [], fx, horizonMonths);
      commodityEffect = effects.commodity;
      fxEffect = effects.fx;
      combinedKrwEffect = effects.combined;
      itemChangePct = effects.combined ?? effects.commodity;
      if (commodityKey === 'ecos_ppi_steel') {
        const ppi = computeChanges(series.ecos_ppi_steel ?? [], 'monthly').m3;
        const imp = computeChanges(series.ecos_import_price ?? [], 'monthly').m3;
        const parts = [ppi, imp, effects.combined ?? effects.fx].filter((v): v is number => v != null);
        if (parts.length) itemChangePct = parts.reduce((s, v) => s + v, 0) / parts.length;
        note = '국제 철강 현물은 3-provider 제약으로 제공하지 않습니다. ECOS 철강 PPI + 수입물가 + USD/KRW 대리 지표입니다.';
      }
      if (itemChangePct == null) status = 'incomplete';
      else if (effects.combined == null) status = 'partial';
    } else if (keys.length) {
      const changes = keys.map((k) => {
        const pts = series[k] ?? [];
        const freq = pts[0]?.period?.length === 7 ? 'monthly' : 'daily';
        return computeChanges(pts, freq as EconomicFrequency).m3;
      });
      const present = changes.filter((v): v is number => v != null);
      if (!present.length) {
        status = 'incomplete';
      } else {
        itemChangePct = present.reduce((s, v) => s + v, 0) / present.length;
        if (present.length < changes.length) status = 'partial';
      }
    } else {
      status = 'incomplete';
    }

    const contributionPct =
      itemChangePct == null ? null : itemChangePct * ((Number(line.weightPct) || 0) / 100);

    return {
      id: line.id,
      name: line.name,
      weightPct: line.weightPct,
      indicatorKeys: keys,
      itemChangePct,
      contributionPct,
      commodityEffect,
      fxEffect,
      combinedKrwEffect,
      status,
      note,
    };
  });

  const usable = lines.filter((l) => l.contributionPct != null);
  const totalChangePct = usable.length
    ? usable.reduce((s, l) => s + (l.contributionPct as number), 0)
    : null;
  const estimatedCost =
    scenario.baseCost != null && totalChangePct != null
      ? scenario.baseCost * (1 + totalChangePct / 100)
      : null;
  const incomplete = lines.some((l) => l.status !== 'ok');
  const calcStatus: BidCostCalculation['status'] = totalChangePct == null ? 'incomplete' : incomplete ? 'partial' : 'ok';

  return {
    scenario,
    totalChangePct,
    estimatedCost,
    riskLevel: riskFromCostChange(totalChangePct),
    riskRule: DEFAULT_RISK_RULE,
    weightSum,
    weightWarning,
    lines,
    ranked: [...lines].sort((a, b) => Math.abs(b.contributionPct ?? -Infinity) - Math.abs(a.contributionPct ?? -Infinity)),
    status: calcStatus,
  };
}
