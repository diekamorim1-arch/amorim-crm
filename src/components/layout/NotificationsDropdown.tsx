// NotificationsDropdown — sino de notificações real: lista as atividades
// mais recentes do tenant (mensagem, mudança de estágio, nota, agendamento,
// venda — mesma tabela que ActivityTimeline já usa por contato, aqui pro
// tenant inteiro via GET /activities/recent). Contagem de "não lidas" não
// usa uma tabela de leitura por item (complexo demais pro tamanho do app):
// guarda só um timestamp `notifications_last_seen_at` por usuário, atualizado
// quando o dropdown abre — atividades criadas depois desse timestamp contam
// como novas.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Bell } from "lucide-react";

import { ACTIVITY_ICONS } from "@/components/contacts/ActivityTimeline";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, mapActivity, mapUser } from "@/lib/apiClient";
import { relativeTime } from "@/lib/format";
import { currentUser } from "@/lib/selectors";
import { useCrm } from "@/lib/store";
import type { Activity } from "@/lib/types";

const RECENT_LIMIT = 20;

export function NotificationsDropdown() {
  const { state, dispatch, dataVersion } = useCrm();
  const navigate = useNavigate();
  const me = currentUser(state);
  const [remoteActivities, setRemoteActivities] = useState<Activity[]>([]);

  useEffect(() => {
    let active = true;
    api.listRecentActivities(RECENT_LIMIT).then((rows) => {
      if (active) setRemoteActivities(rows.map(mapActivity));
    });
    return () => {
      active = false;
    };
  }, [dataVersion]);

  const activities = remoteActivities.slice(0, RECENT_LIMIT);

  const lastSeenAt = me?.notificationsLastSeenAt ? new Date(me.notificationsLastSeenAt).getTime() : 0;
  const unreadCount = activities.filter((a) => new Date(a.createdAt).getTime() > lastSeenAt).length;

  async function handleOpenChange(open: boolean) {
    if (!open || !me || unreadCount === 0) return;

    const updated = await api.markNotificationsSeen();
    dispatch({ type: "UPDATE_USER", user: mapUser(updated) });
  }

  function handleActivityClick(activity: Activity) {
    navigate(`/clientes/${activity.contactId}`);
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Notificações"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notificações</DropdownMenuLabel>
        {activities.length === 0 ? (
          <p className="px-2 pb-2 text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
        ) : (
          <div className="flex max-h-96 flex-col gap-1 overflow-y-auto px-1 pb-1">
            {activities.map((activity) => {
              const Icon = ACTIVITY_ICONS[activity.type];
              const isUnread = new Date(activity.createdAt).getTime() > lastSeenAt;
              return (
                <DropdownMenuItem
                  key={activity.id}
                  onSelect={() => handleActivityClick(activity)}
                  className="items-start gap-3 py-2"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="text-sm leading-snug text-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{relativeTime(activity.createdAt)}</p>
                  </div>
                  {isUnread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
