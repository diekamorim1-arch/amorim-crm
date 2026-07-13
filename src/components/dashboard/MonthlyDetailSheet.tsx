// MonthlyDetailSheet — drill-down de um mês do "Histórico mensal": lista os
// negócios ganhos naquele mês (cliente, produto, venda/fornecedor/brindes/
// frete/líquido, mesma fórmula do EditDealDialog) com ações por linha:
// "Editar" reabre o EditDealDialog já existente; "Mover mês" delega ao
// MoveDealMonthDialog (via onMove) já que edita stage_changed_at, um campo
// fora do escopo do EditDealDialog; "Excluir" chama api.deleteDeal (mesma
// ação do Pipeline) com confirmação própria. Ainda "burro" no sentido de não
// ter useCrm — mas dono do estado local de confirmação de exclusão.

import { useState } from "react";
import { Link } from "react-router";
import { HandCoins, Trash2 } from "lucide-react";

import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface MonthlyDetailRow {
  dealId: string;
  contactId: string;
  contactName: string;
  products: string;
  value: number;
  supplierValue: number;
  giftValue: number;
  freightValue: number;
  netProfit: number;
  stageChangedAt: string;
}

interface MonthlyDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  rows: MonthlyDetailRow[];
  onEdit: (dealId: string) => void;
  onMove: (row: MonthlyDetailRow) => void;
  onDelete: (dealId: string) => Promise<void>;
}

export function MonthlyDetailSheet({ open, onOpenChange, month, rows, onEdit, onMove, onDelete }: MonthlyDetailSheetProps) {
  const [deletingRow, setDeletingRow] = useState<MonthlyDetailRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirmDelete() {
    if (!deletingRow) return;
    setDeleting(true);
    try {
      await onDelete(deletingRow.dealId);
      setDeletingRow(null);
    } catch {
      // onDelete já mostra o toast de erro — aqui só evita fechar o dialog
      // pra pessoa poder tentar de novo.
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{month}</SheetTitle>
          <SheetDescription>Negócios ganhos neste mês, com o detalhamento de lucro líquido.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-4">
          {rows.length === 0 ? (
            <EmptyState compact icon={HandCoins} title="Nenhuma venda ganha neste mês" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Venda</TableHead>
                    <TableHead className="text-right">Fornecedor</TableHead>
                    <TableHead className="text-right">Brindes</TableHead>
                    <TableHead className="text-right">Frete</TableHead>
                    <TableHead className="text-right">Líquido</TableHead>
                    <TableHead className="w-40" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.dealId}>
                      <TableCell>
                        <Link
                          to={`/clientes/${row.contactId}`}
                          className="text-foreground underline-offset-2 hover:underline"
                        >
                          {row.contactName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.products}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-foreground">
                        {brl(row.value)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                        {brl(row.supplierValue)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                        {brl(row.giftValue)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                        {brl(row.freightValue)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-mono tabular-nums font-semibold",
                          row.netProfit >= 0 ? "text-success" : "text-destructive",
                        )}
                      >
                        {brl(row.netProfit)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(row.dealId)}>
                            Editar
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => onMove(row)}>
                            Mover mês
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Excluir negócio"
                            onClick={() => setDeletingRow(row)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </SheetContent>

      <ConfirmDeleteDialog
        open={!!deletingRow}
        onOpenChange={(o) => !o && setDeletingRow(null)}
        onConfirm={handleConfirmDelete}
        deleting={deleting}
        title={`Excluir negócio de ${deletingRow?.contactName}?`}
        description="Essa ação não pode ser desfeita. Apaga só este negócio — o cliente associado continua existindo."
      />
    </Sheet>
  );
}
