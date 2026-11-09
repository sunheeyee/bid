import { useEffect, useState } from 'react';
import { Bot, Check, Copy, FileText, Terminal } from 'lucide-react';
import type { PromptTemplate } from '../types';

interface Props {
  prompts: PromptTemplate[];
  selected: PromptTemplate | null;
  onSelect: (id: string) => void;
  emptyHint?: string;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value || '');
    setDone(true);
    window.setTimeout(() => setDone(false), 1600);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
      aria-label={`${label} 복사`}
    >
      {done ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {done ? '복사 완료' : '복사'}
    </button>
  );
}

export function PromptBox({ prompts, selected, onSelect, emptyHint }: Props) {
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 1600);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (!selected) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-slate-500">
        {emptyHint || '왼쪽에서 단계 2를 선택하면 프롬프트가 표시됩니다.'}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-5">
      {prompts.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {prompts.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
                p.id === selected.id ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {p.title}
            </button>
          ))}
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">{selected.title}</h2>
        {selected.subtitle && <p className="mt-1 text-sm text-slate-400">{selected.subtitle}</p>}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        <section className="rounded-xl border border-slate-800 bg-slatepanel p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="field-label">
              <Bot size={14} className="text-sky-400" /> 에이전트 이름
            </div>
            <CopyButton value={selected.agentName} label="에이전트 이름" />
          </div>
          <input
            readOnly
            value={selected.agentName}
            className="w-full rounded-lg border border-slate-700 bg-night px-3 py-2 text-sm"
          />
        </section>

        <section className="rounded-xl border border-slate-800 bg-slatepanel p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="field-label">
              <FileText size={14} className="text-emerald-400" /> 에이전트 설명
            </div>
            <CopyButton value={selected.agentDescription} label="에이전트 설명" />
          </div>
          <textarea
            readOnly
            rows={3}
            value={selected.agentDescription}
            className="w-full resize-none rounded-lg border border-slate-700 bg-night px-3 py-2 text-sm leading-relaxed"
          />
        </section>

        <section className="rounded-xl border border-amber-500/20 bg-slatepanel p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="field-label text-amber-300">
              <Terminal size={14} /> 프롬프트
            </div>
            <CopyButton value={selected.content} label="프롬프트" />
          </div>
          <textarea
            readOnly
            rows={10}
            value={selected.content}
            className="w-full resize-y rounded-lg border border-slate-700 bg-night px-3 py-2 font-mono text-xs leading-relaxed text-amber-50"
          />
        </section>
      </div>
    </div>
  );
}
