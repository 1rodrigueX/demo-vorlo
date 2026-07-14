"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CompanyForm } from "@/components/companies/CompanyForm";

export function NewCompanyButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} />
        Nova empresa
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nova empresa">
        <CompanyForm onSaved={() => setOpen(false)} />
      </Modal>
    </>
  );
}
