import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, getAdminToken, setAdminToken } from '../lib/api';
import type { CategoryLevel1, CategoryLevel2, PromptTemplate } from '../types';

export function usePromptStore() {
  const [level1, setLevel1] = useState<CategoryLevel1[]>([]);
  const [level2, setLevel2] = useState<CategoryLevel2[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedL2Id, setSelectedL2Id] = useState<string | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [l1, l2, p, me] = await Promise.all([
        api<CategoryLevel1[]>('/api/categories/level1'),
        api<CategoryLevel2[]>('/api/categories/level2'),
        api<PromptTemplate[]>('/api/prompts'),
        api<{ admin: boolean }>('/api/auth/me'),
      ]);
      setLevel1(l1);
      setLevel2(l2);
      setPrompts(p);
      setIsAdmin(me.admin);
      setSelectedL2Id((cur) => cur ?? l2.find((x) => x.viewType !== 'board')?.id ?? l2[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = async (password: string) => {
    const result = await api<{ token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    setAdminToken(result.token);
    setIsAdmin(true);
  };

  const logout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      setAdminToken(null);
      setIsAdmin(false);
    }
  };

  const promptsForL2 = useCallback(
    (id: string | null) => prompts.filter((p) => p.categoryLevel2Id === id),
    [prompts]
  );

  const selectedL2 = level2.find((x) => x.id === selectedL2Id) ?? null;
  const currentPrompts = promptsForL2(selectedL2Id);
  const selectedPrompt =
    currentPrompts.find((p) => p.id === selectedPromptId) ?? currentPrompts[0] ?? null;

  useEffect(() => {
    if (selectedL2?.viewType === 'board') {
      setSelectedPromptId(null);
      return;
    }
    if (selectedPrompt && selectedPrompt.categoryLevel2Id === selectedL2Id) return;
    setSelectedPromptId(currentPrompts[0]?.id ?? null);
  }, [selectedL2Id, selectedL2?.viewType, selectedPrompt, currentPrompts]);

  const searchHits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [] as PromptTemplate[];
    return prompts.filter((p) =>
      [p.title, p.subtitle, p.agentName, p.agentDescription, p.content, p.tags.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [prompts, searchQuery]);

  useEffect(() => {
    if (!searchQuery.trim() || !searchHits[0]) return;
    const first = searchHits[0];
    setSelectedL2Id(first.categoryLevel2Id);
    setSelectedPromptId(first.id);
  }, [searchQuery, searchHits]);

  const highlightedL2 = new Set(searchHits.map((p) => p.categoryLevel2Id));

  return {
    level1,
    level2,
    prompts,
    loading,
    error,
    refresh,
    isAdmin,
    hasToken: Boolean(getAdminToken()),
    login,
    logout,
    selectedL2Id,
    setSelectedL2Id,
    selectedL2,
    selectedPrompt,
    selectedPromptId,
    setSelectedPromptId,
    currentPrompts,
    searchQuery,
    setSearchQuery,
    highlightedL2,
    promptsForL2,
  };
}
