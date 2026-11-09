import type { Pool } from 'pg';
import type { EconomicCategory, EconomicFrequency, EconomicProvider } from '../../src/types/index.ts';

export interface IndicatorCatalogRow {
  indicatorKey: string;
  provider: EconomicProvider;
  displayNameKo: string;
  category: EconomicCategory;
  frequency: EconomicFrequency;
  unit: string;
  currency?: string;
  mapping: Record<string, unknown>;
  sourceUrl: string;
  active: boolean;
  verifiedAt: string;
}

const VERIFIED_AT = '2026-11-09';

export const INDICATOR_CATALOG: IndicatorCatalogRow[] = [
  {
    indicatorKey: 'ecos_ppi',
    provider: 'ECOS',
    displayNameKo: '생산자물가지수(PPI)',
    category: 'inflation',
    frequency: 'monthly',
    unit: '2020=100',
    mapping: {
      statistic_table_code: '404Y014',
      statistic_table_name: '생산자물가지수(기본분류)',
      item_code: '*AA',
      item_name: '총지수',
      cycle: 'M',
    },
    sourceUrl: 'https://ecos.bok.or.kr/api/',
    active: true,
    verifiedAt: VERIFIED_AT,
  },
  {
    indicatorKey: 'ecos_cpi',
    provider: 'ECOS',
    displayNameKo: '소비자물가지수(CPI)',
    category: 'inflation',
    frequency: 'monthly',
    unit: '2020=100',
    mapping: {
      statistic_table_code: '901Y009',
      statistic_table_name: '소비자물가지수',
      item_code: '0',
      item_name: '총지수',
      cycle: 'M',
    },
    sourceUrl: 'https://ecos.bok.or.kr/api/',
    active: true,
    verifiedAt: VERIFIED_AT,
  },
  {
    indicatorKey: 'ecos_usd_krw',
    provider: 'ECOS',
    displayNameKo: '원/달러 환율',
    category: 'fx',
    frequency: 'daily',
    unit: '원',
    currency: 'KRW',
    mapping: {
      statistic_table_code: '731Y001',
      statistic_table_name: '주요국 통화의 대원화환율',
      item_code: '0000001',
      item_name: '원/미국달러(매매기준율)',
      cycle: 'D',
    },
    sourceUrl: 'https://ecos.bok.or.kr/api/',
    active: true,
    verifiedAt: VERIFIED_AT,
  },
  {
    indicatorKey: 'ecos_base_rate',
    provider: 'ECOS',
    displayNameKo: '한국은행 기준금리',
    category: 'interest_rate',
    frequency: 'daily',
    unit: '연%',
    mapping: {
      statistic_table_code: '722Y001',
      statistic_table_name: '한국은행 기준금리 및 여수신금리',
      item_code: '0101000',
      item_name: '한국은행 기준금리',
      cycle: 'D',
    },
    sourceUrl: 'https://ecos.bok.or.kr/api/',
    active: true,
    verifiedAt: VERIFIED_AT,
  },
  {
    indicatorKey: 'ecos_cd_91',
    provider: 'ECOS',
    displayNameKo: 'CD 91일',
    category: 'interest_rate',
    frequency: 'daily',
    unit: '연%',
    mapping: {
      statistic_table_code: '817Y002',
      statistic_table_name: '시장금리(일별)',
      item_code: '010502000',
      item_name: 'CD(91일)',
      cycle: 'D',
    },
    sourceUrl: 'https://ecos.bok.or.kr/api/',
    active: true,
    verifiedAt: VERIFIED_AT,
  },
  {
    indicatorKey: 'ecos_ktb_3y',
    provider: 'ECOS',
    displayNameKo: '국고채 3년',
    category: 'interest_rate',
    frequency: 'daily',
    unit: '연%',
    mapping: {
      statistic_table_code: '817Y002',
      statistic_table_name: '시장금리(일별)',
      item_code: '010200000',
      item_name: '국고채(3년)',
      cycle: 'D',
    },
    sourceUrl: 'https://ecos.bok.or.kr/api/',
    active: true,
    verifiedAt: VERIFIED_AT,
  },
  {
    indicatorKey: 'ecos_corp_aa_3y',
    provider: 'ECOS',
    displayNameKo: '회사채 AA- 3년',
    category: 'interest_rate',
    frequency: 'daily',
    unit: '연%',
    mapping: {
      statistic_table_code: '817Y002',
      statistic_table_name: '시장금리(일별)',
      item_code: '010300000',
      item_name: '회사채(3년, AA-)',
      cycle: 'D',
    },
    sourceUrl: 'https://ecos.bok.or.kr/api/',
    active: true,
    verifiedAt: VERIFIED_AT,
  },
  {
    indicatorKey: 'ecos_import_price',
    provider: 'ECOS',
    displayNameKo: '수입물가지수',
    category: 'steel_proxy',
    frequency: 'monthly',
    unit: '2020=100',
    mapping: {
      statistic_table_code: '401Y015',
      statistic_table_name: '수입물가지수(기본분류)',
      item_code: '*AA',
      item_name: '총지수',
      cycle: 'M',
    },
    sourceUrl: 'https://ecos.bok.or.kr/api/',
    active: true,
    verifiedAt: VERIFIED_AT,
  },
  {
    indicatorKey: 'ecos_ppi_steel',
    provider: 'ECOS',
    displayNameKo: '철강1차제품 PPI',
    category: 'steel_proxy',
    frequency: 'monthly',
    unit: '2020=100',
    mapping: {
      statistic_table_code: '404Y014',
      statistic_table_name: '생산자물가지수(기본분류)',
      item_code: '3071AA',
      item_name: '철강1차제품',
      cycle: 'M',
    },
    sourceUrl: 'https://ecos.bok.or.kr/api/',
    active: true,
    verifiedAt: VERIFIED_AT,
  },
  {
    indicatorKey: 'eia_wti',
    provider: 'EIA',
    displayNameKo: 'WTI 원유',
    category: 'energy',
    frequency: 'daily',
    unit: 'USD/bbl',
    currency: 'USD',
    mapping: {
      route: 'petroleum/pri/spt',
      frequency: 'daily',
      data_field: 'value',
      facets: { series: 'RWTC' },
      series_name: 'Cushing, OK WTI Spot Price FOB (Dollars per Barrel)',
    },
    sourceUrl: 'https://www.eia.gov/opendata/',
    active: true,
    verifiedAt: VERIFIED_AT,
  },
  {
    indicatorKey: 'eia_brent',
    provider: 'EIA',
    displayNameKo: 'Brent 원유',
    category: 'energy',
    frequency: 'daily',
    unit: 'USD/bbl',
    currency: 'USD',
    mapping: {
      route: 'petroleum/pri/spt',
      frequency: 'daily',
      data_field: 'value',
      facets: { series: 'RBRTE' },
      series_name: 'Europe Brent Spot Price FOB (Dollars per Barrel)',
    },
    sourceUrl: 'https://www.eia.gov/opendata/',
    active: true,
    verifiedAt: VERIFIED_AT,
  },
  {
    indicatorKey: 'eia_natgas',
    provider: 'EIA',
    displayNameKo: '천연가스 (Henry Hub)',
    category: 'energy',
    frequency: 'daily',
    unit: 'USD/MMBtu',
    currency: 'USD',
    mapping: {
      route: 'natural-gas/pri/fut',
      frequency: 'daily',
      data_field: 'value',
      facets: { series: 'RNGWHHD' },
      series_name: 'Henry Hub Natural Gas Spot Price (Dollars per Million Btu)',
    },
    sourceUrl: 'https://www.eia.gov/opendata/',
    active: true,
    verifiedAt: VERIFIED_AT,
  },
  {
    indicatorKey: 'imf_copper',
    provider: 'IMF',
    displayNameKo: '구리 (Copper)',
    category: 'nonferrous_metal',
    frequency: 'monthly',
    unit: 'USD/mt',
    currency: 'USD',
    mapping: {
      dataset: 'PCPS',
      agency: 'IMF.RES',
      dataflow_version: '9.0.0',
      country: 'G001',
      indicator: 'PCOPP',
      data_transformation: 'USD',
      series_key: 'G001.PCOPP.USD.M',
      frequency: 'M',
    },
    sourceUrl: 'https://data.imf.org/en/Datasets/PCPS',
    active: true,
    verifiedAt: VERIFIED_AT,
  },
  {
    indicatorKey: 'imf_aluminum',
    provider: 'IMF',
    displayNameKo: '알루미늄 (Aluminum)',
    category: 'nonferrous_metal',
    frequency: 'monthly',
    unit: 'USD/mt',
    currency: 'USD',
    mapping: {
      dataset: 'PCPS',
      agency: 'IMF.RES',
      dataflow_version: '9.0.0',
      country: 'G001',
      indicator: 'PALUM',
      data_transformation: 'USD',
      series_key: 'G001.PALUM.USD.M',
      frequency: 'M',
    },
    sourceUrl: 'https://data.imf.org/en/Datasets/PCPS',
    active: true,
    verifiedAt: VERIFIED_AT,
  },
  {
    indicatorKey: 'imf_nickel',
    provider: 'IMF',
    displayNameKo: '니켈 (Nickel)',
    category: 'nonferrous_metal',
    frequency: 'monthly',
    unit: 'USD/mt',
    currency: 'USD',
    mapping: {
      dataset: 'PCPS',
      agency: 'IMF.RES',
      dataflow_version: '9.0.0',
      country: 'G001',
      indicator: 'PNICK',
      data_transformation: 'USD',
      series_key: 'G001.PNICK.USD.M',
      frequency: 'M',
    },
    sourceUrl: 'https://data.imf.org/en/Datasets/PCPS',
    active: true,
    verifiedAt: VERIFIED_AT,
  },
  {
    indicatorKey: 'imf_zinc',
    provider: 'IMF',
    displayNameKo: '아연 (Zinc)',
    category: 'nonferrous_metal',
    frequency: 'monthly',
    unit: 'USD/mt',
    currency: 'USD',
    mapping: {
      dataset: 'PCPS',
      agency: 'IMF.RES',
      dataflow_version: '9.0.0',
      country: 'G001',
      indicator: 'PZINC',
      data_transformation: 'USD',
      series_key: 'G001.PZINC.USD.M',
      frequency: 'M',
    },
    sourceUrl: 'https://data.imf.org/en/Datasets/PCPS',
    active: true,
    verifiedAt: VERIFIED_AT,
  },
];

