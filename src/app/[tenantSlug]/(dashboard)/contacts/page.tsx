import Link from "next/link";
import { User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { NewContactButton } from "@/components/contacts/NewContactButton";

export default async function ContactsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { tenantSlug } = await params;
  const { q } = await searchParams;
  const supabase = await createClient();

  const [{ data: companies }, contactsQuery] = await Promise.all([
    supabase.from("companies").select("id, name").order("name"),
    (async () => {
      let query = supabase
        .from("contacts")
        .select("id, name, email, phone, lead_source, company:companies(id, name)")
        .order("created_at", { ascending: false });
      if (q) query = query.ilike("name", `%${q}%`);
      return query;
    })(),
  ]);

  const contacts = contactsQuery.data;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-900">Contatos</h1>
        <NewContactButton companies={companies ?? []} />
      </div>

      <form className="mb-4">
        <Input name="q" placeholder="Buscar por nome..." defaultValue={q ?? ""} />
      </form>

      {!contacts?.length ? (
        <Card className="p-8 text-center text-sm text-gray-500">
          Nenhum contato encontrado.
        </Card>
      ) : (
        <Card className="divide-y divide-gray-100">
          {contacts.map((contact) => (
            <Link
              key={contact.id}
              href={`/${tenantSlug}/contacts/${contact.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <User size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{contact.name}</p>
                <p className="truncate text-xs text-gray-500">
                  {[contact.phone, contact.email, contact.company?.name]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {contact.lead_source && (
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {contact.lead_source}
                </span>
              )}
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
