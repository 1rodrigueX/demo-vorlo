"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FinancasTenantForm } from "@/components/dev/FinancasTenantForm";

export function NewFinancasTenantButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus size={16} />
        Novo Controle de Finanças
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Criar novo Controle de Finanças">
        <FinancasTenantForm onSaved={() => setOpen(false)} />
      </Modal>
    </>
  );
}
