// ChannelTable — origem × leads × ganhos × taxa de conversão. Tabela simples
// (não é gráfico): mais de meia dúzia de categorias com números exatos que o
// leitor quer comparar em coluna pede tabela, não cor — ver skill dataviz
// ("mais de ~7 classes com significado -> tabela").

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ORIGIN_LABELS } from "@/lib/constants";
import type { Origin } from "@/lib/types";

interface ChannelRow {
  origin: Origin;
  total: number;
  won: number;
}

interface ChannelTableProps {
  data: ChannelRow[];
}

export function ChannelTable({ data }: ChannelTableProps) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum lead registrado ainda.</p>;
  }

  const sorted = [...data].sort((a, b) => b.total - a.total);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Origem</TableHead>
          <TableHead className="text-right">Leads</TableHead>
          <TableHead className="text-right">Ganhos</TableHead>
          <TableHead className="text-right">Taxa</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => {
          const rate = row.total === 0 ? 0 : Math.round((row.won / row.total) * 1000) / 10;
          return (
            <TableRow key={row.origin}>
              <TableCell className="text-foreground">{ORIGIN_LABELS[row.origin]}</TableCell>
              <TableCell className="text-right font-mono tabular-nums text-foreground">{row.total}</TableCell>
              <TableCell className="text-right font-mono tabular-nums text-foreground">{row.won}</TableCell>
              <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                {rate.toFixed(1)}%
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
