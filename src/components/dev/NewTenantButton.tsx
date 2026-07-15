"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TenantForm } from "@/components/dev/TenantForm";

export function NewTenantButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} />
        Novo CRM
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Criar novo CRM">
        <TenantForm onSaved={() => setOpen(false)} />
      </Modal>
    </>
  );
}
