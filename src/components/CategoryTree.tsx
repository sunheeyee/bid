import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FolderTree, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { CategoryLevel1, CategoryLevel2 } from '../types';

interface Props {
  level1: CategoryLevel1[];
  level2: CategoryLevel2[];
  selectedL2Id: string | null;
  onSelect: (id: string) => void;
  highlightedL2: Set<string>;
}

export function CategoryTree({ level1, level2, selectedL2Id, onSelect, highlightedL2 }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    return [...level1]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((l1) => ({
        ...l1,
        children: level2.filter((l2) => l2.parentId === l1.id).sort((a, b) => a.sortOrder - b.sortOrder),
      }));
  }, [level1, level2]);

  if (collapsed) {
    return (
      <aside className="flex w-12 flex-col items-center border-r border-slate-800 bg-slatepanel/80 py-3">
        <button onClick={() => setCollapsed(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" title="사이드바 펼치기">
          <PanelLeftOpen size={18} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-slate-800 bg-slatepanel/80">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <FolderTree size={14} />
          카테고리
        </div>
        <button onClick={() => setCollapsed(true)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white" title="사이드바 접기">
          <PanelLeftClose size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {grouped.length === 0 && (
          <p className="px-3 py-6 text-sm text-slate-500">등록된 단계가 없습니다. 관리자에서 단계 1을 생성하세요.</p>
        )}
        {grouped.map((l1) => {
          const expanded = open[l1.id] !== false;
          return (
            <div key={l1.id} className="mb-1">
              <button
                onClick={() => setOpen((s) => ({ ...s, [l1.id]: !expanded }))}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-200 hover:bg-slate-800/80"
              >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {l1.name}
              </button>
              {expanded && (
                <div className="ml-4 border-l border-slate-700 pl-2">
                  {l1.children.length === 0 && (
                    <p className="px-2 py-2 text-xs text-slate-500">하위 단계 없음</p>
                  )}
                  {l1.children.map((l2) => {
                    const active = selectedL2Id === l2.id;
                    const hit = highlightedL2.has(l2.id);
                    return (
                      <button
                        key={l2.id}
                        onClick={() => onSelect(l2.id)}
                        className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm ${
                          active
                            ? 'bg-sky-600/20 text-sky-200 ring-1 ring-sky-500/40'
                            : hit
                              ? 'bg-amber-500/10 text-amber-200'
                              : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div>{l2.name}</div>
                        {l2.viewType === 'board' && (
                          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-amber-300/80">게시판</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
