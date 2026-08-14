"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ErpTenantForm } from "@/components/dev/ErpTenantForm";

export function NewErpTenantButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus size={16} />
        Novo ERP
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Criar novo ERP standalone">
        <ErpTenantForm onSaved={() => setOpen(false)} />
      </Modal>
    </>
  );
}
