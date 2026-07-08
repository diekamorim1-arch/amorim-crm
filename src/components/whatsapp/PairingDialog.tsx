// PairingDialog — simula o fluxo de pareamento do WhatsApp Web: ao abrir, a
// conexão entra em "pareando" imediatamente; após 4s conecta sozinha (check
// verde animado + toast) e o diálogo fecha ~1,5s depois. Se ninguém "escanear"
// em 20s, o código expira e oferece um botão para gerar um novo.
//
// Os timers de pareamento (conectar em 4s, expirar em 20s) vivem só aqui —
// nenhum outro componente precisa saber deles.

import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { FakeQr } from "./FakeQr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CrmAction, Dispatch } from "@/lib/store";
import type { WhatsAppConnection } from "@/lib/types";

const CONNECT_DELAY_MS = 4000;
const CLOSE_DELAY_MS = 1500;
const EXPIRE_DELAY_MS = 20000;

const STEPS = [
  "Abra o WhatsApp no seu celular.",
  "Toque em Mais opções ⋮ no Android ou em Ajustes no iPhone.",
  "Toque em Aparelhos conectados e, em seguida, em Conectar um aparelho.",
  "Aponte seu celular para esta tela para escanear o código.",
];

interface PairingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: WhatsAppConnection;
  ownerName: string;
  dispatch: Dispatch<CrmAction>;
}

export function PairingDialog({ open, onOpenChange, connection, ownerName, dispatch }: PairingDialogProps) {
  const [connected, setConnected] = useState(false);
  const [expired, setExpired] = useState(false);

  const connectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const expireTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    function clearTimers() {
      clearTimeout(connectTimer.current);
      clearTimeout(closeTimer.current);
      clearTimeout(expireTimer.current);
    }

    if (!open) {
      clearTimers();
      return;
    }

    setConnected(false);
    setExpired(false);
    dispatch({ type: "SET_CONNECTION_STATUS", connectionId: connection.id, status: "pareando" });

    connectTimer.current = setTimeout(() => {
      dispatch({ type: "SET_CONNECTION_STATUS", connectionId: connection.id, status: "conectado" });
      setConnected(true);
      toast.success(`WhatsApp de ${ownerName} conectado.`);
      closeTimer.current = setTimeout(() => {
        onOpenChange(false);
      }, CLOSE_DELAY_MS);
    }, CONNECT_DELAY_MS);

    expireTimer.current = setTimeout(() => {
      setExpired(true);
    }, EXPIRE_DELAY_MS);

    return clearTimers;
  }, [open, connection.id, dispatch, ownerName, onOpenChange]);

  function handleOpenChange(next: boolean) {
    // Fechar antes de conectar cancela o pareamento — não deixa a conexão
    // presa em "pareando" sem diálogo nenhum para retomar.
    if (!next && !connected) {
      dispatch({ type: "SET_CONNECTION_STATUS", connectionId: connection.id, status: "desconectado" });
    }
    onOpenChange(next);
  }

  function handleRegenerate() {
    clearTimeout(expireTimer.current);
    setExpired(false);
    expireTimer.current = setTimeout(() => setExpired(true), EXPIRE_DELAY_MS);
    // Já estamos em "pareando" — este dispatch é um no-op no status, só
    // reafirma a intenção (consistente com o contrato de SET_CONNECTION_STATUS).
    dispatch({ type: "SET_CONNECTION_STATUS", connectionId: connection.id, status: "pareando" });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp de {ownerName}</DialogTitle>
          <DialogDescription>Escaneie o código com o celular para parear este número (simulado).</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="flex size-[176px] shrink-0 items-center justify-center">
            {connected ? (
              <div className="flex size-[176px] flex-col items-center justify-center gap-2 rounded-md bg-whatsapp/10">
                <CheckCircle2 className="size-12 animate-in zoom-in text-whatsapp" />
                <span className="text-sm font-medium text-whatsapp">Conectado</span>
              </div>
            ) : expired ? (
              <div className="flex size-[176px] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-muted text-center">
                <span className="px-4 text-sm text-muted-foreground">Código expirado</span>
                <Button size="sm" variant="outline" onClick={handleRegenerate}>
                  Gerar novo código
                </Button>
              </div>
            ) : (
              <FakeQr seed={connection.userId} />
            )}
          </div>

          <ol className="flex flex-1 flex-col gap-2 text-sm text-foreground">
            {STEPS.map((step, index) => (
              <li key={step} className="flex gap-2">
                <span className="font-mono text-muted-foreground">{index + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  );
}
