/** Esqueleto do workspace do lead (info · conversa · atividades) enquanto os
 * dados carregam — mantém a lista de conversas e o layout no lugar. */
export default function LeadWorkspaceLoading() {
  return (
    <div className="flex h-full animate-pulse gap-3">
      <div className="hidden w-72 shrink-0 rounded-2xl border border-gray-200 bg-panel p-4 xl:block">
        <div className="h-4 w-32 rounded bg-gray-200" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3 w-full rounded bg-gray-200" style={{ maxWidth: `${85 - i * 8}%` }} />
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-panel">
        <div className="border-b border-gray-200 px-4 py-3">
          <div className="h-4 w-40 rounded bg-gray-200" />
        </div>
        <div className="flex-1 space-y-3 p-4">
          {[60, 78, 45, 70, 52].map((w, i) => (
            <div key={i} className={i % 2 ? "flex justify-end" : "flex justify-start"}>
              <div className="h-9 rounded-2xl bg-gray-200" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 p-3">
          <div className="h-10 w-full rounded-2xl bg-gray-200" />
        </div>
      </div>

      <div className="hidden w-80 shrink-0 rounded-2xl border border-gray-200 bg-panel p-4 lg:block">
        <div className="h-4 w-28 rounded bg-gray-200" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 w-full rounded bg-gray-200" style={{ maxWidth: `${80 - i * 6}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
