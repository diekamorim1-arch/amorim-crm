// MetricCard — tile de estatística do dashboard: rótulo, valor grande e um
// delta opcional (seta + variação percentual vs. um período nomeado). Puro por
// props — não lê o estado global, para ficar fácil de testar/reaproveitar.
// Fonte do valor grande: display (Bricolage) para números "de contagem"
// (leads, taxa); mono tabular-nums para valores em R$, seguindo a convenção
// tipográfica do produto (dinheiro sempre em mono, ver docs/design-direction.md).
// Quando `onClick` é passado, o card vira um botão (drill-down) — usado pelos
// cards "Leads novos no mês" e "Clientes que compraram no mês" no Dashboard.

import { ArrowDown, ArrowUp, Info } from "lucide-react";

import { CardHeader, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  /** Quando presente, o card vira um botão (drill-down) — hover/focus visíveis. */
  onClick?: () => void;
  /** Nota curta explicando a definição da métrica — mostrada num tooltip no
   * ícone ao lado do rótulo. Usado onde a definição não é óbvia à primeira
   * vista (ex.: "Leads novos" conta contatos, não negócios). */
  hint?: string;
}

const CARD_CLASSES = "flex flex-col gap-3 rounded-xl border bg-card py-5 text-card-foreground shadow-sm w-full";

export function MetricCard({ label, value, valueClassName, delta, onClick, hint }: MetricCardProps) {
  const hasDelta = delta !== undefined;
  const isUp = hasDelta && delta.pct > 0;
  const isDown = hasDelta && delta.pct < 0;

  const body = (
    <>
      <CardHeader className="px-5">
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-muted-foreground">{label}</p>
          {hint && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    // Impede que o clique no ícone dispare o onClick do card
                    // (drill-down) quando o MetricCard também é um botão.
                    onClick={(event) => event.stopPropagation()}
                    tabIndex={0}
                    className="text-muted-foreground/70 outline-none hover:text-muted-foreground focus-visible:text-foreground"
                  >
                    <Info className="size-3.5" aria-label={hint} />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-64">{hint}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
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
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(CARD_CLASSES, "cursor-pointer text-left transition-colors hover:bg-accent/50")}>
        {body}
      </button>
    );
  }

  return <div className={CARD_CLASSES}>{body}</div>;
}
