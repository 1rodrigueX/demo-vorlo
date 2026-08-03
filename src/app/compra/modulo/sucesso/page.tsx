import { redirect } from "next/navigation";
import { isModuleKey } from "@/lib/billing/modules";
import { ModuleSuccessPoller } from "@/components/billing/ModuleSuccessPoller";

export default async function ModuloSucessoPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  if (!isModuleKey(m)) redirect("/central");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <ModuleSuccessPoller module={m} />
    </div>
  );
}
