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

      <details className="rounded-lg border border-gray-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">
          Dados para o Bling (opcional)
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <Label htmlFor="cpfCnpj">CPF/CNPJ</Label>
            <Input id="cpfCnpj" name="cpfCnpj" defaultValue={contact?.cpf_cnpj ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="addressZip">CEP</Label>
              <Input id="addressZip" name="addressZip" defaultValue={contact?.address_zip ?? ""} />
            </div>
            <div>
              <Label htmlFor="addressState">UF</Label>
              <Input
                id="addressState"
                name="addressState"
                maxLength={2}
                defaultValue={contact?.address_state ?? ""}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="addressCity">Cidade</Label>
              <Input id="addressCity" name="addressCity" defaultValue={contact?.address_city ?? ""} />
            </div>
            <div>
              <Label htmlFor="addressNeighborhood">Bairro</Label>
              <Input
                id="addressNeighborhood"
                name="addressNeighborhood"
                defaultValue={contact?.address_neighborhood ?? ""}
              />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div>
              <Label htmlFor="addressStreet">Endereço</Label>
              <Input
                id="addressStreet"
                name="addressStreet"
                defaultValue={contact?.address_street ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="addressNumber">Número</Label>
              <Input
                id="addressNumber"
                name="addressNumber"
                defaultValue={contact?.address_number ?? ""}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="addressComplement">Complemento</Label>
            <Input
              id="addressComplement"
              name="addressComplement"
              defaultValue={contact?.address_complement ?? ""}
            />
          </div>
        </div>
      </details>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" isLoading={isPending} className="w-full">
        {contact ? "Salvar alterações" : "Criar contato"}
      </Button>
    </form>
  );
}
