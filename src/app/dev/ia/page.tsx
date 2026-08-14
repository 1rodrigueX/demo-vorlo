import { redirect } from "next/navigation";
import { getPlatformAiConfigForForm } from "@/lib/actions/platform-ai-config";
import { PlatformAiConfigForm } from "@/components/dev/PlatformAiConfigForm";

export default async function DevIaPage() {
  const config = await getPlatformAiConfigForForm();
  if (!config) redirect("/dev");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Inteligência Artificial</h1>
        <p className="mt-1 text-sm text-gray-500">
          Chave da plataforma que banca o Vorlo em todo tenant. Cada tenant tem a própria chave
          separada (BYO) pros demais agentes — essa aqui é só a da plataforma.
        </p>
      </div>
      <PlatformAiConfigForm config={config} />
    </div>
  );
}
