import crypto from 'node:crypto';
import { pool } from '../db.ts';
import {
  DEFAULT_BID_SCENARIO,
  INDICATOR_CATALOG,
  providerLabel,
  type IndicatorCatalogRow,
} from './catalog.ts';
import { fetchEcosSeries } from './ecos.ts';
import { fetchEiaSeries } from './eia.ts';
import { fetchImfSeries } from './imf.ts';
import {
  calculateBidCost,
  computeAverages,
  computeChanges,
  creditSpread,
  freshness,
  krwEffects,
  type StoredPoint,
} from './compute.ts';
import type {
  BidCostScenario,
  DataFreshness,
  EconomicDashboardPayload,
  EconomicProvider,
  ExecutiveSummaryPayload,
  IndicatorSummary,
  NormalizedIndicatorPoint,
  SeriesPayload,
} from '../../src/types/index.ts';

const providerErrors: Partial<Record<EconomicProvider, string>> = {};
let lastRefresh: { at: string; ok: boolean } | null = null;
let refreshInFlight: Promise<void> | null = null;

function ttlHours(row: IndicatorCatalogRow): number {
  if (row.provider === 'ECOS' && row.frequency === 'daily') return 6;
  if (row.provider === 'EIA') return 12;
  return 24;
}

async function loadCatalog(): Promise<IndicatorCatalogRow[]> {
  const res = await pool.query(
    `SELECT indicator_key, provider, display_name_ko, category, frequency, unit, currency, mapping_json, source_url, active, verified_at
     FROM economic_indicator_catalog WHERE active = 1`
  );
  if (!res.rowCount) return INDICATOR_CATALOG.filter((r) => r.active);
  return res.rows.map((r) => ({
    indicatorKey: r.indicator_key,
    provider: r.provider,
    displayNameKo: r.display_name_ko,
    category: r.category,
    frequency: r.frequency,
    unit: r.unit,
    currency: r.currency ?? undefined,
    mapping: JSON.parse(r.mapping_json),
    sourceUrl: r.source_url,
    active: true,
    verifiedAt: r.verified_at,
  }));
}

async function lastFetchedAt(key: string): Promise<string | null> {
  const res = await pool.query<{ fetched_at: string }>(
    `SELECT fetched_at FROM economic_observations WHERE indicator_key = $1 ORDER BY fetched_at DESC LIMIT 1`,
    [key]
  );
  return res.rows[0]?.fetched_at ?? null;
}

async function upsertObservations(row: IndicatorCatalogRow, fetchedAt: string) {
  let points;
  if (row.provider === 'ECOS') points = await fetchEcosSeries(row);
  else if (row.provider === 'EIA') points = await fetchEiaSeries(row);
  else points = await fetchImfSeries(row);

  for (const p of points) {
    const id = crypto.createHash('sha1').update(`${row.indicatorKey}:${p.period}`).digest('hex');
    await pool.query(
      `INSERT INTO economic_observations (
         id, indicator_key, period, value, unit, currency, source_timestamp, fetched_at, source_reference, is_estimated
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0)
       ON CONFLICT (indicator_key, period) DO UPDATE SET
         value = EXCLUDED.value,
         unit = EXCLUDED.unit,
         currency = EXCLUDED.currency,
         source_timestamp = EXCLUDED.source_timestamp,
         fetched_at = EXCLUDED.fetched_at,
         source_reference = EXCLUDED.source_reference,
         is_estimated = 0`,
      [
        id,
        row.indicatorKey,
        p.period,
        p.value,
        p.unit ?? row.unit,
        row.currency ?? null,
        p.sourceTimestamp,
        fetchedAt,
        p.sourceReference,
      ]
    );
  }
  return points.length;
}

