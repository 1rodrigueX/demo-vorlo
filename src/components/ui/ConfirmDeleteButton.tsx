"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ConfirmDeleteButton({
  action,
  confirmMessage,
  label = "Excluir",
}: {
  action: () => Promise<void>;
  confirmMessage: string;
  label?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="danger"
      size="sm"
      isLoading={isPending}
      onClick={() => {
        if (window.confirm(confirmMessage)) {
          startTransition(() => {
            action();
          });
        }
      }}
    >
      <Trash2 size={14} />
      {label}
    </Button>
  );
}
