/**
 * Estado de carregamento instantâneo do dashboard. O Next transmite esta tela
 * na hora ao trocar de aba, enquanto a página de destino busca os dados no
 * servidor — sem isso, a navegação parecia "travar" segurando a tela anterior.
 * Esqueleto neutro (título + cards + lista) que serve pra qualquer aba.
 */
export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* cabeçalho */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="h-7 w-48 rounded-lg bg-gray-200" />
        <div className="h-9 w-32 rounded-lg bg-gray-200" />
      </div>

      {/* linha de cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200/80 bg-panel p-4">
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="mt-3 h-6 w-24 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      {/* painel/lista */}
      <div className="rounded-xl border border-gray-200/80 bg-panel p-4">
        <div className="h-4 w-40 rounded bg-gray-200" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-9 w-9 shrink-0 rounded-full bg-gray-200" />
              <div className="h-3 flex-1 rounded bg-gray-200" style={{ maxWidth: `${70 - i * 6}%` }} />
              <div className="h-3 w-14 shrink-0 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
