"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ShieldCheck } from "lucide-react";
import {
  createTeamMemberWithAccess,
  deleteTeamMember,
  toggleProductAccess,
  getTeamMembersWithAccess,
  type ActionState,
  type TeamMemberWithAccess,
} from "@/lib/actions/team-access";
import { TOGGLEABLE_PRODUCTS, PRODUCT_LABEL, type ToggleableProduct } from "@/lib/team/products";
import { ROLE_LABEL } from "@/lib/utils/roles";

function inputClass() {
  return "rounded-md border border-gray-300 bg-panel px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500";
}

function NewMemberForm({ onCreated }: { onCreated: () => void }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createTeamMemberWithAccess, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
      toast.success("Usuário criado");
      onCreated();
    }
    wasPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3 rounded-xl border border-gray-200 bg-panel p-4">
      <p className="text-sm font-medium text-gray-900">Novo usuário</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input name="fullName" placeholder="Nome completo" required className={inputClass()} />
        <input name="email" type="email" placeholder="Email" required className={inputClass()} />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input name="password" type="password" placeholder="Senha inicial (mín. 8)" minLength={8} required className={inputClass()} />
        <select name="role" defaultValue="member" className={inputClass()}>
          <option value="member">Vendedor (membro)</option>
          <option value="manager">Gestor</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        Cor no pipeline
        <input
          name="color"
          type="color"
          defaultValue="#6366f1"
          className="h-8 w-12 cursor-pointer rounded border border-gray-300 bg-panel p-0.5"
        />
      </label>

      <div>
        <p className="mb-1.5 text-xs font-medium text-gray-500">Acesso aos produtos (CRM sempre incluso)</p>
        <div className="flex flex-wrap gap-3">
          {TOGGLEABLE_PRODUCTS.map((product) => (
            <label key={product} className="flex items-center gap-1.5 text-sm text-gray-700">
              <input type="checkbox" name={`product_${product}`} className="rounded border-gray-300" />
              {PRODUCT_LABEL[product]}
            </label>
          ))}
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Plus size={14} />
        {isPending ? "Criando..." : "Criar usuário"}
      </button>
    </form>
  );
}

function ProductToggle({
  profileId,
  product,
  checked,
}: {
  profileId: string;
  product: ToggleableProduct;
  checked: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    startTransition(async () => {
      const result = await toggleProductAccess(profileId, product, next);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <label className="flex items-center gap-1.5 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.checked)}
        className="rounded border-gray-300"
      />
      {PRODUCT_LABEL[product]}
    </label>
  );
}

function MemberRow({ member, onChanged }: { member: TeamMemberWithAccess; onChanged: () => void }) {
  const [isDeleting, startDelete] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Remover o acesso de "${member.full_name}"? A conta de login é apagada.`)) return;
    startDelete(async () => {
      const result = await deleteTeamMember(member.id);
      if (result?.error) toast.error(result.error);
      else onChanged();
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-panel p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: member.color }}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">{member.full_name}</p>
            <p className="truncate text-xs text-gray-500">{member.email}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
            {ROLE_LABEL[member.role] ?? member.role}
          </span>
          {member.role !== "owner" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-gray-400 transition-colors hover:text-red-500 disabled:opacity-50"
              aria-label={`Remover ${member.full_name}`}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 border-t border-gray-100 pt-3">
        {member.role === "owner" ? (
          <p className="flex items-center gap-1.5 text-xs text-gray-500">
            <ShieldCheck size={12} />
            Dono — acesso total a todos os produtos
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {TOGGLEABLE_PRODUCTS.map((product) => (
              <ProductToggle
                key={product}
                profileId={member.id}
                product={product}
                checked={member.products.includes(product)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function TeamAccessManager({ initialMembers }: { initialMembers: TeamMemberWithAccess[] }) {
  const [members, setMembers] = useState(initialMembers);
  const [isRefreshing, startRefresh] = useTransition();

  function refresh() {
    startRefresh(async () => {
      const data = await getTeamMembersWithAccess();
      setMembers(data);
    });
  }

  return (
    <div className="space-y-4">
      <NewMemberForm onCreated={refresh} />
      {isRefreshing && <p className="text-xs text-gray-400">Atualizando...</p>}
      <div className="space-y-3">
        {members.map((m) => (
          <MemberRow key={m.id} member={m} onChanged={refresh} />
        ))}
        {members.length === 0 && <p className="text-sm text-gray-500">Nenhum usuário ainda.</p>}
      </div>
    </div>
  );
}
