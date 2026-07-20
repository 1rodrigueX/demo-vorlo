import Link from "next/link";
import { User, Tag as TagIcon, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { NewContactButton } from "@/components/contacts/NewContactButton";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function ContactsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { tenantSlug } = await params;
  const { q, tag: tagId } = await searchParams;
  const supabase = await createClient();

  const [{ data: companies }, { data: tags }, currentUser] = await Promise.all([
    supabase.from("companies").select("id, name").order("name"),
    supabase.from("tags").select("*").order("name"),
    getCurrentUser(),
  ]);

  let contactIdsWithTag: string[] | null = null;
  if (tagId) {
    const { data: taggedRows } = await supabase.from("contact_tags").select("contact_id").eq("tag_id", tagId);
    contactIdsWithTag = (taggedRows ?? []).map((r) => r.contact_id);
  }

  let contactsQuery = supabase
    .from("contacts")
    .select("id, name, email, phone, lead_source, company:companies(id, name), contact_tags(tag:tags(id, name, color))")
    .order("created_at", { ascending: false });
  if (q) contactsQuery = contactsQuery.ilike("name", `%${q}%`);
  if (contactIdsWithTag) contactsQuery = contactsQuery.in("id", contactIdsWithTag.length ? contactIdsWithTag : ["-"]);

  const { data: contacts } = await contactsQuery;

  const mySellerTagId = currentUser?.profile?.seller_tag_id ?? null;
  const activeTag = (tags ?? []).find((t) => t.id === tagId);

  const filterQuery = new URLSearchParams();
  if (q) filterQuery.set("q", q);
  const clearTagHref = `/${tenantSlug}/contacts${filterQuery.toString() ? `?${filterQuery.toString()}` : ""}`;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-900">Contatos</h1>
        <NewContactButton companies={companies ?? []} />
      </div>

      <form className="mb-3 flex flex-wrap items-center gap-2">
        <Input name="q" placeholder="Buscar por nome..." defaultValue={q ?? ""} className="max-w-xs" />
        <select
          name="tag"
          defaultValue={tagId ?? ""}
          className="rounded-md border border-gray-300 bg-panel px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todas as tags</option>
          {(tags ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.id === mySellerTagId ? " (minha tag)" : ""}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-gray-300 bg-panel px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Filtrar
        </button>
        {mySellerTagId && (
          <Link
            href={`/${tenantSlug}/contacts?tag=${mySellerTagId}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className="flex items-center gap-1.5 rounded-md bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            <TagIcon size={14} />
            Meus leads
          </Link>
        )}
      </form>

      {activeTag && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
          <span>
            Filtrando por: <span className="font-medium" style={{ color: activeTag.color }}>{activeTag.name}</span>
          </span>
          <Link href={clearTagHref} className="flex items-center gap-0.5 text-gray-400 hover:text-gray-600">
            <X size={13} />
            limpar
          </Link>
        </div>
      )}

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
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <User size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{contact.name}</p>
                <p className="truncate text-xs text-gray-500">
                  {[contact.phone, contact.email, contact.company?.name]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {contact.contact_tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {contact.contact_tags.map(({ tag }) =>
                      tag ? (
                        <span
                          key={tag.id}
                          className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ) : null,
                    )}
                  </div>
                )}
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
