"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ProducaoTenantForm } from "@/components/dev/ProducaoTenantForm";

export function NewProducaoTenantButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus size={16} />
        Novo Controle de Produção
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Criar novo Controle de Produção">
        <ProducaoTenantForm onSaved={() => setOpen(false)} />
      </Modal>
    </>
  );
}
