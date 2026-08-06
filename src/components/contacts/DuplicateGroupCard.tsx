"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Merge, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import { mergeContacts, type DuplicateGroup } from "@/lib/actions/contact-merge";

/**
 * Um grupo de possíveis duplicados. O usuário escolhe quem fica (o principal)
 * e marca quais são o mesmo lead — nada é mesclado sozinho, porque mesmo
 * e-mail ou mesmo nome não provam que é a mesma pessoa.
 */
export function DuplicateGroupCard({ group, tenantSlug }: { group: DuplicateGroup; tenantSlug: string }) {
  // Padrão: o mais antigo fica (tem o histórico mais longo) e os outros são
  // marcados como duplicados — que é o caso comum. Dá pra mudar tudo.
  const [winnerId, setWinnerId] = useState(group.contacts[0].id);
  const [losers, setLosers] = useState(new Set(group.contacts.slice(1).map((c) => c.id)));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function chooseWinner(id: string) {
    setWinnerId(id);
    // Quem virou principal não pode continuar marcado como duplicado dele mesmo.
    setLosers((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function toggleLoser(id: string) {
    setLosers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleMerge() {
    const loserIds = [...losers];
    startTransition(async () => {
      const result = await mergeContacts(winnerId, loserIds);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        loserIds.length === 1 ? "Contato mesclado" : `${loserIds.length} contatos mesclados`,
      );
      router.refresh();
    });
  }

  const label = group.matchType === "email" ? "Mesmo e-mail" : "Mesmo nome";

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2.5">
        <p className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">{label}</span>
          <span className="text-gray-400"> · </span>
          {group.matchValue}
        </p>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {group.contacts.length} contatos
        </span>
      </div>

      <div className="divide-y divide-gray-100">
        {group.contacts.map((contact) => {
          const isWinner = contact.id === winnerId;
          return (
            <div
              key={contact.id}
              className={cn("flex items-center gap-3 px-4 py-3", isWinner && "bg-indigo-50/40")}
            >
              <input
                type="radio"
                name={`winner-${group.matchType}-${group.matchValue}`}
                checked={isWinner}
                onChange={() => chooseWinner(contact.id)}
                disabled={isPending}
                aria-label={`Manter ${contact.name}`}
                className="h-4 w-4 shrink-0 accent-indigo-600"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {contact.name}
                  {isWinner && <span className="ml-2 text-xs font-normal text-indigo-600">principal</span>}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {[contact.phone, contact.email].filter(Boolean).join(" · ") || "sem telefone e sem e-mail"}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {contact.dealCount} {contact.dealCount === 1 ? "negócio" : "negócios"} ·{" "}
                  {contact.messageCount} {contact.messageCount === 1 ? "mensagem" : "mensagens"} · criado em{" "}
                  {new Date(contact.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>

              <Link
                href={`/${tenantSlug}/contacts/${contact.id}`}
                target="_blank"
                className="shrink-0 text-gray-400 hover:text-gray-600"
                aria-label={`Abrir ${contact.name}`}
              >
                <ExternalLink size={14} />
              </Link>

              {!isWinner && (
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={losers.has(contact.id)}
                    onChange={() => toggleLoser(contact.id)}
                    disabled={isPending}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  é o mesmo lead
                </label>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-2.5">
        <p className="text-xs text-gray-500">
          Negócios, mensagens, tarefas, tags e anexos vão para o principal. Os outros são apagados.
        </p>
        <Button size="sm" onClick={handleMerge} disabled={isPending || losers.size === 0}>
          <Merge size={14} />
          {isPending ? "Mesclando..." : `Mesclar ${losers.size || ""}`.trim()}
        </Button>
      </div>
    </Card>
  );
}
