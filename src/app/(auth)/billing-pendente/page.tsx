import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function BillingPendentePage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (!current.profile) redirect("/central");

  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, slug, status, pending_payment_url")
    .eq("id", current.profile.tenant_id)
    .single();

  if (tenant?.status !== "suspended") redirect("/central");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-panel p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Acesso suspenso por falta de pagamento</h1>
        <p className="mt-2 text-sm text-gray-600">
          A mensalidade da <strong>{tenant.name}</strong> não foi confirmada dentro do prazo e o acesso ao CRM foi
          suspenso. Regularize o pagamento pra voltar a usar normalmente.
        </p>
        {tenant.pending_payment_url ? (
          <a
            href={tenant.pending_payment_url}
            className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Regularizar pagamento
          </a>
        ) : (
          <p className="mt-6 text-xs text-gray-400">
            Aguarde o próximo e-mail de cobrança ou entre em contato com o suporte.
          </p>
        )}
      </div>
    </div>
  );
}
