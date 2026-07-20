"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateDealOwner } from "@/lib/actions/deals";

export function DealOwnerSelect({
  dealId,
  currentOwnerId,
  sellers,
}: {
  dealId: string;
  currentOwnerId: string;
  sellers: { id: string; full_name: string | null }[];
}) {
  const [ownerId, setOwnerId] = useState(currentOwnerId);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newOwnerId = e.target.value;
    const previous = ownerId;
    setOwnerId(newOwnerId);

    startTransition(async () => {
      const result = await updateDealOwner({ dealId, ownerId: newOwnerId });
      if (result?.error) {
        setOwnerId(previous);
        toast.error(result.error);
      }
    });
  }

  return (
    <select
      value={ownerId}
      onChange={handleChange}
      disabled={isPending}
      className="rounded-md border border-gray-200 bg-panel px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
    >
      {sellers.map((s) => (
        <option key={s.id} value={s.id}>
          {s.full_name ?? "Sem nome"}
        </option>
      ))}
    </select>
  );
}
