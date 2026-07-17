"use client";

import { useParams } from "next/navigation";

/** Lê o slug do tenant a partir da URL — disponível em qualquer client component dentro de /[tenantSlug]/... */
export function useTenantSlug(): string {
  const params = useParams<{ tenantSlug: string }>();
  return params.tenantSlug;
}
