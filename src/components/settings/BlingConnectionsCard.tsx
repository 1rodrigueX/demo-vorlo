"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, Copy, ExternalLink, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import {
  createBlingConnection,
  updateBlingCredentials,
  setBlingConnectionTag,
  setBlingConnectionSeller,
  disconnectBlingConnection,
  deleteBlingConnection,
  type ActionState,
} from "@/lib/actions/bling";
import type { BlingConnection, Tag } from "@/types/domain";

type Member = { id: string; full_name: string | null; role: string };
type SellerMapping = { bling_connection_id: string; profile_id: string; bling_vendedor_id: string };
type BlingVendedor = { id: string; nome: string };

function BlingSellerMappingSection({
  connectionId,
  members,
  mappings,
}: {
  connectionId: string;
  members: Member[];
  mappings: SellerMapping[];
}) {
  const [open, setOpen] = useState(false);
  const [vendedores, setVendedores] = useState<BlingVendedor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const isLoading = open && !vendedores && !error;

  useEffect(() => {
    if (!open || vendedores || error) return;
    fetch(`/api/bling/${connectionId}/vendedores`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setVendedores(data.vendedores ?? []);
      })
      .catch(() => setError("Falha ao buscar vendedores no Bling"));
  }, [open, vendedores, error, connectionId]);

  function handleChange(profileId: string, vendedorId: string) {
    const vendedorName = vendedores?.find((v) => v.id === vendedorId)?.nome ?? "";
    startSaving(async () => {
      const result = await setBlingConnectionSeller(connectionId, profileId, vendedorId, vendedorName);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
      >
        <Users size={13} />
        Mapear vendedores do Bling
        <ChevronDown size={13} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      <p className="mt-1 text-[11px] text-gray-400">
        Liga cada vendedor da equipe a um vendedor já cadastrado no Bling, pra refletir lá quem atendeu o cliente.
      </p>

      {open && (
        <div className="mt-2 space-y-2">
          {isLoading && <p className="text-xs text-gray-400">Buscando vendedores no Bling...</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
          {vendedores &&
            members.map((member) => {
              const current = mappings.find((m) => m.profile_id === member.id)?.bling_vendedor_id ?? "";
              return (
                <div key={member.id} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-700">{member.full_name || "Sem nome"}</span>
                  <Select
                    className="w-48"
                    defaultValue={current}
                    disabled={isSaving}
                    onChange={(e) => handleChange(member.id, e.target.value)}
                  >
                    <option value="">Nenhum vínculo</option>
                    {vendedores.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nome}
                      </option>
                    ))}
                  </Select>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

function BlingConnectionRow({
  connection,
  tags,
  members,
  sellerMappings,
  siteUrl,
}: {
  connection: BlingConnection;
  tags: Tag[];
  members: Member[];
  sellerMappings: SellerMapping[];
  siteUrl: string;
}) {
  const boundUpdate = updateBlingCredentials.bind(null, connection.id);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(boundUpdate, null);
  const [isWorking, startWorking] = useTransition();
  const router = useRouter();
  const wasPending = useRef(false);

  const isConnected = !!connection.access_token;
  const redirectUri = `${siteUrl}/api/bling/callback`;

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      toast.success("Credenciais salvas");
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  function handleDisconnect() {
    startWorking(async () => {
      const result = await disconnectBlingConnection(connection.id);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    startWorking(async () => {
      const result = await deleteBlingConnection(connection.id);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleTagChange(tagId: string) {
    startWorking(async () => {
      const result = await setBlingConnectionTag(connection.id, tagId || null);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{connection.name}</span>
          {connection.is_default && (
            <Badge className="bg-gray-100 text-gray-600">Padrão</Badge>
          )}
          {isConnected ? (
            <Badge className="bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={11} className="mr-1" /> Conectado
            </Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-600">Desconectado</Badge>
          )}
        </div>
        {!connection.is_default && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isWorking}
            className="text-gray-400 hover:text-red-600"
            aria-label={`Excluir conexão ${connection.name}`}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <div className="mb-3">
        <Label htmlFor={`tag-${connection.id}`}>Tag que roteia contatos pra esta filial</Label>
        <Select
          id={`tag-${connection.id}`}
          defaultValue={connection.tag_id ?? ""}
          onChange={(e) => handleTagChange(e.target.value)}
          disabled={isWorking}
        >
          <option value="">Nenhuma (só a conexão padrão recebe)</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-gray-500">
          Criada automaticamente com o nome desta conexão — troque aqui só se quiser usar outra tag.
        </p>
      </div>

      {isConnected ? (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Conectado com sucesso</span>
            <Button type="button" variant="secondary" size="sm" isLoading={isWorking} onClick={handleDisconnect}>
              Desconectar
            </Button>
          </div>
          <BlingSellerMappingSection connectionId={connection.id} members={members} mappings={sellerMappings} />
        </>
      ) : (
        <div className="space-y-3">
          <div>
            <Label>URL de redirecionamento (cadastrar no app do Bling)</Label>
            <div className="flex items-center gap-2">
              <Input readOnly value={redirectUri} className="bg-gray-50 text-gray-600" />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(redirectUri);
                  toast.success("URL copiada");
                }}
              >
                <Copy size={14} />
              </Button>
            </div>
          </div>

          <form action={formAction} className="space-y-3">
            <div>
              <Label htmlFor={`clientId-${connection.id}`}>Client ID</Label>
              <Input
                id={`clientId-${connection.id}`}
                name="clientId"
                required
                defaultValue={connection.client_id ?? ""}
              />
            </div>
            <div>
              <Label htmlFor={`clientSecret-${connection.id}`}>Client Secret</Label>
              <Input
                id={`clientSecret-${connection.id}`}
                name="clientSecret"
                type="password"
                required
                defaultValue={connection.client_secret ?? ""}
              />
            </div>

            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

            <div className="flex items-center gap-3">
              <Button type="submit" variant="secondary" size="sm" isLoading={isPending}>
                Salvar credenciais
              </Button>
              {connection.client_id && connection.client_secret && (
                <a href={`/api/bling/authorize?connectionId=${connection.id}`}>
                  <Button type="button" size="sm">
                    <ExternalLink size={14} />
                    Conectar com Bling
                  </Button>
                </a>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function NewBlingConnectionButton() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createBlingConnection, null);
  const router = useRouter();
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      setOpen(false);
      router.refresh();
    }
    wasPending.current = isPending;
  }, [isPending, state, router]);

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} />
        Adicionar conta Bling (filial)
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova conexão Bling">
        <form action={formAction} className="space-y-3">
          <div>
            <Label htmlFor="new-bling-name">Nome</Label>
            <Input id="new-bling-name" name="name" placeholder="Ex: Filial RJ" required />
            <p className="mt-1 text-xs text-gray-500">
              Esse nome também vira uma tag — atribua ela aos contatos dessa filial pra rotear a sincronização.
            </p>
          </div>
          <div>
            <Label htmlFor="new-bling-client-id">Client ID</Label>
            <Input id="new-bling-client-id" name="clientId" required />
          </div>
          <div>
            <Label htmlFor="new-bling-client-secret">Client Secret</Label>
            <Input id="new-bling-client-secret" name="clientSecret" type="password" required />
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <Button type="submit" className="w-full" isLoading={isPending}>
            Criar conexão
          </Button>
        </form>
      </Modal>
    </>
  );
}

export function BlingConnectionsCard({
  connections,
  tags,
  members,
  sellerMappings,
  siteUrl,
}: {
  connections: BlingConnection[];
  tags: Tag[];
  members: Member[];
  sellerMappings: SellerMapping[];
  siteUrl: string;
}) {
  return (
    <div className="space-y-4">
      {connections.map((connection) => (
        <BlingConnectionRow
          key={connection.id}
          connection={connection}
          tags={tags}
          members={members}
          sellerMappings={sellerMappings.filter((m) => m.bling_connection_id === connection.id)}
          siteUrl={siteUrl}
        />
      ))}
      <NewBlingConnectionButton />
    </div>
  );
}
