// LossRanking — ranking de motivos de perda com barras horizontais
// proporcionais (magnitude, um único hue neutro — --chart-4 — para não
// colidir com o significado reservado de --attention/--destructive no resto
// do produto). Já vem ordenado desc pelo selector `dashboardMetrics`.

import { CircleOff } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { LOSS_REASON_LABELS } from "@/lib/constants";
import type { LossReason } from "@/lib/types";

interface LossRankingRow {
  reason: LossReason;
  count: number;
}

interface LossRankingProps {
  data: LossRankingRow[];
}

export function LossRanking({ data }: LossRankingProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        compact
        icon={CircleOff}
        title="Nenhum negócio perdido registrado"
        description="Ótimo sinal — continue acompanhando o funil."
      />
    );
  }

  const maxCount = Math.max(1, ...data.map((d) => d.count));

  return (
    <ul className="flex flex-col gap-3">
      {data.map((row) => {
        const pct = (row.count / maxCount) * 100;
        return (
          <li key={row.reason} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-foreground">{LOSS_REASON_LABELS[row.reason]}</span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {row.count} negócio{row.count === 1 ? "" : "s"}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: "var(--chart-4)" }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