export const DEFAULT_BID_SCENARIO = {
  id: 'bcs-default',
  name: '기본 입찰 원가 시나리오',
  baseCost: 1_000_000_000,
  baseFx: null as number | null,
  lines: [
    { id: 'steel', name: '철강', weightPct: 30, indicatorKeys: ['ecos_ppi_steel', 'ecos_import_price', 'ecos_usd_krw'] },
    { id: 'aluminum', name: '알루미늄', weightPct: 10, indicatorKeys: ['imf_aluminum', 'ecos_usd_krw'] },
    { id: 'copper', name: '구리', weightPct: 10, indicatorKeys: ['imf_copper', 'ecos_usd_krw'] },
    { id: 'import_parts', name: '수입부품', weightPct: 15, indicatorKeys: ['ecos_import_price', 'ecos_usd_krw'] },
    { id: 'energy', name: '에너지', weightPct: 10, indicatorKeys: ['eia_wti'] },
    { id: 'finance', name: '금융비용', weightPct: 5, indicatorKeys: ['ecos_corp_aa_3y'] },
    { id: 'cpi', name: '일반 물가/인건비', weightPct: 10, indicatorKeys: ['ecos_cpi'] },
    { id: 'other', name: '기타', weightPct: 10, indicatorKeys: ['ecos_cpi'] },
  ],
  riskWeights: { commodity: 0.35, fx: 0.25, ppi: 0.25, rates: 0.15 },
};

