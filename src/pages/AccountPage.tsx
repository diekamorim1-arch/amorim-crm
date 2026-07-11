// AccountPage — rota dedicada "/conta": mesma aba de conta que existe dentro
// de Configurações, mas sem depender de um tenant carregado. Existe porque
// admin_saas sem loja ativa não tem como abrir a aba "Conta" de dentro de
// SettingsPage (que faz `if (!tenant) return null` antes de renderizar
// qualquer aba) — e também serve como destino único pro clique no
// nome/avatar no Topbar, pra qualquer papel, sem precisar navegar até
// Configurações primeiro.

import { AccountTab } from "@/components/settings/AccountTab";

export function AccountPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Minha conta</h1>
        <p className="text-sm text-muted-foreground">Nome, foto, e-mail e senha da sua própria conta.</p>
      </div>
      <AccountTab />
    </div>
  );
}
