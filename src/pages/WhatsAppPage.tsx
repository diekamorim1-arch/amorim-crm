// WhatsAppPage — grade de conexões WhatsApp reais (Evolution API) do tenant,
// buscadas do backend (não mais do reducer local — essas conexões vivem
// numa tabela real no Supabase, gerenciada via FastAPI). Gestor vê todas as
// conexões da equipe; atendente vê só a própria (o backend já filtra por
// papel em list_connections, esta página só renderiza o que voltar).

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/EmptyState";
import { ConnectionCard } from "@/components/whatsapp/ConnectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError, type ApiConnection } from "@/lib/apiClient";
import { currentUser } from "@/lib/selectors";
import { useCrm } from "@/lib/store";

export function WhatsAppPage() {
  const { state } = useCrm();
  const me = currentUser(state);

  const [connections, setConnections] = useState<ApiConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .listConnections()
      .then((rows) => active && setConnections(rows))
      .catch(() => active && toast.error("Não foi possível carregar as conexões de WhatsApp."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  function handleChanged(updated: ApiConnection) {
    setConnections((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  function handleDeleted(id: string) {
    setConnections((prev) => prev.filter((c) => c.id !== id));
    toast.success("Conexão excluída. Cadastre um número pra parear de novo.");
  }

  async function handleCreate() {
    if (!phone.trim()) {
      toast.error("Informe o número do WhatsApp.");
      return;
    }
    setCreating(true);
    try {
      const created = await api.createConnection(phone.trim());
      setConnections((prev) => [...prev, created]);
      setPhone("");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível criar a conexão.");
    } finally {
      setCreating(false);
    }
  }

  function ownerNameFor(connection: ApiConnection): string {
    if (me && connection.user_id === me.id) return me.name;
    return state.users.find((u) => u.id === connection.user_id)?.name ?? "Membro da equipe";
  }

  function ownerAvatarColorFor(connection: ApiConnection): string {
    if (me && connection.user_id === me.id) return me.avatarColor;
    return state.users.find((u) => u.id === connection.user_id)?.avatarColor ?? "#64748b";
  }

  if (!me || loading) return null;

  const hasOwnConnection = connections.some((c) => c.user_id === me.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">WhatsApp</h1>

      {!hasOwnConnection && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:max-w-sm">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="new-connection-phone">Seu número de WhatsApp</Label>
            <span className="text-xs text-muted-foreground">Cadastre pra poder conectar seu WhatsApp.</span>
          </div>
          <Input
            id="new-connection-phone"
            placeholder="+55 11 90000-0000"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <Button onClick={handleCreate} disabled={creating} className="w-fit">
            {creating ? "Criando…" : "Cadastrar número"}
          </Button>
        </div>
      )}

      {connections.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <EmptyState
            icon={MessageCircle}
            title="Nenhuma conexão de WhatsApp encontrada"
            description="Cadastre um número acima para começar a atender pelo Inbox."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {connections.map((connection) => (
            <ConnectionCard
              key={connection.id}
              connection={connection}
              ownerName={ownerNameFor(connection)}
              ownerAvatarColor={ownerAvatarColorFor(connection)}
              onChanged={handleChanged}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
