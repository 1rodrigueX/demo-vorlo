import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DuplicateGroupCard } from "@/components/contacts/DuplicateGroupCard";
import { MergeAllByEmailButton } from "@/components/contacts/MergeAllByEmailButton";
import { listDuplicateGroups } from "@/lib/actions/contact-merge";

/**
 * Revisão de duplicados. Só entra aqui o que precisa de decisão humana —
 * telefone repetido é impedido pelo índice único desde 0070_contact_dedupe.
 */
export default async function DuplicateContactsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const groups = await listDuplicateGroups();
  const emailGroupCount = groups.filter((group) => group.matchType === "email").length;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link
          href={`/${tenantSlug}/contacts`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={14} />
          Contatos
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Duplicados</h1>
          <MergeAllByEmailButton groupCount={emailGroupCount} />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Contatos com o mesmo e-mail ou o mesmo nome. Telefone repetido já é bloqueado no cadastro, então o
          que aparece aqui pode ser duplicata de verdade — ou pessoas diferentes da mesma empresa. Confira
          antes de mesclar.
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Grupos por <span className="font-medium">nome</span> não têm mesclagem em massa de propósito: nome
          igual não prova mesma pessoa, e juntar dois clientes distintos leva o histórico de conversa dos dois
          junto.
        </p>
      </div>

      {!groups.length ? (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <CheckCircle2 size={22} className="text-emerald-500" />
          <p className="text-sm font-medium text-gray-900">Nenhum duplicado para revisar</p>
          <p className="text-sm text-gray-500">Seus contatos estão sem repetição de e-mail ou de nome.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <DuplicateGroupCard
              key={`${group.matchType}-${group.matchValue}`}
              group={group}
              tenantSlug={tenantSlug}
            />
          ))}
        </div>
      )}
    </div>
  );
}
