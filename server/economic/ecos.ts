import type { IndicatorCatalogRow } from './catalog.ts';

export interface RawObservation {
  period: string;
  value: number;
  unit?: string;
  sourceTimestamp: string;
  sourceReference: string;
}

function ecosKey(): string {
  const key = process.env.ECOS_API_KEY?.trim();
  if (!key) throw new Error('ECOS_API_KEY가 설정되지 않았습니다.');
  return key;
}

function formatRange(frequency: string): { start: string; end: string } {
  const now = new Date();
  const endY = now.getFullYear();
  const endM = String(now.getMonth() + 1).padStart(2, '0');
  const endD = String(now.getDate()).padStart(2, '0');
  if (frequency === 'daily') {
    const start = new Date(now);
    start.setDate(start.getDate() - 420);
    const sY = start.getFullYear();
    const sM = String(start.getMonth() + 1).padStart(2, '0');
    const sD = String(start.getDate()).padStart(2, '0');
    return { start: `${sY}${sM}${sD}`, end: `${endY}${endM}${endD}` };
  }
  const start = new Date(now);
  start.setMonth(start.getMonth() - 36);
  return {
    start: `${start.getFullYear()}${String(start.getMonth() + 1).padStart(2, '0')}`,
    end: `${endY}${endM}`,
  };
}

function parseEcosPeriod(time: string, cycle: string): string {
  const t = String(time).trim();
  if (cycle === 'D' && /^\d{8}$/.test(t)) {
    return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
  }
  if (cycle === 'M' && /^\d{6}$/.test(t)) {
    return `${t.slice(0, 4)}-${t.slice(4, 6)}`;
  }
  return t;
}

function parseNumber(raw: unknown): number | null {
  if (raw == null) return null;
  const n = Number(String(raw).replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  return n;
}

export async function fetchEcosSeries(row: IndicatorCatalogRow): Promise<RawObservation[]> {
  const mapping = row.mapping as {
    statistic_table_code: string;
    statistic_table_name: string;
    item_code: string;
    item_name: string;
    cycle: string;
  };
  const { start, end } = formatRange(row.frequency);
  const key = ecosKey();
  const item = mapping.item_code.replaceAll('*', '%2A');
  const url =
    `https://ecos.bok.or.kr/api/StatisticSearch/${key}/json/kr/1/10000/` +
    `${mapping.statistic_table_code}/${mapping.cycle}/${start}/${end}/${item}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`ECOS HTTP ${res.status}`);
  const json = (await res.json()) as Record<string, unknown>;
  const result = (json.RESULT || (json.StatisticSearch as { RESULT?: { CODE?: string; MESSAGE?: string } })?.RESULT) as
    | { CODE?: string; MESSAGE?: string }
    | undefined;
  if (result?.CODE && result.CODE !== '000') {
    throw new Error(`ECOS ${mapping.statistic_table_code}: ${result.MESSAGE || result.CODE}`);
  }
  const block = json.StatisticSearch as { row?: unknown } | undefined;
  const rows = Array.isArray(block?.row) ? block.row : block?.row ? [block.row] : [];
  const out: RawObservation[] = [];
  for (const itemRow of rows as Array<Record<string, string>>) {
    const value = parseNumber(itemRow.DATA_VALUE);
    if (value == null) continue;
    const period = parseEcosPeriod(itemRow.TIME, mapping.cycle);
    out.push({
      period,
      value,
      unit: itemRow.UNIT_NAME || row.unit,
      sourceTimestamp: period,
      sourceReference: `${mapping.statistic_table_code}/${mapping.item_code} ${mapping.item_name}`,
    });
  }
  out.sort((a, b) => a.period.localeCompare(b.period));
  return out;
}
