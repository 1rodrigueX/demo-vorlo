import { SecurityPanel } from "@/components/dev/SecurityPanel";
import { getSecuritySnapshot } from "@/lib/actions/security";

/**
 * Painel de cibersegurança em tempo real do time Synexa. O layout de /dev já
 * barra quem não é dev; aqui só carrega o estado.
 */
export default async function DevSegurancaPage() {
  const snapshot = await getSecuritySnapshot();

  if ("error" in snapshot) {
    return <p className="text-sm text-gray-600">{snapshot.error}</p>;
  }

  return <SecurityPanel snapshot={snapshot} />;
}
