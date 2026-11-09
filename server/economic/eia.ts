import type { IndicatorCatalogRow } from './catalog.ts';
import type { RawObservation } from './ecos.ts';

function eiaKey(): string {
  const key = process.env.EIA_API_KEY?.trim();
  if (!key) throw new Error('EIA_API_KEY가 설정되지 않았습니다.');
  return key;
}

function parseNumber(raw: unknown): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

export async function fetchEiaSeries(row: IndicatorCatalogRow): Promise<RawObservation[]> {
  const mapping = row.mapping as {
    route: string;
    frequency: string;
    data_field: string;
    facets: Record<string, string>;
    series_name: string;
  };
  const start = new Date();
  start.setDate(start.getDate() - 420);
  const startStr = start.toISOString().slice(0, 10);
  const url = new URL(`https://api.eia.gov/v2/${mapping.route}/data/`);
  url.searchParams.set('api_key', eiaKey());
  url.searchParams.set('frequency', mapping.frequency);
  url.searchParams.set('data[0]', mapping.data_field);
  url.searchParams.set('sort[0][column]', 'period');
  url.searchParams.set('sort[0][direction]', 'asc');
  url.searchParams.set('length', '5000');
  url.searchParams.set('start', startStr);
  for (const [facet, value] of Object.entries(mapping.facets)) {
    url.searchParams.append(`facets[${facet}][]`, value);
  }

  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`EIA HTTP ${res.status}`);
  const json = (await res.json()) as {
    response?: { data?: Array<Record<string, unknown>>; errors?: unknown };
    error?: string;
  };
  if (json.error) throw new Error(`EIA: ${json.error}`);
  const data = json.response?.data ?? [];
  const out: RawObservation[] = [];
  for (const rec of data) {
    const value = parseNumber(rec.value ?? rec[mapping.data_field]);
    const period = String(rec.period || '');
    if (value == null || !period) continue;
    out.push({
      period,
      value,
      unit: row.unit,
      sourceTimestamp: period,
      sourceReference: `${mapping.route} series=${mapping.facets.series} ${mapping.series_name}`,
    });
  }
  out.sort((a, b) => a.period.localeCompare(b.period));
  return out;
}
