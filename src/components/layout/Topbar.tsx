// Barra superior — busca global, tema, sino de notificações (atividades
// reais do tenant, ver NotificationsDropdown) e troca de sessão.

import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { NotificationsDropdown } from "@/components/layout/NotificationsDropdown";
import { SessionSwitcher } from "@/components/layout/SessionSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background px-4">
      <div className="min-w-0 flex-1">
        <GlobalSearch />
      </div>

      <ThemeToggle />
      <NotificationsDropdown />
      <SessionSwitcher />
    </header>
  );
}
