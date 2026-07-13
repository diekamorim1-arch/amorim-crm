// DeleteDealDialog — confirmação antes de excluir um negócio, via o
// ConfirmDeleteDialog padrão do CRM. Só apaga o negócio — o contato/cliente
// associado continua existindo.

import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import type { Deal } from "@/lib/types";

interface DeleteDealDialogProps {
  deal: Deal | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteDealDialog({ deal, deleting, onOpenChange, onConfirm }: DeleteDealDialogProps) {
  return (
    <ConfirmDeleteDialog
      open={deal !== null}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      deleting={deleting}
      title={`Excluir ${deal?.title}?`}
      description="Essa ação não pode ser desfeita. Apaga só este negócio — o cliente associado continua existindo, com
        todo o histórico de conversas e agendamentos preservado."
    />
  );
}
