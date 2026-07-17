import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { ContactForm } from "@/components/contacts/ContactForm";
import { ContactAttachments } from "@/components/contacts/ContactAttachments";
import { ContactTagPicker } from "@/components/contacts/ContactTagPicker";
import { ContactTimeline, type TimelineEntry } from "@/components/contacts/ContactTimeline";
import { ContactRealtimeListener } from "@/components/contacts/ContactRealtimeListener";
import { ActivityComposer } from "@/components/contacts/ActivityComposer";
import { WhatsAppChatPanel } from "@/components/contacts/WhatsAppChatPanel";
import { NewDealModal } from "@/components/contacts/NewDealModal";
import { DealStageSelect } from "@/components/contacts/DealStageSelect";
import { DealWonButton } from "@/components/contacts/DealWonButton";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";
import { deleteContact } from "@/lib/actions/contacts";
import { formatCurrency } from "@/lib/utils/currency";
import type { WhatsAppMessage } from "@/types/domain";

const ATTACHMENTS_BUCKET = "contact-attachments";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}) {
  const { tenantSlug, id } = await params;
  const supabase = await createClient();

  const [
    { data: contact },
    { data: companies },
    { data: deals },
    { data: stages },
    { data: activities },
    { data: whatsappMessages },
    { data: attachmentRows },
    { data: allTags },
    { data: contactTagRows },
  ] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", id).single(),
    supabase.from("companies").select("id, name").order("name"),
    supabase
      .from("deals")
      .select("id, title, value, status, stage_id")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("pipeline_stages").select("*").order("position"),
    supabase
      .from("activities")
      .select(
        "id, type, body, direction, created_at, profile:profiles(full_name), whatsapp_message:whatsapp_messages(status)",
      )
      .eq("contact_id", id)
      .neq("type", "whatsapp")
      .order("created_at", { ascending: false }),
    supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("contact_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("contact_attachments")
      .select("id, file_name, storage_path, size_bytes, created_at")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("tags").select("*").order("name"),
    supabase.from("contact_tags").select("tag_id").eq("contact_id", id),
  ]);

  if (!contact) notFound();

  // Bucket é privado — gera URL assinada com o client de service role (o
  // client comum não tem policy de storage.objects, só o RLS de metadados
  // acima, que já garante que o usuário pode ver esses anexos).
  const admin = createAdminClient();
  const attachments = await Promise.all(
    (attachmentRows ?? []).map(async (a) => {
      const { data: signed } = await admin.storage
        .from(ATTACHMENTS_BUCKET)
        .createSignedUrl(a.storage_path, 60 * 60);
      return {
        id: a.id,
        fileName: a.file_name,
        sizeBytes: a.size_bytes,
        createdAt: a.created_at,
        url: signed?.signedUrl ?? null,
      };
    }),
  );

  return (
    <div className="mx-auto max-w-6xl">
      <ContactRealtimeListener contactId={id} />

      <Link
        href={`/${tenantSlug}/contacts`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> Contatos
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Dados do contato</h2>
            <ContactForm contact={contact} companies={companies ?? []} />
            <div className="mt-4 border-t border-gray-100 pt-4">
              <h3 className="mb-2 text-xs font-semibold text-gray-500">Tags</h3>
              <ContactTagPicker
                contactId={contact.id}
                allTags={allTags ?? []}
                selectedTagIds={(contactTagRows ?? []).map((t) => t.tag_id)}
              />
            </div>
            <div className="mt-4 border-t border-gray-100 pt-4">
              <ContactAttachments contactId={contact.id} attachments={attachments} />
            </div>
            <div className="mt-4 border-t border-gray-100 pt-4">
              <ConfirmDeleteButton
                action={deleteContact.bind(null, contact.id)}
                confirmMessage={`Excluir o contato "${contact.name}"? Essa ação não pode ser desfeita.`}
              />
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Briefcase size={14} /> Negócios ({deals?.length ?? 0})
              </h2>
              <NewDealModal contactId={contact.id} stages={stages ?? []} />
            </div>
            {!deals?.length ? (
              <p className="text-sm text-gray-500">Nenhum negócio vinculado ainda.</p>
            ) : (
              <ul className="space-y-2">
                {deals.map((deal) => (
                  <li key={deal.id} className="rounded-md border border-gray-100 px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-medium text-gray-900">
                        {deal.title}
                      </p>
                      <span className="shrink-0 text-sm font-medium text-gray-700">
                        {formatCurrency(Number(deal.value))}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <DealStageSelect
                        dealId={deal.id}
                        currentStageId={deal.stage_id}
                        stages={stages ?? []}
                      />
                      <DealWonButton dealId={deal.id} initialStatus={deal.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          <WhatsAppChatPanel
            contactId={contact.id}
            initialMessages={(whatsappMessages ?? []) as WhatsAppMessage[]}
            hasPhone={!!contact.phone}
          />
        </div>
      </div>

      <Card className="mt-6 p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Atividades</h2>
        <div className="mb-5">
          <ActivityComposer contactId={contact.id} />
        </div>
        <ContactTimeline entries={(activities ?? []) as unknown as TimelineEntry[]} />
      </Card>
    </div>
  );
}
