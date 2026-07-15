import { redirect } from "next/navigation";
import { resolveHomeRoute } from "@/lib/auth/current-user";

export default async function Home() {
  redirect(await resolveHomeRoute());
}
