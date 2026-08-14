import Link from "next/link";
import { redirect } from "next/navigation";
import { User, Tag as TagIcon, X, Copy } from "lucide-react";
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
  searchParams: Promise<{ q?: string; tag?: string; vendedor?: string }>;
}) {
  const { tenantSlug } = await params;
  const { q, tag: tagId, vendedor } = await searchParams;
  const supabase = await createClient();
  const currentUser = await getCurrentUser();

  // Vendedor comum já só enxerga os próprios contatos via RLS
  // (contacts_select_own_or_admin) — o filtro só faz sentido pra quem vê a
  // base inteira. Mesmo critério do filtro do Pipeline.
  const profile = currentUser?.profile ?? null;
  if (!profile) redirect("/login");
  const tenantId = profile.tenant_id;
  const isAdmin = profile.role === "owner" || profile.role === "manager";

  const [{ data: companies }, { data: tags }] = await Promise.all([
    supabase.from("companies").select("id, name").eq("tenant_id", tenantId).order("name"),
    supabase.from("tags").select("*").eq("tenant_id", tenantId).order("name"),
  ]);

  const { data: sellers } = isAdmin
    ? await supabase.from("profiles").select("id, full_name").eq("tenant_id", tenantId).order("full_name")
    : { data: [] as { id: string; full_name: string | null }[] };

  let contactIdsWithTag: string[] | null = null;
  if (tagId) {
    const { data: taggedRows } = await supabase
      .from("contact_tags")
      .select("contact_id")
      .eq("tag_id", tagId)
      .eq("tenant_id", tenantId);
    contactIdsWithTag = (taggedRows ?? []).map((r) => r.contact_id);
  }

  let contactsQuery = supabase
    .from("contacts")
    .select<{
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      lead_source: string | null;
      company: { id: string; name: string } | null;
      contact_tags: { tag: { id: string; name: string; color: string } | null }[];
    }>("id, name, email, phone, lead_source, company:companies(id, name), contact_tags(tag:tags(id, name, color))")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (q) contactsQuery = contactsQuery.ilike("name", `%${q}%`);
  if (contactIdsWithTag) contactsQuery = contactsQuery.in("id", contactIdsWithTag.length ? contactIdsWithTag : ["-"]);
  if (isAdmin && vendedor) contactsQuery = contactsQuery.eq("created_by", vendedor);

  const { data: contacts } = await contactsQuery;

  const mySellerTagId = currentUser?.profile?.seller_tag_id ?? null;
  const activeTag = (tags ?? []).find((t) => t.id === tagId);
  const activeSeller = (sellers ?? []).find((s) => s.id === vendedor);

  // "limpar" tira os filtros mas preserva a busca por nome, que é o que o
  // usuário digitou e não quer perder.
  const filterQuery = new URLSearchParams();
  if (q) filterQuery.set("q", q);
  const clearFiltersHref = `/${tenantSlug}/contacts${filterQuery.toString() ? `?${filterQuery.toString()}` : ""}`;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-900">Contatos</h1>
        <div className="flex items-center gap-3">
          <Link
            href={`/${tenantSlug}/contacts/duplicados`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <Copy size={14} />
            Duplicados
          </Link>
          <NewContactButton companies={companies ?? []} />
        </div>
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
        {isAdmin && (sellers ?? []).length > 0 && (
          <select
            name="vendedor"
            defaultValue={vendedor ?? ""}
            className="rounded-md border border-gray-300 bg-panel px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos os vendedores</option>
            {(sellers ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name ?? "Sem nome"}
              </option>
            ))}
          </select>
        )}
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

      {(activeTag || activeSeller) && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
          <span>
            Filtrando por:{" "}
            {activeTag && (
              <span className="font-medium" style={{ color: activeTag.color }}>
                {activeTag.name}
              </span>
            )}
            {activeTag && activeSeller && " · "}
            {activeSeller && (
              <span className="font-medium text-gray-900">{activeSeller.full_name ?? "Sem nome"}</span>
            )}
          </span>
          <Link href={clearFiltersHref} className="flex items-center gap-0.5 text-gray-400 hover:text-gray-600">
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
