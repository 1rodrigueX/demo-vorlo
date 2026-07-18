"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TransportadoraTenantForm } from "@/components/dev/TransportadoraTenantForm";

export function NewTransportadoraTenantButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus size={16} />
        Nova Transportadora
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Criar nova Transportadora">
        <TransportadoraTenantForm onSaved={() => setOpen(false)} />
      </Modal>
    </>
  );
}
