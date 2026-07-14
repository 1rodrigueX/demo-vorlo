"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createContact, updateContact, type ActionState } from "@/lib/actions/contacts";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import type { Contact } from "@/types/domain";

export function ContactForm({
  contact,
  companies,
  onSaved,
}: {
  contact?: Contact;
  companies: { id: string; name: string }[];
  onSaved?: () => void;
}) {
  const action = contact ? updateContact.bind(null, contact.id) : createContact;
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, null);
  const wasPending = useRef(false);
  const [creatingCompany, setCreatingCompany] = useState(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      onSaved?.();
    }
    wasPending.current = isPending;
  }, [isPending, state, onSaved]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required defaultValue={contact?.name} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={contact?.email ?? ""} />
        </div>
        <div>
          <Label htmlFor="phone">Telefone (WhatsApp)</Label>
          <Input
            id="phone"
            name="phone"
            placeholder="+5511999999999"
            defaultValue={contact?.phone ?? ""}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="leadSource">Origem do lead</Label>
        <Input
          id="leadSource"
          name="leadSource"
          placeholder="Indicação, site, evento..."
          defaultValue={contact?.lead_source ?? ""}
        />
      </div>

      <div className="rounded-lg border border-gray-200 p-3">
        <div className="mb-2 flex items-center justify-between">
          <Label htmlFor="companyId" className="mb-0">
            Empresa
          </Label>
          <button
            type="button"
            onClick={() => setCreatingCompany((v) => !v)}
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            {creatingCompany ? "Escolher empresa existente" : "+ Cadastrar nova empresa"}
          </button>
        </div>

        {creatingCompany ? (
          <div className="space-y-2">
            <Input name="companyName" placeholder="Nome da empresa" required />
            <Input name="companyWebsite" placeholder="Site (opcional)" />
            <Input name="companyNotes" placeholder="Notas (opcional)" />
          </div>
        ) : (
          <Select id="companyId" name="companyId" defaultValue={contact?.company_id ?? ""}>
            <option value="">Nenhuma</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" isLoading={isPending} className="w-full">
        {contact ? "Salvar alterações" : "Criar contato"}
      </Button>
    </form>
  );
}
