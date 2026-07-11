// SettingsPage — hub de configurações da loja (gestor). Cada aba é um
// componente próprio recebendo tenant/users por props; esta página resolve o
// tenant ativo via API (não existe um jeito confiável de ler isso do state
// global — state.tenants nunca é populado numa sessão real, só a listagem
// completa que AdminTenantsPage busca pra si mesma) e monta a navegação por
// abas. onTenantUpdated deixa StoreTab/FunnelTagsTab refletirem a resposta da
// API que salvou a mudança, sem precisar recarregar a página.

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AccountTab } from "@/components/settings/AccountTab";
import { FunnelTagsTab } from "@/components/settings/FunnelTagsTab";
import { IntegrationsTab } from "@/components/settings/IntegrationsTab";
import { StoreTab } from "@/components/settings/StoreTab";
import { TeamTab } from "@/components/settings/TeamTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, mapTenant } from "@/lib/apiClient";
import { tenantScope } from "@/lib/selectors";
import { useCrm } from "@/lib/store";
import type { Tenant } from "@/lib/types";

export function SettingsPage() {
  const { state } = useCrm();
  const [tab, setTab] = useState("loja");
  const [tenant, setTenant] = useState<Tenant | null>(null);

  const tenantId = state.session?.tenantId;
  const users = tenantScope(state).users;

  useEffect(() => {
    if (!tenantId) {
      setTenant(null);
      return;
    }
    let active = true;
    api
      .getTenant(tenantId)
      .then((row) => active && setTenant(mapTenant(row)))
      .catch(() => active && toast.error("Não foi possível carregar os dados da loja."));
    return () => {
      active = false;
    };
  }, [tenantId]);

  if (!tenant) return null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Configurações</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="loja">Loja</TabsTrigger>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
          <TabsTrigger value="funil-tags">Funil e tags</TabsTrigger>
          <TabsTrigger value="conta">Conta</TabsTrigger>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
        </TabsList>

        <TabsContent value="loja" className="mt-4">
          <StoreTab tenant={tenant} onTenantUpdated={setTenant} />
        </TabsContent>
        <TabsContent value="equipe" className="mt-4">
          <TeamTab users={users} />
        </TabsContent>
        <TabsContent value="funil-tags" className="mt-4">
          <FunnelTagsTab tenant={tenant} onTenantUpdated={setTenant} />
        </TabsContent>
        <TabsContent value="conta" className="mt-4">
          <AccountTab />
        </TabsContent>
        <TabsContent value="integracoes" className="mt-4">
          <IntegrationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
