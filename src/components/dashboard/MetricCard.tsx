// MetricCard — tile de estatística do dashboard: rótulo, valor grande e um
// delta opcional (seta + variação percentual vs. um período nomeado). Puro por
// props — não lê o estado global, para ficar fácil de testar/reaproveitar.
// Fonte do valor grande: display (Bricolage) para números "de contagem"
// (leads, taxa); mono tabular-nums para valores em R$, seguindo a convenção
// tipográfica do produto (dinheiro sempre em mono, ver docs/design-direction.md).

import { ArrowDown, ArrowUp } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardDelta {
  /** Variação percentual assinada vs. o período de comparação (ex.: 12.3 ou -8.5). */
  pct: number;
  /** Legenda do período de comparação, ex.: "vs. mês anterior". */
  label: string;
}

interface MetricCardProps {
  label: string;
  value: string;
  /** Classe de fonte/tamanho do valor grande — o card decide, não o pai. */
  valueClassName?: string;
  delta?: MetricCardDelta;
}

export function MetricCard({ label, value, valueClassName, delta }: MetricCardProps) {
  const hasDelta = delta !== undefined;
  const isUp = hasDelta && delta.pct > 0;
  const isDown = hasDelta && delta.pct < 0;

  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-5">
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 px-5">
        <p className={cn("text-2xl font-semibold tracking-tight text-foreground", valueClassName)}>{value}</p>
        {hasDelta && (
          <div className="flex items-center gap-1.5 text-sm">
            {isUp && <ArrowUp className="size-3.5 shrink-0 text-success" aria-hidden="true" />}
            {isDown && <ArrowDown className="size-3.5 shrink-0 text-destructive" aria-hidden="true" />}
            <span className="font-mono font-semibold tabular-nums text-foreground">
              {isUp ? "+" : ""}
              {delta.pct.toFixed(1)}%
            </span>
            <span className="text-muted-foreground">{delta.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
