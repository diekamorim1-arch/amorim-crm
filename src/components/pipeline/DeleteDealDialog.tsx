// DeleteDealDialog — confirmação antes de excluir um negócio (mesmo padrão
// de AlertDialog usado em TeamTab pra excluir usuário). Só apaga o negócio —
// o contato/cliente associado continua existindo.

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Deal } from "@/lib/types";

interface DeleteDealDialogProps {
  deal: Deal | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteDealDialog({ deal, deleting, onOpenChange, onConfirm }: DeleteDealDialogProps) {
  return (
    <AlertDialog open={deal !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {deal?.title}?</AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação não pode ser desfeita. Apaga só este negócio — o cliente associado continua existindo, com
            todo o histórico de conversas e agendamentos preservado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={deleting}>
            {deleting ? "Excluindo…" : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
