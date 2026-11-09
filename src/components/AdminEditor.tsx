import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api';
import type { CategoryLevel1, CategoryLevel2, PromptTemplate } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  level1: CategoryLevel1[];
  level2: CategoryLevel2[];
  prompts: PromptTemplate[];
  onChanged: () => Promise<void>;
}

export function AdminEditor({ open, onClose, level1, level2, prompts, onChanged }: Props) {
  const [tab, setTab] = useState<'stages' | 'prompts'>('stages');
  const [message, setMessage] = useState<string | null>(null);
  const [l1Name, setL1Name] = useState('');
  const [l2Name, setL2Name] = useState('');
  const [l2Desc, setL2Desc] = useState('');
  const [l2Parent, setL2Parent] = useState(level1[0]?.id ?? '');
  const promptL2Options = useMemo(() => level2.filter((x) => x.viewType !== 'board'), [level2]);
  const [promptForm, setPromptForm] = useState({
    id: '',
    title: '',
    subtitle: '',
    categoryLevel2Id: promptL2Options[0]?.id ?? '',
    agentName: '',
    agentDescription: '',
    content: '',
  });

  if (!open) return null;

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2500);
  };

  const childCount = (id: string) => level2.filter((x) => x.parentId === id).length;
  const promptCount = (id: string) => prompts.filter((p) => p.categoryLevel2Id === id).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slatepanel shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
          <h2 className="text-sm font-semibold">관리자</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-2 border-b border-slate-800 px-5 py-2">
          <button onClick={() => setTab('stages')} className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'stages' ? 'bg-sky-600' : 'bg-slate-800'}`}>
            단계 관리
          </button>
          <button onClick={() => setTab('prompts')} className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'prompts' ? 'bg-sky-600' : 'bg-slate-800'}`}>
            프롬프트 관리
          </button>
          <button
            onClick={async () => {
              if (!window.confirm('카테고리와 시드 프롬프트를 초기 상태로 되돌릴까요? 도움말 게시물은 유지됩니다.')) return;
              await api('/api/prompts/reset', { method: 'POST' });
              await onChanged();
              notify('시드 데이터로 리셋했습니다.');
            }}
            className="ml-auto rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs text-amber-200"
          >
            DB 초기 데이터로 리셋
          </button>
        </div>
        {message && <p className="px-5 pt-3 text-xs text-emerald-300">{message}</p>}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'stages' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <section>
                <h3 className="mb-3 text-sm font-semibold">단계 1</h3>
                <div className="mb-3 flex gap-2">
                  <input value={l1Name} onChange={(e) => setL1Name(e.target.value)} placeholder="새 단계 1 이름" className="flex-1 rounded-lg border border-slate-700 bg-night px-3 py-2 text-sm" />
                  <button
                    onClick={async () => {
                      await api('/api/categories/level1', { method: 'POST', body: JSON.stringify({ name: l1Name, sortOrder: level1.length + 1 }) });
                      setL1Name('');
                      await onChanged();
                    }}
                    className="rounded-lg bg-sky-600 px-3 text-sm"
                  >
                    추가
                  </button>
                </div>
                <ul className="space-y-2">
                  {level1.map((l1) => (
                    <li key={l1.id} className="rounded-lg border border-slate-800 p-3 text-sm">
                      <input
                        defaultValue={l1.name}
                        onBlur={async (e) => {
                          const name = e.target.value.trim();
                          if (name && name !== l1.name) {
                            await api(`/api/categories/level1/${l1.id}`, { method: 'PUT', body: JSON.stringify({ name }) });
                            await onChanged();
                          }
                        }}
                        className="mb-2 w-full rounded bg-night px-2 py-1"
                      />
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>하위 {childCount(l1.id)}개</span>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              await api(`/api/categories/level1/${l1.id}`, { method: 'PUT', body: JSON.stringify({ sortOrder: l1.sortOrder - 1 }) });
                              await onChanged();
                            }}
                          >
                            위로
                          </button>
                          <button
                            disabled={childCount(l1.id) > 0}
                            onClick={async () => {
                              await api(`/api/categories/level1/${l1.id}`, { method: 'DELETE' });
                              await onChanged();
                            }}
                            className="text-rose-300 disabled:opacity-30"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="mb-3 text-sm font-semibold">단계 2</h3>
                <div className="mb-3 space-y-2">
                  <select value={l2Parent} onChange={(e) => setL2Parent(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-night px-3 py-2 text-sm">
                    {level1.map((l1) => (
                      <option key={l1.id} value={l1.id}>
                        {l1.name}
                      </option>
                    ))}
                  </select>
                  <input value={l2Name} onChange={(e) => setL2Name(e.target.value)} placeholder="새 단계 2 이름" className="w-full rounded-lg border border-slate-700 bg-night px-3 py-2 text-sm" />
                  <input value={l2Desc} onChange={(e) => setL2Desc(e.target.value)} placeholder="설명" className="w-full rounded-lg border border-slate-700 bg-night px-3 py-2 text-sm" />
                  <button
                    onClick={async () => {
                      await api('/api/categories/level2', {
                        method: 'POST',
                        body: JSON.stringify({ name: l2Name, parentId: l2Parent, description: l2Desc, sortOrder: 99 }),
                      });
                      setL2Name('');
                      setL2Desc('');
                      await onChanged();
                    }}
                    className="rounded-lg bg-sky-600 px-3 py-2 text-sm"
                  >
                    단계 2 추가
                  </button>
                </div>
                <ul className="space-y-2">
                  {level2.map((l2) => (
                    <li key={l2.id} className="rounded-lg border border-slate-800 p-3 text-sm">
                      <div className="font-medium">
                        {l2.name} {l2.viewType === 'board' && <span className="text-[10px] text-amber-300">BOARD</span>}
                      </div>
                      <p className="text-xs text-slate-500">{l2.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <select
                          defaultValue={l2.parentId}
                          onChange={async (e) => {
                            await api(`/api/categories/level2/${l2.id}`, { method: 'PUT', body: JSON.stringify({ parentId: e.target.value }) });
                            await onChanged();
                          }}
                          className="rounded bg-night px-2 py-1"
                        >
                          {level1.map((l1) => (
                            <option key={l1.id} value={l1.id}>
                              {l1.name}
                            </option>
                          ))}
                        </select>
                        <span className="text-slate-400">프롬프트 {promptCount(l2.id)}건</span>
                        <button
                          disabled={promptCount(l2.id) > 0}
                          onClick={async () => {
                            try {
                              await api(`/api/categories/level2/${l2.id}`, { method: 'DELETE' });
                              await onChanged();
                            } catch (err) {
                              notify(err instanceof Error ? err.message : '삭제할 수 없습니다.');
                            }
                          }}
                          className="text-rose-300 disabled:opacity-30"
                          title={l2.viewType === 'board' ? '게시물이 남아 있으면 삭제되지 않습니다.' : ''}
                        >
                          삭제
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
          {tab === 'prompts' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <section>
                <h3 className="mb-3 text-sm font-semibold">프롬프트 목록</h3>
                <ul className="space-y-2">
                  {prompts.map((p) => (
                    <li key={p.id} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-sm">
                      <button
                        onClick={() =>
                          setPromptForm({
                            id: p.id,
                            title: p.title,
                            subtitle: p.subtitle,
                            categoryLevel2Id: p.categoryLevel2Id,
                            agentName: p.agentName,
                            agentDescription: p.agentDescription,
                            content: p.content,
                          })
                        }
                        className="text-left"
                      >
                        {p.title}
                      </button>
                      <button
                        onClick={async () => {
                          await api(`/api/prompts/${p.id}`, { method: 'DELETE' });
                          await onChanged();
                        }}
                        className="text-xs text-rose-300"
                      >
                        삭제
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="space-y-2">
                <h3 className="mb-3 text-sm font-semibold">{promptForm.id ? '프롬프트 수정' : '새 프롬프트'}</h3>
                <select
                  value={promptForm.categoryLevel2Id}
                  onChange={(e) => setPromptForm({ ...promptForm, categoryLevel2Id: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-night px-3 py-2 text-sm"
                >
                  {promptL2Options.map((l2) => (
                    <option key={l2.id} value={l2.id}>
                      {l2.name}
                    </option>
                  ))}
                </select>
                <input value={promptForm.title} onChange={(e) => setPromptForm({ ...promptForm, title: e.target.value })} placeholder="제목" className="w-full rounded-lg border border-slate-700 bg-night px-3 py-2 text-sm" />
                <input value={promptForm.agentName} onChange={(e) => setPromptForm({ ...promptForm, agentName: e.target.value })} placeholder="1. 에이전트 이름" className="w-full rounded-lg border border-slate-700 bg-night px-3 py-2 text-sm" />
                <textarea value={promptForm.agentDescription} onChange={(e) => setPromptForm({ ...promptForm, agentDescription: e.target.value })} placeholder="2. 에이전트 설명" rows={3} className="w-full rounded-lg border border-slate-700 bg-night px-3 py-2 text-sm" />
                <textarea value={promptForm.content} onChange={(e) => setPromptForm({ ...promptForm, content: e.target.value })} placeholder="3. 프롬프트 복사용 원문" rows={8} className="w-full rounded-lg border border-slate-700 bg-night px-3 py-2 font-mono text-xs" />
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const payload = {
                        title: promptForm.title,
                        subtitle: promptForm.subtitle,
                        categoryLevel2Id: promptForm.categoryLevel2Id,
                        agentName: promptForm.agentName,
                        agentDescription: promptForm.agentDescription,
                        content: promptForm.content,
                      };
                      if (promptForm.id) await api(`/api/prompts/${promptForm.id}`, { method: 'PUT', body: JSON.stringify(payload) });
                      else await api('/api/prompts', { method: 'POST', body: JSON.stringify(payload) });
                      await onChanged();
                      notify('저장했습니다.');
                    }}
                    className="rounded-lg bg-sky-600 px-4 py-2 text-sm"
                  >
                    저장
                  </button>
                  <button
                    onClick={() =>
                      setPromptForm({
                        id: '',
                        title: '',
                        subtitle: '',
                        categoryLevel2Id: promptL2Options[0]?.id ?? '',
                        agentName: '',
                        agentDescription: '',
                        content: '',
                      })
                    }
                    className="rounded-lg bg-slate-800 px-4 py-2 text-sm"
                  >
                    새로 작성
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
