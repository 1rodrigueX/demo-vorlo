import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listMfaFactors } from "@/lib/actions/mfa";
import { MfaSettingsCard } from "@/components/settings/MfaSettingsCard";

export default async function CentralSecurityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const factors = await listMfaFactors();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/central" className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={14} />
          Voltar pra central
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Segurança da conta</h1>
        <p className="mt-1 text-sm text-gray-500">Protege o acesso à sua conta com uma camada extra além da senha.</p>

        <div className="mt-6">
          <MfaSettingsCard initialFactors={factors} />
        </div>
      </div>
    </div>
  );
}
