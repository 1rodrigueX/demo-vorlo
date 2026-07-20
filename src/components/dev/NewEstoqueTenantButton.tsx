"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EstoqueTenantForm } from "@/components/dev/EstoqueTenantForm";

export function NewEstoqueTenantButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus size={16} />
        Novo Estoque
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Criar novo Controle de Estoque">
        <EstoqueTenantForm onSaved={() => setOpen(false)} />
      </Modal>
    </>
  );
}
