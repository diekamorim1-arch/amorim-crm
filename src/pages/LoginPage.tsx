import { type FormEvent } from "react";
import { useNavigate } from "react-router";

import amorimMarkBlack from "@/assets/amorim-mark-black.png";
import amorimMarkWhite from "@/assets/amorim-mark-white.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCrm } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import type { Role, User } from "@/lib/types";

function tenantNameFor(state: ReturnType<typeof useCrm>["state"], user: User | undefined): string | null {
  if (!user?.tenantId) return null;
  return state.tenants.find((t) => t.id === user.tenantId)?.name ?? null;
}

export function LoginPage() {
  const { state, dispatch } = useCrm();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const atendente = state.users.find((u) => u.role === "atendente" && u.name === "Juliana Costa");
  const gestor = state.users.find((u) => u.role === "gestor" && u.name === "Rafael Amorim");
  const adminSaas = state.users.find((u) => u.role === "admin_saas" && u.name === "Diego Amorim");

  const quickAccessUsers: { user: User | undefined; roleLabel: string }[] = [
    { user: atendente, roleLabel: "Atendente" },
    { user: gestor, roleLabel: "Gestor" },
    { user: adminSaas, roleLabel: "Admin do SaaS" },
  ];

  function handleQuickLogin(role: Role, userId: string | undefined) {
    if (!userId) return;
    dispatch({ type: "LOGIN", userId });
    navigate(role === "atendente" ? "/pipeline" : role === "admin_saas" ? "/admin" : "/", { replace: true });
  }

  function handleDecorativeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-10 bg-background px-4 py-12">
      <div className="flex flex-col items-center gap-3">
        <img
          src={theme === "dark" ? amorimMarkWhite : amorimMarkBlack}
          alt="Amorim CRM"
          className="h-10 w-auto"
        />
        <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground">
          Amorim CRM
        </h1>
      </div>

      <div className="grid w-full max-w-4xl gap-8 md:grid-cols-[minmax(0,280px)_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Entrar</CardTitle>
            <CardDescription>Acesse com seu e-mail e senha.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleDecorativeSubmit}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" placeholder="voce@sualoja.com.br" autoComplete="email" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" placeholder="••••••••" autoComplete="current-password" />
              </div>
              <Button type="submit" className="mt-2">
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            Ou entre como um dos usuários de demonstração
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {quickAccessUsers.map(({ user, roleLabel }) =>
              user ? (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleQuickLogin(user.role, user.id)}
                  className="flex flex-col items-start gap-1 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="text-xs font-medium text-muted-foreground">{roleLabel}</span>
                  <span className="font-display text-base font-semibold text-foreground">{user.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {tenantNameFor(state, user) ?? "Sem loja ativa"}
                  </span>
                </button>
              ) : null,
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
