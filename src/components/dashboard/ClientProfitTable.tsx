// ClientProfitTable — "Lucro líquido por cliente": uma linha por negócio
// ganho no mês selecionado, com o detalhamento venda/fornecedor/brindes/
// frete/líquido (mesma fórmula do EditDealDialog, centralizada em
// dealNetProfit) e link pra ficha do cliente. Tabela porque são 5 valores
// exatos por linha que o leitor quer comparar em coluna — mesma razão de
// ChannelTable/MonthlyHistoryTable.

import { Link } from "react-router";
import { HandCoins } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dealNetProfit } from "@/lib/selectors";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Contact, Deal } from "@/lib/types";

interface MonthOption {
  monthKey: string;
  month: string;
}

interface ClientProfitTableProps {
  rows: { contact: Contact; deal: Deal }[];
  monthOptions: MonthOption[];
  selectedMonth: string;
  onMonthChange: (monthKey: string) => void;
}

export function ClientProfitTable({ rows, monthOptions, selectedMonth, onMonthChange }: ClientProfitTableProps) {
  return (
    <div className="flex flex-col gap-3">
      <Select value={selectedMonth} onValueChange={onMonthChange}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {monthOptions.map((option) => (
            <SelectItem key={option.monthKey} value={option.monthKey}>
              {option.month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ contact, deal }) => {
                const netProfit = dealNetProfit(deal);
                return (
                  <TableRow key={deal.id}>
                    <TableCell>
                      <Link to={`/clientes/${contact.id}`} className="text-foreground underline-offset-2 hover:underline">
                        {contact.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{deal.products}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-foreground">{brl(deal.value)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {brl(deal.supplierValue ?? 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {brl(deal.giftValue ?? 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {brl(deal.freightValue ?? 0)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono tabular-nums font-semibold",
                        netProfit >= 0 ? "text-success" : "text-destructive",
                      )}
                    >
                      {brl(netProfit)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
