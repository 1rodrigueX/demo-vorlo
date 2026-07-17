import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { SettingsNavTabs } from "@/components/settings/SettingsNavTabs";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentUser();
  if (!current?.profile) redirect("/dashboard");

  const isAdmin = current.profile.role === "owner" || current.profile.role === "manager";
  if (!isAdmin) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Configurações</h1>
        <p className="mt-1 text-sm text-gray-500">Personalize seu CRM e gerencie sua equipe.</p>
      </div>
      <SettingsNavTabs />
      {children}
    </div>
  );
}
