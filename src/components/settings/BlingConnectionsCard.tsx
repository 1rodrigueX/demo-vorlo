"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Copy, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import {
  createBlingConnection,
  updateBlingCredentials,
  setBlingConnectionTag,
  disconnectBlingConnection,
  deleteBlingConnection,
  type ActionState,
} from "@/lib/actions/bling";
import type { BlingConnection, Tag } from "@/types/domain";

function BlingConnectionRow({
  connection,
  tags,
  siteUrl,
}: {
  connection: BlingConnection;
  tags: Tag[];
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
        <Label htmlFor={`tag-${connection.id}`}>Tag vinculada (roteia a sincronização)</Label>
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
      </div>

      {isConnected ? (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Conectado com sucesso</span>
          <Button type="button" variant="secondary" size="sm" isLoading={isWorking} onClick={handleDisconnect}>
            Desconectar
          </Button>
        </div>
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

function NewBlingConnectionButton({ tags }: { tags: Tag[] }) {
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
          </div>
          <div>
            <Label htmlFor="new-bling-tag">Tag vinculada (opcional)</Label>
            <Select id="new-bling-tag" name="tagId" defaultValue="">
              <option value="">Nenhuma por enquanto</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </Select>
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
  siteUrl,
}: {
  connections: BlingConnection[];
  tags: Tag[];
  siteUrl: string;
}) {
  return (
    <div className="space-y-4">
      {connections.map((connection) => (
        <BlingConnectionRow key={connection.id} connection={connection} tags={tags} siteUrl={siteUrl} />
      ))}
      <NewBlingConnectionButton tags={tags} />
    </div>
  );
}
