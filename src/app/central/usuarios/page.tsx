import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTeamMembersWithAccess } from "@/lib/actions/team-access";
import { TeamAccessManager } from "@/components/settings/TeamAccessManager";

export default async function CentralUsuariosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "owner") redirect("/central");

  const members = await getTeamMembersWithAccess();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/central" className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={14} />
          Voltar pra central
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Usuários</h1>
        <p className="mt-1 text-sm text-gray-500">
          Crie acessos pra sua equipe e escolha quais produtos cada um pode ver. CRM é liberado pra todos por padrão.
        </p>

        <div className="mt-6">
          <TeamAccessManager initialMembers={members} />
        </div>
      </div>
    </div>
  );
}
