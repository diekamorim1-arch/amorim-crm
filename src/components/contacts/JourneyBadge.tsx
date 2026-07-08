// JourneyBadge — assinatura visual do produto: o "friso de jornada", uma
// barra de 3 segmentos (Lead → Cliente → Recorrente) que preenche em bronze
// conforme o contato avança. Reutilizado por listas, ficha e Inbox.

import { JOURNEY_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { JourneyStatus } from "@/lib/types";

const JOURNEY_ORDER: JourneyStatus[] = ["lead", "cliente", "recorrente"];

interface JourneyBadgeProps {
  status: JourneyStatus;
  className?: string;
}

export function JourneyBadge({ status, className }: JourneyBadgeProps) {
  const activeIndex = JOURNEY_ORDER.indexOf(status);

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} title={JOURNEY_STATUS_LABELS[status]}>
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {JOURNEY_ORDER.map((segment, index) => (
          <span
            key={segment}
            className={cn(
              "h-1.5 w-4 rounded-full bg-muted transition-colors",
              index <= activeIndex && "bg-primary",
            )}
          />
        ))}
      </span>
      <span className="text-xs font-medium whitespace-nowrap text-foreground">{JOURNEY_STATUS_LABELS[status]}</span>
    </span>
  );
}
