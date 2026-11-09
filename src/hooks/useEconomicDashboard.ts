import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { BidCostScenario, EconomicDashboardPayload } from '../types';

export function useEconomicDashboard() {
  const [data, setData] = useState<EconomicDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await api<EconomicDashboardPayload>('/api/economic/dashboard');
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : '대시보드를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveScenario = async (scenario: BidCostScenario) => {
    await api('/api/economic/bid-cost', { method: 'PUT', body: JSON.stringify(scenario) });
    const calc = await api<EconomicDashboardPayload['bidCost']>('/api/economic/bid-cost/calculate', {
      method: 'POST',
      body: JSON.stringify(scenario),
    });
    setData((prev) => (prev ? { ...prev, bidCost: calc, summary: { ...prev.summary, estimatedCostChangePct: calc.totalChangePct, riskLevel: calc.riskLevel, weightSum: calc.weightSum, weightWarning: calc.weightWarning } } : prev));
    return calc;
  };

  const forceRefresh = async () => {
    await api('/api/economic/refresh', { method: 'POST' });
    await refresh();
  };

  return { data, loading, error, refresh, saveScenario, forceRefresh };
}
