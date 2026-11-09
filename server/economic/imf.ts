import type { IndicatorCatalogRow } from './catalog.ts';
import type { RawObservation } from './ecos.ts';

function parseNumber(raw: unknown): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

function normalizePeriod(raw: string): string {
  const m = raw.match(/^(\d{4})-M(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}`;
  const m2 = raw.match(/^(\d{4})-(\d{2})$/);
  if (m2) return `${m2[1]}-${m2[2]}`;
  return raw;
}

interface SdmxJson {
  data?: {
    dataSets?: Array<{
      series?: Record<string, { observations?: Record<string, unknown[]> }>;
      observations?: Record<string, unknown[]>;
    }>;
    structures?: Array<{
      dimensions?: {
        series?: Array<{ id: string; values?: Array<{ id?: string; value?: string }> }>;
        observation?: Array<{ id: string; values?: Array<{ id?: string; value?: string }> }>;
      };
    }>;
  };
}

export async function fetchImfSeries(row: IndicatorCatalogRow): Promise<RawObservation[]> {
  const mapping = row.mapping as {
    dataflow_version: string;
    series_key: string;
    indicator: string;
  };
  const url =
    `https://api.imf.org/external/sdmx/3.0/data/dataflow/IMF.RES/PCPS/${mapping.dataflow_version}/` +
    `${mapping.series_key}?lastNObservations=36&dimensionAtObservation=TIME_PERIOD`;

  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.sdmx.data+json, application/json' },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`IMF HTTP ${res.status}`);
  const json = (await res.json()) as SdmxJson;
  const dataset = json.data?.dataSets?.[0];
  const structure = json.data?.structures?.[0];
  const timeValues = structure?.dimensions?.observation?.[0]?.values ?? [];
  const seriesMap = dataset?.series ?? {};
  const firstSeries = Object.values(seriesMap)[0];
  const observations = firstSeries?.observations ?? dataset?.observations ?? {};
  const out: RawObservation[] = [];
  for (const [idx, obs] of Object.entries(observations)) {
    const timeMeta = timeValues[Number(idx)];
    const periodRaw = String(timeMeta?.value || timeMeta?.id || idx);
    const value = parseNumber(Array.isArray(obs) ? obs[0] : obs);
    if (value == null) continue;
    const period = normalizePeriod(periodRaw);
    out.push({
      period,
      value,
      unit: row.unit,
      sourceTimestamp: period,
      sourceReference: `IMF.RES PCPS ${mapping.series_key}`,
    });
  }
  out.sort((a, b) => a.period.localeCompare(b.period));
  if (!out.length) {
    throw new Error(`IMF PCPS ${mapping.indicator}: 관측값이 없습니다.`);
  }
  return out;
}