export async function seedEconomicCatalog(pool: Pool) {
  const now = new Date().toISOString();
  for (const row of INDICATOR_CATALOG) {
    await pool.query(
      `INSERT INTO economic_indicator_catalog (
         indicator_key, provider, display_name_ko, category, frequency, unit, currency,
         mapping_json, source_url, active, verified_at, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)
       ON CONFLICT (indicator_key) DO UPDATE SET
         provider = EXCLUDED.provider,
         display_name_ko = EXCLUDED.display_name_ko,
         category = EXCLUDED.category,
         frequency = EXCLUDED.frequency,
         unit = EXCLUDED.unit,
         currency = EXCLUDED.currency,
         mapping_json = EXCLUDED.mapping_json,
         source_url = EXCLUDED.source_url,
         active = EXCLUDED.active,
         verified_at = EXCLUDED.verified_at,
         updated_at = EXCLUDED.updated_at`,
      [
        row.indicatorKey,
        row.provider,
        row.displayNameKo,
        row.category,
        row.frequency,
        row.unit,
        row.currency ?? null,
        JSON.stringify(row.mapping),
        row.sourceUrl,
        row.active ? 1 : 0,
        row.verifiedAt,
        now,
      ]
    );
  }
}

export async function seedDefaultBidScenario(pool: Pool) {
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO bid_cost_scenarios (id, name, base_cost, base_fx, weights_json, risk_weights_json, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$7)
     ON CONFLICT (id) DO NOTHING`,
    [
      DEFAULT_BID_SCENARIO.id,
      DEFAULT_BID_SCENARIO.name,
      DEFAULT_BID_SCENARIO.baseCost,
      DEFAULT_BID_SCENARIO.baseFx,
      JSON.stringify(DEFAULT_BID_SCENARIO.lines),
      JSON.stringify(DEFAULT_BID_SCENARIO.riskWeights),
      now,
    ]
  );
}

export function providerLabel(provider: EconomicProvider): string {
  if (provider === 'ECOS') return 'Bank of Korea ECOS';
  if (provider === 'EIA') return 'U.S. EIA';
  return 'IMF PCPS';
}
