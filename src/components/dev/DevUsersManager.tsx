"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Search, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { deleteUserAsDev, type DevUserRow } from "@/lib/actions/dev-admin";

const ROLE_LABEL: Record<string, string> = { owner: "Dono", manager: "Gestor", member: "Vendedor" };

export function DevUsersManager({ users }: { users: DevUserRow[] }) {
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.email, u.full_name, u.tenant_name, u.tenant_slug].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [users, query]);

  function handleDelete(user: DevUserRow) {
    const label = user.full_name || user.email;
    const warning = user.role === "owner"
      ? `"${label}" é DONO do CRM ${user.tenant_name ?? ""}. Donos não são excluídos por aqui — use "Excluir" na aba Empresas pra apagar o CRM inteiro.`
      : `Excluir o usuário "${label}"? O login é removido e os registros dele no CRM passam para o dono da empresa. Não tem volta.`;
    if (!window.confirm(warning)) return;

    setDeletingId(user.id);
    startTransition(async () => {
      const result = await deleteUserAsDev(user.id);
      setDeletingId(null);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Usuário excluído.");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Usuários</h1>
        <p className="mt-1 text-sm text-gray-500">{users.length} usuários na plataforma.</p>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, e-mail ou empresa"
          className="pl-9"
        />
      </div>

      {!filtered.length ? (
        <Card className="p-8 text-center text-sm text-gray-500">Nenhum usuário encontrado.</Card>
      ) : (
        <Card className="divide-y divide-gray-100 overflow-hidden">
          {filtered.map((user) => (
            <div key={user.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-gray-900">{user.full_name || "(sem nome)"}</p>
                  {user.is_dev && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-2 py-0.5 text-[11px] font-medium text-white">
                      <ShieldCheck size={11} /> Dev
                    </span>
                  )}
                  {user.role && (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                      {ROLE_LABEL[user.role] ?? user.role}
                    </span>
                  )}
                  {user.tenant_name && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                      {user.tenant_name}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-gray-500">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(user)}
                disabled={isPending && deletingId === user.id}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={14} />
                {isPending && deletingId === user.id ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
