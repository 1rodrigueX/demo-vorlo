import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { CompanyForm } from "@/components/companies/CompanyForm";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";
import { deleteCompany } from "@/lib/actions/companies";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}) {
  const { tenantSlug, id } = await params;
  const supabase = await createClient();

  const [{ data: company }, { data: contacts }] = await Promise.all([
    supabase.from("companies").select("*").eq("id", id).single(),
    supabase
      .from("contacts")
      .select("id, name, email, phone")
      .eq("company_id", id)
      .order("name"),
  ]);

  if (!company) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/${tenantSlug}/companies`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> Empresas
      </Link>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Dados da empresa</h2>
          <CompanyForm company={company} />
          <div className="mt-4 border-t border-gray-100 pt-4">
            <ConfirmDeleteButton
              action={deleteCompany.bind(null, company.id)}
              confirmMessage={`Excluir a empresa "${company.name}"? Essa ação não pode ser desfeita.`}
            />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            Contatos vinculados ({contacts?.length ?? 0})
          </h2>
          {!contacts?.length ? (
            <p className="text-sm text-gray-500">Nenhum contato vinculado a esta empresa.</p>
          ) : (
            <ul className="space-y-2">
              {contacts.map((contact) => (
                <li key={contact.id}>
                  <Link
                    href={`/${tenantSlug}/contacts/${contact.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50"
                  >
                    <User size={14} className="text-gray-400" />
                    <span className="font-medium text-gray-900">{contact.name}</span>
                    <span className="text-gray-400">
                      {contact.phone || contact.email || ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
