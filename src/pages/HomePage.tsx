// HomePage — hub de entrada pro admin_saas sem tenant ativo (não impersonando
// loja nenhuma no momento). Antes disso, "/" sempre renderizava DashboardPage
// pra qualquer papel, inclusive admin_saas — que via um Dashboard todo zerado
// (sem loja ativa, nada ali fazia sentido). App.tsx decide entre esta página
// e DashboardPage conforme o papel/tenant da sessão.

import { useNavigate } from "react-router";
import { CreditCard, Store, Users } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { currentUser } from "@/lib/selectors";
import { useCrm } from "@/lib/store";

const CARDS = [
  { to: "/admin", label: "Lojas", description: "Ver, criar e entrar como gestor de qualquer loja.", icon: Store },
  { to: "/admin/usuarios", label: "Usuários", description: "Time de todas as lojas, agrupado por loja.", icon: Users },
  { to: "/admin/planos", label: "Planos", description: "Billing manual e status de cada loja.", icon: CreditCard },
];

export function HomePage() {
  const { state } = useCrm();
  const navigate = useNavigate();
  const me = currentUser(state);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Olá, {me?.name ?? "Admin"}
        </h1>
        <p className="text-sm text-muted-foreground">Escolha o que gerenciar na plataforma.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map(({ to, label, description, icon: Icon }) => (
          <Card
            key={to}
            role="button"
            tabIndex={0}
            onClick={() => navigate(to)}
            onKeyDown={(event) => event.key === "Enter" && navigate(to)}
            className="cursor-pointer rounded-xl transition-colors hover:bg-accent/50"
          >
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <span className="font-medium text-foreground">{label}</span>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
