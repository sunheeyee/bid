import { useState } from 'react';
import { Hexagon, LayoutDashboard, Search, ShieldAlert, Terminal } from 'lucide-react';
import type { AppViewMode } from '../types';
import { CategoryTree } from './CategoryTree';
import { PromptBox } from './PromptBox';
import { HelpBoard } from './HelpBoard';
import { EconomicDashboard } from './dashboard/EconomicDashboard';
import { LoginModal } from './LoginModal';
import { AdminEditor } from './AdminEditor';
import type { usePromptStore } from '../hooks/usePromptStore';

type Store = ReturnType<typeof usePromptStore>;

export function MainLayout({ store }: { store: Store }) {
  const [view, setView] = useState<AppViewMode>('dashboard');
  const [loginOpen, setLoginOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col bg-night">
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-800 bg-slatepanel/90 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600/20 text-sky-300">
            <Hexagon size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold tracking-[0.18em] text-sky-400">POSCO STEELEON</div>
            <div className="text-sm font-semibold leading-tight">구매 입찰 지원 시스템</div>
          </div>
        </div>
        <nav className="ml-4 flex rounded-lg bg-night p-1">
          <button
            onClick={() => setView('dashboard')}
            className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm ${view === 'dashboard' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
          >
            <LayoutDashboard size={14} /> 경제지표
          </button>
          <button
            onClick={() => setView('prompts')}
            className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm ${view === 'prompts' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
          >
            <Terminal size={14} /> 프롬프트 관리
          </button>
        </nav>
        {view === 'prompts' && (
          <div className="relative ml-auto w-72">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              value={store.searchQuery}
              onChange={(e) => store.setSearchQuery(e.target.value)}
              placeholder="프롬프트 검색"
              className="w-full rounded-lg border border-slate-700 bg-night py-2 pl-8 pr-3 text-sm"
            />
          </div>
        )}
        <div className={`${view === 'prompts' ? '' : 'ml-auto'} flex items-center gap-2`}>
          {store.isAdmin ? (
            <>
              <button onClick={() => setAdminOpen(true)} className="rounded-lg border border-sky-500/40 px-3 py-1.5 text-xs text-sky-200">
                관리
              </button>
              <button onClick={() => void store.logout()} className="rounded-lg px-3 py-1.5 text-xs text-slate-400">
                로그아웃
              </button>
            </>
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200"
            >
              <ShieldAlert size={12} /> 관리자 로그인
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {view === 'dashboard' ? (
          <EconomicDashboard isAdmin={store.isAdmin} />
        ) : (
          <>
            <CategoryTree
              level1={store.level1}
              level2={store.level2}
              selectedL2Id={store.selectedL2Id}
              onSelect={store.setSelectedL2Id}
              highlightedL2={store.highlightedL2}
            />
            <main className="min-w-0 flex-1 overflow-hidden">
              {store.loading && <div className="p-6 text-sm text-slate-400">불러오는 중…</div>}
              {store.error && <div className="p-6 text-sm text-rose-300">{store.error}</div>}
              {!store.loading && store.selectedL2?.viewType === 'board' && (
                <HelpBoard key={store.selectedL2.id} title={store.selectedL2.name} isAdmin={store.isAdmin} />
              )}
              {!store.loading && store.selectedL2?.viewType !== 'board' && (
                <PromptBox
                  prompts={store.currentPrompts}
                  selected={store.selectedPrompt}
                  onSelect={store.setSelectedPromptId}
                  emptyHint={store.level1.length === 0 ? '카테고리가 없습니다. 관리자에서 단계 1을 생성하세요.' : '이 단계에 프롬프트가 없습니다.'}
                />
              )}
            </main>
          </>
        )}
      </div>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onLogin={store.login} />
      <AdminEditor
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        level1={store.level1}
        level2={store.level2}
        prompts={store.prompts}
        onChanged={store.refresh}
      />
    </div>
  );
}
