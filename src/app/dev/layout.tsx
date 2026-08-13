import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserDev, resolveHomeRoute } from "@/lib/auth/current-user";
import { logout } from "@/lib/actions/auth";
import { DevNavTabs } from "@/components/dev/DevNavTabs";

export default async function DevLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isDev = await isCurrentUserDev();
  const homeRoute = await resolveHomeRoute();
  if (!isDev) redirect(homeRoute);

  return (
    <div className="min-h-screen bg-gray-200">
      <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-panel px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-sm font-bold text-white">
            D
          </div>
          <span className="text-base font-semibold tracking-tight text-gray-900">
            Painel Dev <span className="font-normal text-gray-400">Vorlo</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href={homeRoute} className="text-sm font-medium text-indigo-600 hover:underline">
            Ir para meu CRM
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              <LogOut size={15} />
              Sair
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 pt-4">
        <DevNavTabs />
      </div>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  );
}
