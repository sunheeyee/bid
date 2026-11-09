export interface CategoryLevel1 {
  id: string;
  name: string;
  sortOrder: number;
}

export interface CategoryLevel2 {
  id: string;
  parentId: string;
  name: string;
  description?: string;
  sortOrder: number;
  viewType: 'prompt' | 'board';
}

export interface PromptTemplate {
  id: string;
  categoryLevel2Id: string;
  title: string;
  subtitle: string;
  agentName: string;
  agentDescription: string;
  content: string;
  tags: string[];
}

export type AppViewMode = 'dashboard' | 'prompts';

export type HelpBoardView = 'list' | 'detail' | 'create';

export interface HelpPost {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  attachments: HelpAttachment[];
}

export interface HelpPostListItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  attachmentCount: number;
}

export interface HelpAttachment {
  id: string;
  postId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export type EconomicProvider = 'ECOS' | 'EIA' | 'IMF';
export type EconomicFrequency = 'daily' | 'monthly' | 'other';
export type EconomicCategory =
  | 'inflation'
  | 'fx'
  | 'interest_rate'
  | 'energy'
  | 'nonferrous_metal'
  | 'steel_proxy';

export interface NormalizedIndicatorPoint {
  indicatorKey: string;
  provider: EconomicProvider;
  indicatorName: string;
  category: EconomicCategory;
  period: string;
  frequency: EconomicFrequency;
  value: number;
  unit: string;
  currency?: string;
  sourceTimestamp: string;
  fetchedAt: string;
  sourceReference: string;
  isEstimated: boolean;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export type DataFreshness = 'ok' | 'stale' | 'missing' | 'error';

export interface IndicatorChangeSet {
  m1: number | null;
  m3: number | null;
  m6: number | null;
  m12: number | null;
}

export interface IndicatorAverages {
  d30: number | null;
  d90: number | null;
  m3: number | null;
  m6: number | null;
}

export interface IndicatorSummary {
  key: string;
  displayName: string;
  provider: EconomicProvider;
  providerLabel: string;
  category: EconomicCategory;
  frequency: EconomicFrequency;
  unit: string;
  currency?: string;
  latest: NormalizedIndicatorPoint | null;
  changes: IndicatorChangeSet;
  averages: IndicatorAverages;
  status: DataFreshness;
  sourceReference: string;
  staleNote?: string;
}

export interface SeriesPayload {
  key: string;
  displayName: string;
  provider: EconomicProvider;
  frequency: EconomicFrequency;
  unit: string;
  points: NormalizedIndicatorPoint[];
}

export interface FactorItem {
  name: string;
  key: string;
  contributionPct: number | null;
}

export interface ExecutiveSummaryPayload {
  estimatedCostChangePct: number | null;
  riskLevel: RiskLevel | null;
  riskRule: string;
  topUp: FactorItem[];
  topDown: FactorItem[];
  asOf: {
    oldestCorePeriod: string | null;
    oldestCoreName: string | null;
    newestCorePeriod: string | null;
    fetchedAt: string | null;
  };
  status: 'ok' | 'partial' | 'error';
  missing: string[];
  weightSum: number;
  weightWarning: string | null;
}

export interface BidCostLineInput {
  id: string;
  name: string;
  weightPct: number;
  indicatorKeys: string[];
}

export interface BidCostScenario {
  id: string;
  name: string;
  baseCost: number | null;
  baseFx: number | null;
  lines: BidCostLineInput[];
  riskWeights: {
    commodity: number;
    fx: number;
    ppi: number;
    rates: number;
  };
}

export interface BidCostLineResult {
  id: string;
  name: string;
  weightPct: number;
  indicatorKeys: string[];
  itemChangePct: number | null;
  contributionPct: number | null;
  commodityEffect: number | null;
  fxEffect: number | null;
  combinedKrwEffect: number | null;
  status: 'ok' | 'partial' | 'incomplete';
  note?: string;
}

export interface BidCostCalculation {
  scenario: BidCostScenario;
  totalChangePct: number | null;
  estimatedCost: number | null;
  riskLevel: RiskLevel | null;
  riskRule: string;
  weightSum: number;
  weightWarning: string | null;
  lines: BidCostLineResult[];
  ranked: BidCostLineResult[];
  status: 'ok' | 'partial' | 'incomplete';
}

export interface EconomicDashboardPayload {
  summary: ExecutiveSummaryPayload;
  indicators: IndicatorSummary[];
  series: Record<string, SeriesPayload>;
  bidCost: BidCostCalculation;
  catalogVerifiedAt: string;
  providerStatus: Record<EconomicProvider, { status: DataFreshness; message?: string }>;
}
