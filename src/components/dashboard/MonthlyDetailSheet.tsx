// MonthlyDetailSheet — drill-down de um mês do "Histórico mensal": lista os
// negócios ganhos naquele mês (cliente, produto, venda/fornecedor/brindes/
// frete/líquido, mesma fórmula do EditDealDialog) com um botão "Editar" por
// linha que reabre o EditDealDialog já existente. Componente "burro": recebe
// as linhas prontas (a página decide se vêm da API real ou dos selectors
// locais) e só sabe emitir onEdit(dealId).

import { Link } from "react-router";
import { HandCoins } from "lucide-react";

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
}

interface MonthlyDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  rows: MonthlyDetailRow[];
  onEdit: (dealId: string) => void;
}

export function MonthlyDetailSheet({ open, onOpenChange, month, rows, onEdit }: MonthlyDetailSheetProps) {
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
                    <TableHead className="w-16" />
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
                        <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(row.dealId)}>
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
