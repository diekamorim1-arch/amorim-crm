// SettingsPage — hub de configurações da loja (gestor). Cada aba é um
// componente próprio recebendo tenant/users/dispatch por props; esta página
// só resolve o tenant/escopo atuais e monta a navegação por abas.

import { useState } from "react";

import { FunnelTagsTab } from "@/components/settings/FunnelTagsTab";
import { StoreTab } from "@/components/settings/StoreTab";
import { TeamTab } from "@/components/settings/TeamTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { tenantScope } from "@/lib/selectors";
import { useCrm } from "@/lib/store";

export function SettingsPage() {
  const { state, dispatch } = useCrm();
  const [tab, setTab] = useState("loja");

  const tenant = state.tenants.find((t) => t.id === state.session?.tenantId);
  const users = tenantScope(state).users;

  if (!tenant) return null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Configurações</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="loja">Loja</TabsTrigger>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
          <TabsTrigger value="funil-tags">Funil e tags</TabsTrigger>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <TabsTrigger value="integracoes" disabled>
                    Integrações
                  </TabsTrigger>
                </span>
              </TooltipTrigger>
              <TooltipContent>Em breve — Leva 2</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </TabsList>

        <TabsContent value="loja" className="mt-4">
          <StoreTab tenant={tenant} dispatch={dispatch} />
        </TabsContent>
        <TabsContent value="equipe" className="mt-4">
          <TeamTab tenant={tenant} users={users} dispatch={dispatch} />
        </TabsContent>
        <TabsContent value="funil-tags" className="mt-4">
          <FunnelTagsTab tenant={tenant} dispatch={dispatch} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
