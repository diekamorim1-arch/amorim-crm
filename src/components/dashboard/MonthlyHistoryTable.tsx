// MonthlyHistoryTable — receita e lucro líquido por mês, últimos N meses.
// Tabela (não gráfico): números exatos de 3 métricas por linha, com 12
// linhas — mesma razão de ChannelTable (muitas categorias com valor exato
// que o leitor quer comparar em coluna). Cada linha é clicável e abre o
// detalhe (negócios ganhos) daquele mês num Sheet, via onSelectMonth.

import { EmptyState } from "@/components/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { History } from "lucide-react";

interface MonthlyHistoryRow {
  month: string;
  monthKey: string;
  newLeads: number;
  revenue: number;
  netProfit: number;
}

interface MonthlyHistoryTableProps {
  data: MonthlyHistoryRow[];
  onSelectMonth: (row: MonthlyHistoryRow) => void;
}

export function MonthlyHistoryTable({ data, onSelectMonth }: MonthlyHistoryTableProps) {
  if (data.every((row) => row.newLeads === 0 && row.revenue === 0)) {
    return <EmptyState compact icon={History} title="Sem histórico ainda" />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mês</TableHead>
          <TableHead className="text-right">Leads novos</TableHead>
          <TableHead className="text-right">Receita</TableHead>
          <TableHead className="text-right">Lucro líquido</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...data].reverse().map((row) => (
          <TableRow
            key={row.monthKey}
            onClick={() => onSelectMonth(row)}
            className="cursor-pointer hover:bg-accent/50"
          >
            <TableCell className="text-foreground">{row.month}</TableCell>
            <TableCell className="text-right font-mono tabular-nums text-foreground">{row.newLeads}</TableCell>
            <TableCell className="text-right font-mono tabular-nums text-foreground">{brl(row.revenue)}</TableCell>
            <TableCell
              className={cn(
                "text-right font-mono tabular-nums",
                row.netProfit >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {brl(row.netProfit)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