export async function refreshEconomicData(force = false) {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const catalog = await loadCatalog();
    const fetchedAt = new Date().toISOString();
    for (const row of catalog) {
      try {
        const last = await lastFetchedAt(row.indicatorKey);
        if (!force && last) {
          const ageH = (Date.now() - new Date(last).getTime()) / 3_600_000;
          if (ageH < ttlHours(row)) continue;
        }
        await upsertObservations(row, fetchedAt);
        delete providerErrors[row.provider];
      } catch (err) {
        const message = err instanceof Error ? err.message : '수집 실패';
        providerErrors[row.provider] = message;
      }
    }
    lastRefresh = { at: fetchedAt, ok: Object.keys(providerErrors).length === 0 };
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function loadSeriesMap(keys?: string[]): Promise<Record<string, StoredPoint[]>> {
  const params: unknown[] = [];
  let sql = `SELECT indicator_key, period, value, fetched_at, source_timestamp, is_estimated
             FROM economic_observations`;
  if (keys?.length) {
    params.push(keys);
    sql += ` WHERE indicator_key = ANY($1)`;
  }
  sql += ' ORDER BY indicator_key, period';
  const res = await pool.query(sql, params);
  const map: Record<string, StoredPoint[]> = {};
  for (const row of res.rows) {
    (map[row.indicator_key] ??= []).push({
      period: row.period,
      value: Number(row.value),
      fetchedAt: row.fetched_at,
      sourceTimestamp: row.source_timestamp,
      isEstimated: row.is_estimated === 1,
    });
  }
  return map;
}

function toPoint(row: IndicatorCatalogRow, p: StoredPoint): NormalizedIndicatorPoint {
  return {
    indicatorKey: row.indicatorKey,
    provider: row.provider,
    indicatorName: row.displayNameKo,
    category: row.category,
    period: p.period,
    frequency: row.frequency,
    value: p.value,
    unit: row.unit,
    currency: row.currency,
    sourceTimestamp: p.sourceTimestamp || p.period,
    fetchedAt: p.fetchedAt,
    sourceReference: String((row.mapping as { series_key?: string }).series_key || row.indicatorKey),
    isEstimated: p.isEstimated,
  };
}

export async function loadScenario(id = 'bcs-default'): Promise<BidCostScenario> {
  const res = await pool.query('SELECT * FROM bid_cost_scenarios WHERE id = $1', [id]);
  const row = res.rows[0];
  if (!row) {
    return {
      id: DEFAULT_BID_SCENARIO.id,
      name: DEFAULT_BID_SCENARIO.name,
      baseCost: DEFAULT_BID_SCENARIO.baseCost,
      baseFx: DEFAULT_BID_SCENARIO.baseFx,
      lines: DEFAULT_BID_SCENARIO.lines,
      riskWeights: DEFAULT_BID_SCENARIO.riskWeights,
    };
  }
  return {
    id: row.id,
    name: row.name,
    baseCost: row.base_cost == null ? null : Number(row.base_cost),
    baseFx: row.base_fx == null ? null : Number(row.base_fx),
    lines: JSON.parse(row.weights_json),
    riskWeights: row.risk_weights_json ? JSON.parse(row.risk_weights_json) : DEFAULT_BID_SCENARIO.riskWeights,
  };
}

export async function saveScenario(body: BidCostScenario): Promise<BidCostScenario> {
  const now = new Date().toISOString();
  const id = body.id || 'bcs-default';
  await pool.query(
    `INSERT INTO bid_cost_scenarios (id, name, base_cost, base_fx, weights_json, risk_weights_json, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$7)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       base_cost = EXCLUDED.base_cost,
       base_fx = EXCLUDED.base_fx,
       weights_json = EXCLUDED.weights_json,
       risk_weights_json = EXCLUDED.risk_weights_json,
       updated_at = EXCLUDED.updated_at`,
    [
      id,
      body.name || '기본 입찰 원가 시나리오',
      body.baseCost,
      body.baseFx,
      JSON.stringify(body.lines),
      JSON.stringify(body.riskWeights || DEFAULT_BID_SCENARIO.riskWeights),
      now,
    ]
  );
  return loadScenario(id);
}

function buildSummaries(
  catalog: IndicatorCatalogRow[],
  series: Record<string, StoredPoint[]>
): IndicatorSummary[] {
  return catalog.map((row) => {
    const points = series[row.indicatorKey] ?? [];
    const latest = points.at(-1) ?? null;
    const status: DataFreshness = providerErrors[row.provider]
      ? latest
        ? 'stale'
        : 'error'
      : freshness(row.frequency, latest?.period ?? null);
    return {
      key: row.indicatorKey,
      displayName: row.displayNameKo,
      provider: row.provider,
      providerLabel: providerLabel(row.provider),
      category: row.category,
      frequency: row.frequency,
      unit: row.unit,
      currency: row.currency,
      latest: latest ? toPoint(row, latest) : null,
      changes: computeChanges(points, row.frequency),
      averages: computeAverages(points, row.frequency),
      status,
      sourceReference: (() => {
        const m = row.mapping as {
          series_key?: string;
          statistic_table_code?: string;
          item_code?: string;
          route?: string;
          facets?: { series?: string };
        };
        return (
          m.series_key ||
          `${m.statistic_table_code || ''} ${m.item_code || ''}`.trim() ||
          `${m.route || ''} series=${m.facets?.series || ''}`.trim()
        );
      })(),
      staleNote: status === 'stale' ? `캐시 기준일 ${latest?.period ?? 'N/A'}` : undefined,
    };
  });
}

function buildSeriesPayload(
  catalog: IndicatorCatalogRow[],
  series: Record<string, StoredPoint[]>,
  keys?: string[]
): Record<string, SeriesPayload> {
  const out: Record<string, SeriesPayload> = {};
  for (const row of catalog) {
    if (keys && !keys.includes(row.indicatorKey)) continue;
    const points = series[row.indicatorKey] ?? [];
    out[row.indicatorKey] = {
      key: row.indicatorKey,
      displayName: row.displayNameKo,
      provider: row.provider,
      frequency: row.frequency,
      unit: row.unit,
      points: points.map((p) => toPoint(row, p)),
    };
  }
  return out;
}

export async function getDashboardPayload(): Promise<EconomicDashboardPayload> {
  const count = await pool.query('SELECT COUNT(*)::int AS n FROM economic_observations');
  if ((count.rows[0]?.n ?? 0) === 0) {
    await refreshEconomicData(true);
  } else {
    void refreshEconomicData(false);
  }
  const catalog = await loadCatalog();
  const series = await loadSeriesMap();
  const indicators = buildSummaries(catalog, series);
  const scenario = await loadScenario();
  if (scenario.baseFx == null) {
    const fx = series.ecos_usd_krw?.at(-1)?.value;
    if (fx != null) scenario.baseFx = fx;
  }
  const bidCost = calculateBidCost(scenario, series);
  const core = indicators.filter((i) =>
    ['ecos_ppi', 'ecos_cpi', 'ecos_usd_krw', 'eia_wti', 'imf_copper'].includes(i.key)
  );
  const withLatest = core.filter((i) => i.latest);
  const oldest = [...withLatest].sort((a, b) => a.latest!.period.localeCompare(b.latest!.period))[0];
  const newest = [...withLatest].sort((a, b) => b.latest!.period.localeCompare(a.latest!.period))[0];
  const missing = indicators.filter((i) => !i.latest).map((i) => i.displayName);
  const ranked = bidCost.ranked.filter((l) => l.contributionPct != null);
  const summary: ExecutiveSummaryPayload = {
    estimatedCostChangePct: bidCost.totalChangePct,
    riskLevel: bidCost.riskLevel,
    riskRule: bidCost.riskRule,
    topUp: ranked
      .filter((l) => (l.contributionPct ?? 0) > 0)
      .slice(0, 3)
      .map((l) => ({ name: l.name, key: l.id, contributionPct: l.contributionPct })),
    topDown: ranked
      .filter((l) => (l.contributionPct ?? 0) < 0)
      .sort((a, b) => (a.contributionPct ?? 0) - (b.contributionPct ?? 0))
      .slice(0, 3)
      .map((l) => ({ name: l.name, key: l.id, contributionPct: l.contributionPct })),
    asOf: {
      oldestCorePeriod: oldest?.latest?.period ?? null,
      oldestCoreName: oldest?.displayName ?? null,
      newestCorePeriod: newest?.latest?.period ?? null,
      fetchedAt: lastRefresh?.at ?? oldest?.latest?.fetchedAt ?? null,
    },
    status: missing.length ? (withLatest.length ? 'partial' : 'error') : bidCost.status === 'ok' ? 'ok' : 'partial',
    missing,
    weightSum: bidCost.weightSum,
    weightWarning: bidCost.weightWarning,
  };

  const providerStatus = {
    ECOS: {
      status: (providerErrors.ECOS ? (series.ecos_ppi?.length ? 'stale' : 'error') : 'ok') as DataFreshness,
      message: providerErrors.ECOS,
    },
    EIA: {
      status: (providerErrors.EIA ? (series.eia_wti?.length ? 'stale' : 'error') : 'ok') as DataFreshness,
      message: providerErrors.EIA,
    },
    IMF: {
      status: (providerErrors.IMF ? (series.imf_copper?.length ? 'stale' : 'error') : 'ok') as DataFreshness,
      message: providerErrors.IMF,
    },
  };

  return {
    summary,
    indicators,
    series: buildSeriesPayload(catalog, series),
    bidCost,
    catalogVerifiedAt: catalog[0]?.verifiedAt ?? '2026-11-09',
    providerStatus,
  };
}

export async function getIndicatorDetail(key: string, from?: string, to?: string) {
  const catalog = (await loadCatalog()).find((c) => c.indicatorKey === key);
  if (!catalog) return null;
  const series = await loadSeriesMap([key]);
  let points = series[key] ?? [];
  if (from) points = points.filter((p) => p.period >= from);
  if (to) points = points.filter((p) => p.period <= to);
  const summaries = buildSummaries([catalog], { [key]: points });
  return { summary: summaries[0], points: points.map((p) => toPoint(catalog, p)) };
}

export function getSpread(series: Record<string, StoredPoint[]>) {
  return creditSpread(series.ecos_corp_aa_3y, series.ecos_ktb_3y);
}

export function getKrwEffect(series: Record<string, StoredPoint[]>, commodityKey: string) {
  return krwEffects(series[commodityKey] ?? [], series.ecos_usd_krw ?? [], 3);
}

export { providerErrors, lastRefresh };
