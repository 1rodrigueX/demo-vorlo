import Link from "next/link";
import { notFound } from "next/navigation";
import { SquarePen, Building2, Phone, Mail, Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LeadConversationPanel } from "@/components/whatsapp/LeadConversationPanel";
import { LeadSidePanel } from "@/components/whatsapp/LeadSidePanel";
import { LeadResumoCard } from "@/components/whatsapp/LeadResumoCard";
import { ContactTagPicker } from "@/components/contacts/ContactTagPicker";
import { DealStageSelect } from "@/components/contacts/DealStageSelect";
import { ContactOwnerSelect } from "@/components/contacts/ContactOwnerSelect";
import { DealProdutosSection } from "@/components/contacts/DealProdutosSection";
import type { TimelineEntry } from "@/components/contacts/ContactTimeline";
import { CHANNEL_ORDER, type ChannelKey } from "@/components/whatsapp/channelMeta";
import { getLeadTasks } from "@/lib/actions/lead-tasks";
import { getDealProdutosForDeals } from "@/lib/actions/deal-produtos";
import { getEstoqueItens } from "@/lib/actions/estoque";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatCurrency } from "@/lib/utils/currency";
import type { WhatsAppMessage } from "@/types/domain";

export default async function WhatsAppConversationPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; contactId: string }>;
}) {
  const { tenantSlug, contactId } = await params;
  const supabase = await createClient();

  const [
    { data: contact },
    { data: companies },
    { data: deals },
    { data: stages },
    { data: activities },
    { data: messages },
    { data: allTags },
    { data: contactTagRows },
    { data: channelRows },
    currentUser,
    tasks,
  ] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", contactId).single(),
    supabase.from("companies").select("id, name").order("name"),
    supabase
      .from("deals")
      .select("id, title, value, status, stage_id, owner_id, proposal_sent_at")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false }),
    supabase.from("pipeline_stages").select("*").order("position"),
    supabase
      .from("activities")
      .select(
        "id, type, body, direction, created_at, profile:profiles(full_name), whatsapp_message:whatsapp_messages(status)",
      )
      .eq("contact_id", contactId)
      .neq("type", "whatsapp")
      .order("created_at", { ascending: false }),
    supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: true }),
    supabase.from("tags").select("*").order("name"),
    supabase.from("contact_tags").select("tag_id").eq("contact_id", contactId),
    supabase.from("lead_channels").select("channel").eq("contact_id", contactId),
    getCurrentUser(),
    getLeadTasks(contactId),
  ]);

  if (!contact) notFound();

  const leadChannelSet = new Set((channelRows ?? []).map((c) => c.channel));
  const channels = CHANNEL_ORDER.filter((c) => leadChannelSet.has(c)) as ChannelKey[];

  const primaryDeal = (deals ?? []).find((d) => d.status === "open") ?? deals?.[0] ?? null;
  const companyName = companies?.find((c) => c.id === contact.company_id)?.name ?? null;
  const isAdmin = currentUser?.profile?.role === "owner" || currentUser?.profile?.role === "manager";
  const { data: sellers } = await supabase.from("profiles").select("id, full_name").order("full_name");
  const ownerName = sellers?.find((s) => s.id === contact.created_by)?.full_name ?? null;

  const { data: hasEstoqueRaw } = await supabase.rpc("current_tenant_has_estoque", {
    p_user_id: currentUser?.user.id,
  });
  const hasEstoque = Boolean(hasEstoqueRaw);
  const [dealProdutosByDealId, estoqueItens] =
    hasEstoque && primaryDeal
      ? await Promise.all([getDealProdutosForDeals([primaryDeal.id]), getEstoqueItens()])
      : [{} as Record<string, Awaited<ReturnType<typeof getDealProdutosForDeals>>[string]>, []];

  const dealForPanel = primaryDeal
    ? {
        id: primaryDeal.id,
        value: Number(primaryDeal.value),
        status: primaryDeal.status,
        proposalSentAt: primaryDeal.proposal_sent_at,
      }
    : null;

  return (
    <div className="flex h-full gap-3">
      {/* COLUNA 1 — Informações do lead */}
      <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto rounded-2xl border border-gray-200 bg-panel xl:flex">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Informações do lead</h2>
          <Link
            href={`/${tenantSlug}/contacts/${contact.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-500 hover:text-indigo-400"
          >
            <SquarePen size={12} /> Editar
          </Link>
        </div>

        <div className="space-y-3 px-4 py-3">
          <InfoRow icon={Building2} label="Empresa" value={companyName} />
          <InfoRow icon={Phone} label="Telefone" value={contact.phone} />
          <InfoRow icon={Mail} label="E-mail" value={contact.email} />
          <InfoRow icon={Radio} label="Origem" value={contact.lead_source} />

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Responsável</p>
            {isAdmin && sellers && sellers.length > 0 ? (
              <ContactOwnerSelect contactId={contact.id} currentOwnerId={contact.created_by} sellers={sellers} />
            ) : (
              <p className="text-sm text-gray-700">{ownerName ?? "—"}</p>
            )}
          </div>

          {primaryDeal && (
            <>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Etapa do funil</p>
                <DealStageSelect dealId={primaryDeal.id} currentStageId={primaryDeal.stage_id} stages={stages ?? []} />
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Valor potencial</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(Number(primaryDeal.value))}</p>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-gray-200 px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Tags</p>
          <ContactTagPicker
            contactId={contact.id}
            allTags={allTags ?? []}
            selectedTagIds={(contactTagRows ?? []).map((t) => t.tag_id)}
          />
        </div>

        {hasEstoque && primaryDeal && (
          <div className="border-t border-gray-200 px-4 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Produtos de interesse
            </p>
            <DealProdutosSection
              dealId={primaryDeal.id}
              initialProdutos={dealProdutosByDealId[primaryDeal.id] ?? []}
              estoqueItens={estoqueItens}
            />
          </div>
        )}

        <div className="border-t border-gray-200 px-4 py-3">
          <LeadResumoCard contactId={contact.id} />
        </div>
      </aside>

      {/* COLUNA 2 — Conversa (chat + cabeçalho omnichannel) */}
      <div className="min-w-0 flex-1">
        <LeadConversationPanel
          tenantSlug={tenantSlug}
          contact={contact}
          channels={channels}
          initialMessages={(messages ?? []) as WhatsAppMessage[]}
          deal={dealForPanel}
        />
      </div>

      {/* COLUNA 3 — Atividades / Tarefas / Notas */}
      <aside className="hidden w-80 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-panel lg:block">
        <LeadSidePanel
          contactId={contact.id}
          entries={(activities ?? []) as unknown as TimelineEntry[]}
          initialTasks={tasks}
        />
      </aside>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="mt-0.5 shrink-0 text-gray-400" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <p className="truncate text-sm text-gray-700">{value || "—"}</p>
      </div>
    </div>
  );
}
