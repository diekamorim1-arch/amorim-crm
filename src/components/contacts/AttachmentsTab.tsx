// AttachmentsTab — aba "Comprovantes" da ficha do cliente: upload de
// imagem/PDF convertido para base64 (persistido no localStorage via
// ADD_ATTACHMENT) e lista dos anexos já enviados, com remoção. Sem seletor de
// negócio: dealId fica sempre undefined neste momento (campo existe no tipo
// para uso futuro).

import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { FileText, Paperclip, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/lib/format";
import { tenantScope } from "@/lib/selectors";
import { newId, useCrm } from "@/lib/store";
import type { Attachment } from "@/lib/types";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface AttachmentsTabProps {
  contactId: string;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function AttachmentsTab({ contactId }: AttachmentsTabProps) {
  const { state, dispatch } = useCrm();
  const { attachments, users } = tenantScope(state);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  const contactAttachments = attachments
    .filter((a) => a.contactId === contactId)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  function uploaderName(userId: string): string {
    return users.find((u) => u.id === userId)?.name ?? "—";
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !state.session) return;

    if (file.size > MAX_FILE_BYTES) {
      setError("Arquivo maior que 5MB. Escolha um arquivo menor.");
      return;
    }
    setError("");

    const dataUrl = await readAsDataUrl(file);
    const attachment: Attachment = {
      id: newId("attachment"),
      tenantId: state.session.tenantId,
      contactId,
      fileName: file.name,
      fileType: file.type,
      dataUrl,
      uploadedBy: state.session.userId,
      uploadedAt: new Date().toISOString(),
    };
    dispatch({ type: "ADD_ATTACHMENT", attachment });
    toast.success(`Comprovante ${file.name} anexado.`);
  }

  function handleRemove(attachment: Attachment) {
    dispatch({ type: "REMOVE_ATTACHMENT", attachmentId: attachment.id });
    toast.success(`Comprovante ${attachment.fileName} removido.`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
        <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileSelected} />
        <Button type="button" variant="outline" className="w-fit" onClick={() => inputRef.current?.click()}>
          <Paperclip />
          Anexar comprovante
        </Button>
        <p className="text-xs text-muted-foreground">Imagens ou PDF, até 5MB por arquivo.</p>
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
              <div className="flex min-w-0 items-center gap-3">
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
                  <span className="truncate text-sm font-medium text-foreground">{attachment.fileName}</span>
                  <span className="text-xs text-muted-foreground">
                    {relativeTime(attachment.uploadedAt)} · {uploaderName(attachment.uploadedBy)}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="icon-xs" aria-label="Remover comprovante" onClick={() => handleRemove(attachment)}>
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
