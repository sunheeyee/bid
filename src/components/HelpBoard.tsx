import { useEffect, useState } from 'react';
import { ArrowLeft, Paperclip, Plus, Trash2, Upload } from 'lucide-react';
import { useHelpBoard } from '../hooks/useHelpBoard';

interface Props {
  title: string;
  isAdmin: boolean;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function HelpBoard({ title, isAdmin }: Props) {
  const board = useHelpBoard();
  const [titleInput, setTitleInput] = useState('');
  const [bodyInput, setBodyInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void board.loadList();
  }, [board.loadList]);

  const confirmDelete = async (id: string) => {
    if (!window.confirm('이 게시물과 첨부파일을 삭제할까요?')) return;
    await board.deletePost(id);
  };

  const submit = async () => {
    if (!titleInput.trim()) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('title', titleInput.trim());
      form.append('body', bodyInput);
      files.forEach((f) => form.append('files[]', f));
      await board.createPost(form);
      setTitleInput('');
      setBodyInput('');
      setFiles([]);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '등록에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden p-5">
      {board.view === 'list' && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-xs text-slate-400">게시물 {board.items.length}건</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => board.setView('create')}
                className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium hover:bg-sky-500"
              >
                <Plus size={14} /> 새 글
              </button>
            )}
          </div>
          {board.loading && <p className="text-sm text-slate-400">불러오는 중…</p>}
          {board.error && <p className="text-sm text-rose-400">{board.error}</p>}
          {!board.loading && !board.error && board.items.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
              <p className="text-slate-300">등록된 참고 문서가 없습니다.</p>
              {isAdmin ? (
                <>
                  <p className="mt-2 text-sm text-slate-500">새 글을 작성해 주세요.</p>
                  <button
                    onClick={() => board.setView('create')}
                    className="mt-4 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium"
                  >
                    첫 글 등록
                  </button>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-500">관리자로 로그인하면 첫 글을 등록할 수 있습니다.</p>
              )}
            </div>
          )}
          {board.items.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3">제목</th>
                    <th className="px-4 py-3">첨부</th>
                    <th className="px-4 py-3">등록일</th>
                    {isAdmin && <th className="px-4 py-3">관리</th>}
                  </tr>
                </thead>
                <tbody>
                  {board.items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <button onClick={() => board.loadDetail(item.id)} className="text-left text-sky-300 hover:underline">
                          {item.title}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {item.attachmentCount > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <Paperclip size={12} /> {item.attachmentCount}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(item.createdAt)}</td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <button onClick={() => confirmDelete(item.id)} className="text-rose-300 hover:text-rose-200">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {board.view === 'detail' && board.detail && (
        <div className="overflow-y-auto">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => board.loadList()} className="inline-flex items-center gap-1 text-sm text-slate-300 hover:text-white">
              <ArrowLeft size={14} /> 목록
            </button>
            {isAdmin && (
              <button onClick={() => confirmDelete(board.detail!.id)} className="inline-flex items-center gap-1 text-sm text-rose-300">
                <Trash2 size={14} /> 삭제
              </button>
            )}
          </div>
          <h2 className="text-xl font-semibold">{board.detail.title}</h2>
          <p className="mt-1 text-xs text-slate-400">{formatDate(board.detail.createdAt)}</p>
          <pre className="mt-6 whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-200">{board.detail.body}</pre>
          {board.detail.attachments.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-2 text-sm font-semibold text-slate-300">첨부파일</h3>
              <ul className="space-y-2">
                {board.detail.attachments.map((f) => (
                  <li key={f.id}>
                    <a
                      href={`/api/help-posts/${board.detail!.id}/attachments/${f.id}`}
                      className="inline-flex items-center gap-2 text-sm text-sky-300 hover:underline"
                    >
                      <Paperclip size={14} />
                      {f.originalName}
                      <span className="text-slate-500">({formatSize(f.sizeBytes)})</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {board.view === 'create' && isAdmin && (
        <div className="overflow-y-auto">
          <button
            onClick={() => {
              if (titleInput || bodyInput || files.length) {
                if (!window.confirm('작성을 취소하고 목록으로 돌아갈까요?')) return;
              }
              board.setView('list');
            }}
            className="mb-4 inline-flex items-center gap-1 text-sm text-slate-300"
          >
            <ArrowLeft size={14} /> 목록
          </button>
          <div className="space-y-4">
            <div>
              <label className="field-label mb-1">제목</label>
              <input
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-night px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="field-label mb-1">내용</label>
              <textarea
                rows={10}
                value={bodyInput}
                onChange={(e) => setBodyInput(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-night px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="field-label mb-1">
                <Upload size={12} /> 첨부파일
              </label>
              <input
                type="file"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                className="block w-full text-xs text-slate-400"
              />
              {files.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-slate-300">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center justify-between">
                      <span>
                        {f.name} ({formatSize(f.size)})
                      </span>
                      <button type="button" onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-rose-300">
                        제거
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              disabled={busy || !titleInput.trim()}
              onClick={() => void submit()}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              등록
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
