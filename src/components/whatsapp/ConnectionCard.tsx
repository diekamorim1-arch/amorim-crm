// ConnectionCard — card de uma conexão WhatsApp: dono, número e status, com
// pulsação verde reservada ao estado "conectado" (verde é semântico do
// WhatsApp/sucesso — nunca decoração, ver docs/design-direction.md).

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { PairingDialog } from "./PairingDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { CONNECTION_STATUS_LABELS } from "@/lib/constants";
import { relativeTime } from "@/lib/format";
import type { CrmAction, Dispatch } from "@/lib/store";
import type { ConnectionStatus, User, WhatsAppConnection } from "@/lib/types";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

// Verde pulsa só quando conectado; pareando é âmbar (--attention); desconectado
// é cinza neutro. Nunca verde fora do estado "conectado".
const STATUS_DOT_CLASS: Record<ConnectionStatus, string> = {
  conectado: "bg-whatsapp animate-pulse",
  pareando: "bg-attention",
  desconectado: "bg-muted-foreground",
};

interface ConnectionCardProps {
  connection: WhatsAppConnection;
  owner: User;
  dispatch: Dispatch<CrmAction>;
}

export function ConnectionCard({ connection, owner, dispatch }: ConnectionCardProps) {
  const [pairingOpen, setPairingOpen] = useState(false);
  const isConnected = connection.status === "conectado";

  function handleToggle() {
    if (isConnected) {
      dispatch({ type: "SET_CONNECTION_STATUS", connectionId: connection.id, status: "desconectado" });
      return;
    }
    setPairingOpen(true);
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <Avatar size="lg">
          <AvatarFallback style={{ backgroundColor: owner.avatarColor, color: "#fff" }}>
            {initialsOf(owner.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground">{owner.name}</span>
          <span className="font-mono text-sm text-muted-foreground">{connection.phone}</span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`size-2.5 rounded-full ${STATUS_DOT_CLASS[connection.status]}`} aria-hidden />
          <span className="text-foreground">{CONNECTION_STATUS_LABELS[connection.status]}</span>
          {isConnected && connection.connectedAt && (
            <span className="text-muted-foreground">· Conectado desde {relativeTime(connection.connectedAt)}</span>
          )}
        </div>

        {connection.status === "desconectado" && (
          <p className="flex items-center gap-1.5 text-sm text-attention">
            <AlertTriangle className="size-3.5 shrink-0" />
            Mensagens deste número não estão sendo recebidas.
          </p>
        )}
      </CardContent>

      <CardFooter>
        <Button variant={isConnected ? "outline" : "default"} onClick={handleToggle}>
          {isConnected ? "Desconectar" : "Conectar"}
        </Button>
      </CardFooter>

      <PairingDialog
        open={pairingOpen}
        onOpenChange={setPairingOpen}
        connection={connection}
        ownerName={owner.name}
        dispatch={dispatch}
      />
    </Card>
  );
}
