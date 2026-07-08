// EmptyState — bloco reutilizável para listas/estados sem dados (Inbox por
// aba, colunas do Pipeline, filtro sem resultado em Clientes, dia vazio na
// Agenda, Perdidos vazio, e qualquer tela de um tenant recém-criado). Convida
// à ação quando fizer sentido, em vez de só informar que "não há nada".

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Reduz padding/ícone para caber em cards menores (ex.: dentro de um Card do Dashboard). */
  compact?: boolean;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, compact = false, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-center",
        compact ? "px-3 py-6" : "px-4 py-14",
        className,
      )}
    >
      <div
        className={cn(
          "mb-1 flex items-center justify-center rounded-full bg-muted text-muted-foreground",
          compact ? "size-8" : "size-10",
        )}
        aria-hidden="true"
      >
        <Icon className={compact ? "size-4" : "size-5"} />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
