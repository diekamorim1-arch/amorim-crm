// Envolve todas as rotas autenticadas: aplica o guard de sessão/papel e monta
// o layout (sidebar desktop + topbar + bottom-bar mobile).

import { Navigate, Outlet, useLocation } from "react-router";

import { MobileBottomNav, Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useCrm } from "@/lib/store";

const ATENDENTE_ALLOWED_BASES = ["/pipeline", "/inbox", "/clientes", "/agenda"];

export function AppShell() {
  const { state } = useCrm();
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

  return (
    <div className="flex min-h-svh">
      <Sidebar role={session.role} />
      <div className="flex min-h-svh flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 pt-6 pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav role={session.role} />
    </div>
  );
}
