// IntegrationsTab — status real da conexão WhatsApp/Evolution API do tenant
// (mesmos dados que pages/WhatsAppPage.tsx já busca via api.listConnections),
// com atalho pra gerenciar lá. Google Calendar fica como espaço reservado
// explícito pra próxima integração — sem funcionalidade ainda.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Calendar, MessageCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CONNECTION_STATUS_LABELS } from "@/lib/constants";
import { api, type ApiConnection } from "@/lib/apiClient";

export function IntegrationsTab() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<ApiConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .listConnections()
      .then((rows) => active && setConnections(rows))
      .catch(() => active && setConnections([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const connectedCount = connections.filter((c) => c.status === "conectado").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <MessageCircle className="size-5 text-muted-foreground" />
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-medium text-foreground">WhatsApp (Evolution API)</h2>
            <p className="text-xs text-muted-foreground">
              {loading
                ? "Carregando…"
                : connections.length === 0
                  ? "Nenhuma conexão cadastrada ainda."
                  : `${connectedCount} de ${connections.length} conexão${connections.length > 1 ? "ões" : ""} conectada${connectedCount === 1 ? "" : "s"}.`}
            </p>
          </div>
        </div>

        {!loading && connections.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {connections.map((connection) => (
              <Badge key={connection.id} variant={connection.status === "conectado" ? "default" : "secondary"}>
                {connection.phone} · {CONNECTION_STATUS_LABELS[connection.status]}
              </Badge>
            ))}
          </div>
        )}

        <Button type="button" variant="outline" className="w-fit" onClick={() => navigate("/whatsapp")}>
          Gerenciar em WhatsApp
        </Button>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 p-4 opacity-70">
        <Calendar className="size-5 text-muted-foreground" />
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-medium text-foreground">Google Calendar</h2>
          <p className="text-xs text-muted-foreground">Em breve — sincronização de agendamentos.</p>
        </div>
      </div>
    </div>
  );
}
