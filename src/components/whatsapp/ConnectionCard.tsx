// ConnectionCard — card de uma conexão WhatsApp real: dono, número e status,
// com pulsação verde reservada ao estado "conectado" (verde é semântico do
// WhatsApp/sucesso — nunca decoração, ver docs/design-direction.md).

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { PairingDialog } from "./PairingDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { api, ApiError, type ApiConnection } from "@/lib/apiClient";
import { CONNECTION_STATUS_LABELS } from "@/lib/constants";
import { relativeTime } from "@/lib/format";
import type { ConnectionStatus } from "@/lib/types";

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
  connection: ApiConnection;
  ownerName: string;
  ownerAvatarColor: string;
  onChanged: (updated: ApiConnection) => void;
  onDeleted: (id: string) => void;
}

export function ConnectionCard({ connection, ownerName, ownerAvatarColor, onChanged, onDeleted }: ConnectionCardProps) {
  const [pairingOpen, setPairingOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isConnected = connection.status === "conectado";

  async function handleToggle() {
    if (!isConnected) {
      setPairingOpen(true);
      return;
    }
    setDisconnecting(true);
    try {
      const updated = await api.disconnectConnection(connection.id);
      onChanged(updated);
    } catch {
      toast.error("Não foi possível desconectar. Tente novamente.");
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await api.deleteConnection(connection.id);
      onDeleted(connection.id);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível excluir a conexão.");
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <Avatar size="lg">
          <AvatarFallback style={{ backgroundColor: ownerAvatarColor, color: "#fff" }}>
            {initialsOf(ownerName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground">{ownerName}</span>
          <span className="font-mono text-sm text-muted-foreground">{connection.phone || "Sem número ainda"}</span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`size-2.5 rounded-full ${STATUS_DOT_CLASS[connection.status]}`} aria-hidden />
          <span className="text-foreground">{CONNECTION_STATUS_LABELS[connection.status]}</span>
          {isConnected && connection.connected_at && (
            <span className="text-muted-foreground">· Conectado desde {relativeTime(connection.connected_at)}</span>
          )}
        </div>

        {connection.status === "desconectado" && (
          <p className="flex items-center gap-1.5 text-sm text-attention">
            <AlertTriangle className="size-3.5 shrink-0" />
            Mensagens deste número não estão sendo recebidas.
          </p>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        <Button variant={isConnected ? "outline" : "default"} onClick={handleToggle} disabled={disconnecting}>
          {isConnected ? (disconnecting ? "Desconectando…" : "Desconectar") : "Conectar"}
        </Button>
        <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmingDelete(true)}>
          Excluir
        </Button>
      </CardFooter>

      <PairingDialog
        open={pairingOpen}
        onOpenChange={setPairingOpen}
        connection={connection}
        ownerName={ownerName}
        onChanged={onChanged}
      />

      <ConfirmDeleteDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        onConfirm={handleConfirmDelete}
        deleting={deleting}
        title={`Excluir conexão de ${ownerName}?`}
        description="Isso desconecta o número da Evolution API e remove esta conexão. Depois de excluir, é possível
          cadastrar um número novo (ou o mesmo de novo) e parear do zero — útil se o pareamento ficou travado ou o
          número cadastrado estava errado."
      />
    </Card>
  );
}
