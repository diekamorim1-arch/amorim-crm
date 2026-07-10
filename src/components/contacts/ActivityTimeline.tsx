// ActivityTimeline — histórico cronológico (mais recente primeiro) de um
// contato: mensagens, mudanças de estágio, notas, agendamentos e vendas. Numa
// sessão real busca as activities direto da API (não há endpoint de listagem
// por tenant inteiro, só por contactId — daí o fetch ser local a este
// componente); no modo demo continua lendo do store como antes.

import { useEffect, useState } from "react";
import {
  ArrowRightLeft,
  CalendarClock,
  MessageCircle,
  ShoppingBag,
  StickyNote,
  type LucideIcon,
} from "lucide-react";

import { api, mapActivity } from "@/lib/apiClient";
import { relativeTime } from "@/lib/format";
import { tenantScope } from "@/lib/selectors";
import { useCrm } from "@/lib/store";
import type { Activity, ActivityType } from "@/lib/types";

const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  mensagem: MessageCircle,
  mudanca_estagio: ArrowRightLeft,
  nota: StickyNote,
  agendamento: CalendarClock,
  venda: ShoppingBag,
};

interface ActivityTimelineProps {
  contactId: string;
}

export function ActivityTimeline({ contactId }: ActivityTimelineProps) {
  const { state, dataVersion } = useCrm();
  const [remoteActivities, setRemoteActivities] = useState<Activity[]>([]);

  useEffect(() => {
    if (!state.isRealSession) return;
    let active = true;
    api.listActivities(contactId).then((rows) => {
      if (active) setRemoteActivities(rows.map(mapActivity));
    });
    return () => {
      active = false;
    };
  }, [contactId, state.isRealSession, dataVersion]);

  const activities = (
    state.isRealSession ? remoteActivities : tenantScope(state).activities.filter((a) => a.contactId === contactId)
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-10 text-center">
        <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-4">
      {activities.map((activity) => {
        const Icon = ACTIVITY_ICONS[activity.type];
        return (
          <li key={activity.id} className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5 pt-1.5">
              <p className="text-sm leading-snug text-foreground">{activity.description}</p>
              <p className="text-xs text-muted-foreground">{relativeTime(activity.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
