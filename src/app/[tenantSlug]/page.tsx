import { redirect } from "next/navigation";

export default async function TenantRootPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  redirect(`/${tenantSlug}/dashboard`);
}
