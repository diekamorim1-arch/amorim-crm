// Card de um negócio no Kanban — arrastável (HTML5 DnD) e com menu de ações
// "Mover para…" como fallback para touch/acessibilidade.

import { MoreVertical } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STAGES } from "@/lib/constants";
import { brl, relativeTime } from "@/lib/format";
import { isStale } from "@/lib/selectors";
import type { Contact, Deal, Stage } from "@/lib/types";

interface DealCardProps {
  deal: Deal;
  contact?: Contact;
  onMove: (dealId: string, stage: Stage) => void;
  onMarkLost: (deal: Deal) => void;
  onOpenFicha: (contactId: string) => void;
  onOpenConversation: (contactId: string) => void;
  onEditDeal?: (deal: Deal) => void;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

export function DealCard({
  deal,
  contact,
  onMove,
  onMarkLost,
  onOpenFicha,
  onOpenConversation,
  onEditDeal,
}: DealCardProps) {
  const stale = isStale(deal);

  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", deal.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onDoubleClick={() => onEditDeal?.(deal)}
      className="flex cursor-grab flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm transition-colors active:cursor-grabbing hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar size="sm">
            <AvatarFallback>{contact ? initialsOf(contact.name) : "?"}</AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-medium text-foreground">{contact?.name ?? "Sem contato"}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" aria-label="Mais ações do negócio">
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Mover para…</DropdownMenuLabel>
            {STAGES.filter((s) => s.id !== deal.stage).map((s) => (
              <DropdownMenuItem key={s.id} onSelect={() => onMove(deal.id, s.id)}>
                {s.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!contact} onSelect={() => contact && onOpenFicha(contact.id)}>
              Abrir ficha
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!contact} onSelect={() => contact && onOpenConversation(contact.id)}>
              Abrir conversa
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {onEditDeal && (
              <>
                <DropdownMenuItem onSelect={() => onEditDeal(deal)}>Editar negócio</DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem variant="destructive" onSelect={() => onMarkLost(deal)}>
              Marcar como perdido
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-sm leading-snug text-foreground">{deal.title}</p>
      <p className="font-mono text-sm font-semibold tabular-nums text-foreground">{brl(deal.value)}</p>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{relativeTime(deal.stageChangedAt)}</span>
        {stale && (
          <Badge className="border-transparent bg-attention/15 text-attention">
            Parado há {daysSince(deal.stageChangedAt)}d
          </Badge>
        )}
      </div>
    </div>
  );
}
