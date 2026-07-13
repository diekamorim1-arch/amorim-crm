// AttachmentsTab — aba "Comprovantes" da ficha do cliente. Busca/envia/remove
// os anexos via API (Supabase Storage, com URL assinada pra visualização).
// Clicar numa miniatura abre o comprovante: imagem num lightbox inline, PDF
// em nova aba. Sem seletor de negócio: dealId fica sempre undefined neste
// momento (campo existe no tipo para uso futuro).

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { FileText, Paperclip, Trash2 } from "lucide-react";

import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ApiError, api, mapAttachment } from "@/lib/apiClient";
import { relativeTime } from "@/lib/format";
import { tenantScope } from "@/lib/selectors";
import { useCrm } from "@/lib/store";
import type { Attachment } from "@/lib/types";

const MAX_FILE_BYTES = 1.5 * 1024 * 1024;

interface AttachmentsTabProps {
  contactId: string;
}

export function AttachmentsTab({ contactId }: AttachmentsTabProps) {
  const { state, dataVersion } = useCrm();
  const { users } = tenantScope(state);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [remoteAttachments, setRemoteAttachments] = useState<Attachment[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [deletingAttachment, setDeletingAttachment] = useState<Attachment | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    api.listAttachments(contactId).then((rows) => {
      if (active) setRemoteAttachments(rows.map(mapAttachment));
    });
    return () => {
      active = false;
    };
  }, [contactId, dataVersion]);

  const contactAttachments = [...remoteAttachments].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );

  function uploaderName(userId: string): string {
    return users.find((u) => u.id === userId)?.name ?? "—";
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !state.session) return;

    if (file.size > MAX_FILE_BYTES) {
      setError("Arquivo maior que 1,5MB. Escolha um arquivo menor.");
      return;
    }
    setError("");

    try {
      const created = await api.uploadAttachment(contactId, file);
      setRemoteAttachments((prev) => [mapAttachment(created), ...prev]);
      toast.success(`Comprovante ${file.name} anexado.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao enviar comprovante.");
    }
  }

  async function handleConfirmRemove() {
    const attachment = deletingAttachment;
    if (!attachment) return;

    setDeleting(true);
    try {
      await api.deleteAttachment(attachment.id);
      setRemoteAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
      toast.success(`Comprovante ${attachment.fileName} removido.`);
      setDeletingAttachment(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao remover comprovante.");
    } finally {
      setDeleting(false);
    }
  }

  function handleOpen(attachment: Attachment) {
    if (attachment.fileType.startsWith("image/")) {
      setPreviewAttachment(attachment);
    } else {
      window.open(attachment.dataUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
        <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileSelected} />
        <Button type="button" variant="outline" className="w-fit" onClick={() => inputRef.current?.click()}>
          <Paperclip />
          Anexar comprovante
        </Button>
        <p className="text-xs text-muted-foreground">Imagens ou PDF, até 1,5MB por arquivo.</p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {contactAttachments.length === 0 ? (
        <EmptyState icon={Paperclip} title="Nenhum comprovante anexado ainda" />
      ) : (
        <div className="flex flex-col gap-2">
          {contactAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
            >
              <button
                type="button"
                onClick={() => handleOpen(attachment)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                {attachment.fileType.startsWith("image/") ? (
                  <img
                    src={attachment.dataUrl}
                    alt={attachment.fileName}
                    className="size-10 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <FileText className="size-10 shrink-0 text-muted-foreground" />
                )}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium text-foreground underline-offset-2 hover:underline">
                    {attachment.fileName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {relativeTime(attachment.uploadedAt)} · {uploaderName(attachment.uploadedBy)}
                  </span>
                </div>
              </button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Remover comprovante"
                onClick={() => setDeletingAttachment(attachment)}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!previewAttachment} onOpenChange={(open) => !open && setPreviewAttachment(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogTitle className="sr-only">{previewAttachment?.fileName}</DialogTitle>
          {previewAttachment && (
            <img src={previewAttachment.dataUrl} alt={previewAttachment.fileName} className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deletingAttachment}
        onOpenChange={(open) => !open && setDeletingAttachment(null)}
        onConfirm={handleConfirmRemove}
        deleting={deleting}
        title={`Remover ${deletingAttachment?.fileName}?`}
        description="Essa ação não pode ser desfeita. O comprovante é apagado do armazenamento e não pode ser recuperado depois."
      />
    </div>
  );
}
