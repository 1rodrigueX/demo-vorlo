import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserDev } from "@/lib/auth/current-user";
import { DevNavTabs } from "@/components/dev/DevNavTabs";

export default async function DevLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isDev = await isCurrentUserDev();
  if (!isDev) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-panel px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-sm font-bold text-white">
            D
          </div>
          <span className="text-base font-semibold tracking-tight text-gray-900">
            Painel Dev <span className="font-normal text-gray-400">FALA AI.IA</span>
          </span>
        </div>
        <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:underline">
          Ir para meu CRM
        </Link>
      </header>
      <div className="mx-auto max-w-5xl px-6 pt-4">
        <DevNavTabs />
      </div>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  );
}
