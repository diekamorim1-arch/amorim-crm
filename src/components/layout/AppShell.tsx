// Envolve todas as rotas autenticadas: aplica o guard de sessão/papel e monta
// o layout (sidebar desktop + topbar + bottom-bar mobile).

import { Navigate, Outlet, useLocation } from "react-router";

import { MobileBottomNav, Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { useCrm } from "@/lib/store";

const ATENDENTE_ALLOWED_BASES = ["/pipeline", "/inbox", "/clientes", "/agenda", "/whatsapp", "/fornecedores"];

export function AppShell() {
  const { state, dispatch } = useCrm();
  const location = useLocation();
  const session = state.session;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const path = location.pathname;

  if (session.role === "admin_saas" && !session.tenantId) {
    if (path !== "/admin") return <Navigate to="/admin" replace />;
  } else if (session.role === "atendente") {
    const allowed = ATENDENTE_ALLOWED_BASES.some((base) => path === base || path.startsWith(`${base}/`));
    if (!allowed) return <Navigate to="/pipeline" replace />;
  } else if (session.role === "gestor" && path === "/admin") {
    return <Navigate to="/" replace />;
  }

  // Impersonação: ENTER_TENANT_AS_GESTOR troca `role` para "gestor" e seta o
  // `tenantId` da loja visitada, mas mantém o `userId` original do admin_saas.
  // Detectamos a impersonação comparando o papel da sessão com o papel real
  // do usuário por trás dela — se divergem, é um admin_saas "vestindo" um
  // gestor. "Voltar ao painel" só precisa de SWITCH_SESSION nesse mesmo
  // userId: como o User original nunca mudou, a sessão volta a ser admin_saas
  // sem tenant.
  const realUser = state.users.find((u) => u.id === session.userId);
  const isImpersonating = session.role === "gestor" && realUser?.role === "admin_saas";
  const impersonatedTenant = isImpersonating
    ? state.tenants.find((t) => t.id === session.tenantId)
    : undefined;

  function handleExitImpersonation() {
    dispatch({ type: "SWITCH_SESSION", userId: session!.userId });
  }

  return (
    <div className="flex min-h-svh flex-col">
      {isImpersonating && (
        <div className="flex items-center justify-between gap-3 border-b border-primary/30 bg-primary/10 px-4 py-2 text-sm">
          <span className="text-foreground">
            Você está vendo <span className="font-medium">{impersonatedTenant?.name ?? "a loja"}</span> como Admin.
          </span>
          <Button type="button" variant="outline" size="sm" onClick={handleExitImpersonation}>
            Voltar ao painel
          </Button>
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <Sidebar role={session.role} />
        <div className="flex min-h-svh min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="min-w-0 flex-1 px-4 pt-6 pb-24 md:pb-6">
            <Outlet />
          </main>
        </div>
        <MobileBottomNav role={session.role} />
      </div>
    </div>
  );
}
