// Envolve todas as rotas autenticadas: aplica o guard de sessão/papel e monta
// o layout (sidebar desktop + topbar + bottom-bar mobile).

import { Navigate, Outlet, useLocation, useNavigate } from "react-router";

import { MobileBottomNav, Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { isImpersonating } from "@/lib/selectors";
import { useCrm } from "@/lib/store";

const ATENDENTE_ALLOWED_BASES = ["/pipeline", "/inbox", "/clientes", "/agenda", "/whatsapp", "/fornecedores", "/conta"];

export function AppShell() {
  const { state, dispatch } = useCrm();
  const location = useLocation();
  const navigate = useNavigate();
  const session = state.session;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const path = location.pathname;
  const isAdminWithoutTenant = session.role === "admin_saas" && !session.tenantId;
  const impersonating = isImpersonating(state);

  function handleExitImpersonation() {
    dispatch({ type: "EXIT_IMPERSONATION" });
    navigate("/admin");
  }

  if (session.role === "atendente") {
    const allowed = ATENDENTE_ALLOWED_BASES.some((base) => path === base || path.startsWith(`${base}/`));
    if (!allowed) return <Navigate to="/pipeline" replace />;
  } else if (session.role === "gestor" && path.startsWith("/admin")) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-svh flex-col">
      {impersonating && (
        // Barra informativa normal enquanto o admin está intencionalmente
        // dentro de uma loja (Entrar como gestor) — diferente do banner de
        // resincronização abaixo, que sinaliza uma perda de contexto. Os dois
        // não aparecem juntos: impersonating implica session.tenantId
        // presente, então isAdminWithoutTenant é sempre falso aqui.
        <div className="flex items-center justify-between gap-3 border-b border-primary/30 bg-primary/10 px-4 py-2 text-sm">
          <span className="text-foreground">
            Você está vendo <strong>{session.tenantName ?? "esta loja"}</strong> como Admin.
          </span>
          <Button type="button" variant="outline" size="sm" onClick={handleExitImpersonation}>
            Voltar ao painel
          </Button>
        </div>
      )}
      {isAdminWithoutTenant && !path.startsWith("/admin") && (
        // Antes navegava sozinho pro /admin sempre que a sessão não tinha
        // tenant — inclusive quando isso acontecia por engano no meio do
        // trabalho (ver fix de SET_AUTH_SESSION em store.tsx). Agora só
        // avisa e deixa a pessoa decidir; a tela por trás fica com os dados
        // do tenant vazios (tenantScope já trata tenantId ausente assim).
        <div className="flex items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm">
          <span className="text-foreground">Sua sessão de loja foi resincronizada — voltar ao painel de lojas?</span>
          <Button type="button" variant="outline" size="sm" onClick={() => navigate("/admin")}>
            Ir para Lojas
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
