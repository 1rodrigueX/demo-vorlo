"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ContactForm } from "@/components/contacts/ContactForm";

export function NewContactButton({ companies }: { companies: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} />
        Novo contato
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo contato">
        <ContactForm companies={companies} onSaved={() => setOpen(false)} />
      </Modal>
    </>
  );
}
