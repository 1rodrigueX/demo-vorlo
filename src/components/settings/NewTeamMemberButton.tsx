"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TeamMemberForm } from "@/components/settings/TeamMemberForm";

export function NewTeamMemberButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <UserPlus size={14} />
        Novo acesso
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Criar acesso de equipe">
        <TeamMemberForm onSaved={() => setOpen(false)} />
      </Modal>
    </>
  );
}
