import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { Card } from "@/components/ui/Card";
import { NewCompanyButton } from "@/components/companies/NewCompanyButton";

export default async function CompaniesPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = user ? await requireTenantId(supabase, user.id) : null;
  if (!tenantId) redirect("/login");

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, website, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Empresas</h1>
          <p className="mt-1 text-sm text-gray-500">{companies?.length ?? 0} empresas cadastradas.</p>
        </div>
        <NewCompanyButton />
      </div>

      {!companies?.length ? (
        <Card className="p-8 text-center text-sm text-gray-500">
          Nenhuma empresa cadastrada ainda.
        </Card>
      ) : (
        <Card className="divide-y divide-gray-100 overflow-hidden">
          {companies.map((company) => (
            <Link
              key={company.id}
              href={`/${tenantSlug}/companies/${company.id}`}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Building2 size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{company.name}</p>
                {company.website && (
                  <p className="truncate text-xs text-gray-500">{company.website}</p>
                )}
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
