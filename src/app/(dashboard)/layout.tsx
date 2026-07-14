import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { AssistantChatPanel } from "@/components/assistant/AssistantChatPanel";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentUser();

  if (!current) {
    redirect("/login");
  }

  const name = current.profile?.full_name || current.user.email || "Usuário";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar name={name} email={current.user.email ?? ""} />
        <main className="flex-1 bg-gray-50 p-4 md:p-6">{children}</main>
      </div>
      <AssistantChatPanel />
    </div>
  );
}
