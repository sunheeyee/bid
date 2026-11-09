import { useCallback, useState } from 'react';
import { api } from '../lib/api';
import type { HelpBoardView, HelpPost, HelpPostListItem } from '../types';

export function useHelpBoard() {
  const [view, setView] = useState<HelpBoardView>('list');
  const [items, setItems] = useState<HelpPostListItem[]>([]);
  const [detail, setDetail] = useState<HelpPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<HelpPostListItem[]>('/api/help-posts');
      setItems(data);
      setView('list');
      setDetail(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<HelpPost>(`/api/help-posts/${id}`);
      setDetail(data);
      setView('detail');
    } catch (err) {
      setError(err instanceof Error ? err.message : '게시물을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (form: FormData) => {
    await api('/api/help-posts', { method: 'POST', body: form });
    await loadList();
  };

  const deletePost = async (id: string) => {
    await api(`/api/help-posts/${id}`, { method: 'DELETE' });
    await loadList();
  };

  return { view, setView, items, detail, loading, error, loadList, loadDetail, createPost, deletePost };
}
