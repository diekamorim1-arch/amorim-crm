// PairingDialog — pareamento real via Evolution API.
//
// Ao abrir: se a conexão está "desconectado", chama pairConnection (cria a
// instância na Evolution) e começa a pollar getQrCode; se já está
// "pareando" (retomando um diálogo fechado antes de conectar), só retoma o
// polling sem recriar a instância. O polling para sozinho quando o status
// vira "conectado" — atualizado pelo webhook connection.update no backend,
// não por um timer local (diferença chave do fluxo simulado anterior).
//
// Fechar antes de conectar desconecta a instância pendente (evita deixá-la
// presa em "pareando" na Evolution sem ninguém olhando o QR).

import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, type ApiConnection } from "@/lib/apiClient";

const POLL_INTERVAL_MS = 4000;

const STEPS = [
  "Abra o WhatsApp no seu celular.",
  "Toque em Mais opções ⋮ no Android ou em Ajustes no iPhone.",
  "Toque em Aparelhos conectados e, em seguida, em Conectar um aparelho.",
  "Aponte seu celular para esta tela para escanear o código.",
];

interface PairingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: ApiConnection;
  ownerName: string;
  onChanged: (updated: ApiConnection) => void;
}

export function PairingDialog({ open, onOpenChange, connection, ownerName, onChanged }: PairingDialogProps) {
  const [status, setStatus] = useState<ApiConnection["status"]>(connection.status);
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (!open) {
      clearInterval(pollRef.current);
      return;
    }

    let cancelled = false;
    setStatus(connection.status);
    setQrcode(null);
    setError("");

    async function pollQrCode() {
      try {
        const result = await api.getQrCode(connection.id);
        if (cancelled) return;
        setQrcode(result.qrcode);
        setStatus(result.status);
        if (result.status === "conectado") {
          clearInterval(pollRef.current);
          onChanged({ ...connection, status: "conectado" });
          toast.success(`WhatsApp de ${ownerName} conectado.`);
        }
      } catch {
        // Silencioso — falha pontual de rede não deve interromper o
        // pareamento; o próximo tick tenta de novo.
      }
    }

    async function run() {
      setLoading(true);
      try {
        if (connection.status === "desconectado") {
          const paired = await api.pairConnection(connection.id);
          if (cancelled) return;
          setStatus(paired.status);
          onChanged(paired);
        }
        if (!cancelled && connection.status !== "conectado") {
          await pollQrCode();
          pollRef.current = setInterval(pollQrCode, POLL_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) setError("Não foi possível iniciar o pareamento. Tente novamente.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, connection.id]);

  async function handleOpenChange(next: boolean) {
    if (!next && status !== "conectado") {
      // Fechar antes de conectar cancela o pareamento — não deixa a
      // instância presa em "pareando" na Evolution sem o diálogo aberto.
      try {
        const updated = await api.disconnectConnection(connection.id);
        onChanged(updated);
      } catch {
        // Falha ao desconectar não deve travar o fechamento do diálogo.
      }
    }
    onOpenChange(next);
  }

  function handleRetry() {
    setError("");
    onOpenChange(false);
    setTimeout(() => onOpenChange(true), 0);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp de {ownerName}</DialogTitle>
          <DialogDescription>Escaneie o código com o celular para parear este número.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="flex size-[176px] shrink-0 items-center justify-center">
            {status === "conectado" ? (
              <div className="flex size-[176px] flex-col items-center justify-center gap-2 rounded-md bg-whatsapp/10">
                <CheckCircle2 className="size-12 animate-in zoom-in text-whatsapp" />
                <span className="text-sm font-medium text-whatsapp">Conectado</span>
              </div>
            ) : error ? (
              <div className="flex size-[176px] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-muted text-center">
                <span className="px-4 text-sm text-muted-foreground">{error}</span>
                <Button size="sm" variant="outline" onClick={handleRetry}>
                  Tentar de novo
                </Button>
              </div>
            ) : qrcode ? (
              <img src={qrcode} alt="Código de pareamento" className="size-[176px] rounded-md bg-white p-2" />
            ) : (
              <div className="flex size-[176px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted p-4 text-center">
                <span className="text-sm text-muted-foreground">
                  {loading ? "Gerando código…" : "Aguardando código da Evolution API…"}
                </span>
              </div>
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
