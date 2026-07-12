// Barra superior — busca global, tema, sino de notificações (atividades
// reais do tenant, ver NotificationsDropdown) e troca de sessão.

import { useNavigate } from "react-router";
import { Undo2 } from "lucide-react";

import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { NotificationsDropdown } from "@/components/layout/NotificationsDropdown";
import { SessionSwitcher } from "@/components/layout/SessionSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useCrm } from "@/lib/store";

export function Topbar() {
  const { state, dispatch } = useCrm();
  const navigate = useNavigate();
  // Lido direto de session.realRole (não via isImpersonating()) e fixo aqui
  // na Topbar — sempre renderizada em toda tela do AppShell — pra esse
  // controle nunca depender só do banner condicional de impersonação nem
  // de um único cálculo pra aparecer (ver EXIT_IMPERSONATION em store.tsx).
  const impersonating = state.session?.realRole === "admin_saas";

  function handleExitImpersonation() {
    dispatch({ type: "EXIT_IMPERSONATION" });
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background px-4">
      <div className="min-w-0 flex-1">
        <GlobalSearch />
      </div>

      {impersonating && (
        <Button type="button" variant="outline" size="sm" onClick={handleExitImpersonation} className="gap-1.5">
          <Undo2 />
          <span className="hidden sm:inline">Voltar ao painel</span>
        </Button>
      )}
      <ThemeToggle />
      <NotificationsDropdown />
      <SessionSwitcher />
    </header>
  );
}
