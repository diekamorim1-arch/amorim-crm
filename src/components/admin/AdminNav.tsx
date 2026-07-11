// AdminNav — navegação por abas entre as telas do painel admin_saas (Lojas,
// Usuários, e futuramente Planos). Cada aba é uma rota própria (não um
// TabsContent) — o valor ativo vem da URL atual, e trocar de aba navega.

import { useLocation, useNavigate } from "react-router";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { value: "lojas", path: "/admin", label: "Lojas" },
  { value: "usuarios", path: "/admin/usuarios", label: "Usuários" },
  { value: "planos", path: "/admin/planos", label: "Planos" },
];

export function AdminNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const current = TABS.find((tab) => tab.path === location.pathname)?.value ?? "lojas";

  return (
    <Tabs value={current} onValueChange={(value) => navigate(TABS.find((tab) => tab.value === value)!.path)}>
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
