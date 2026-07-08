// WhatsAppPage — grade de conexões WhatsApp do tenant. Gestor vê todas as
// conexões da equipe; atendente vê só a própria (rota compartilhada entre os
// dois papéis via Task 3, conteúdo filtrado aqui por papel).

import { ConnectionCard } from "@/components/whatsapp/ConnectionCard";
import { currentUser, tenantScope } from "@/lib/selectors";
import { useCrm } from "@/lib/store";

export function WhatsAppPage() {
  const { state, dispatch } = useCrm();
  const scope = tenantScope(state);
  const me = currentUser(state);

  if (!me) return null;

  const connections =
    me.role === "atendente" ? scope.connections.filter((c) => c.userId === me.id) : scope.connections;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">WhatsApp</h1>

      {connections.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma conexão de WhatsApp encontrada para você.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {connections.map((connection) => {
            const owner = scope.users.find((u) => u.id === connection.userId);
            if (!owner) return null;
            return <ConnectionCard key={connection.id} connection={connection} owner={owner} dispatch={dispatch} />;
          })}
        </div>
      )}
    </div>
  );
}
