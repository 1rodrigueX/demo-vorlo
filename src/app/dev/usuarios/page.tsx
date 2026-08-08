import { listUsersForDev } from "@/lib/actions/dev-admin";
import { DevUsersManager } from "@/components/dev/DevUsersManager";

export default async function DevUsersPage() {
  // O layout de /dev já barra quem não é dev; listUsersForDev também revalida.
  const users = await listUsersForDev();
  return <DevUsersManager users={users} />;
}
