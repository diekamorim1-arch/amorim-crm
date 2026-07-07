// Barra superior — busca global, tema, sino de notificações (decorativo) e
// troca de sessão.

import { Bell } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { SessionSwitcher } from "@/components/layout/SessionSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { tenantScope } from "@/lib/selectors";
import { useCrm } from "@/lib/store";

export function Topbar() {
  const { state } = useCrm();
  const unreadCount = tenantScope(state).conversations.reduce((sum, c) => sum + c.unread, 0);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background px-4">
      <div className="flex-1">
        <GlobalSearch />
      </div>

      <ThemeToggle />

      <DropdownMenu>
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
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Notificações</DropdownMenuLabel>
          <p className="px-2 pb-2 text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} conversa${unreadCount > 1 ? "s" : ""} não lida${unreadCount > 1 ? "s" : ""}.`
              : "Nenhuma notificação nova."}
          </p>
        </DropdownMenuContent>
      </DropdownMenu>

      <SessionSwitcher />
    </header>
  );
}
