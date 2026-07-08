# Amorim CRM

Protótipo de CRM multi-tenant para revendas Apple premium (WhatsApp, pipeline de vendas, agenda e ficha de clientes), construído para validar o produto "Amorim CRM" antes de qualquer investimento em backend.

**É um protótipo frontend-only**: não há servidor, banco de dados ou API. Todo o estado (tenants, usuários, contatos, negócios, conversas, agenda) é gerado por uma seed determinística em `src/lib/seed.ts` e persistido no `localStorage` do navegador (`src/lib/store.tsx`). Use "Resetar demo" no menu do usuário para descartar qualquer alteração e voltar ao estado inicial.

## Stack

- **React 19** + **TypeScript** + **Vite**
- **React Router 8** para navegação
- **Tailwind CSS 4** + **shadcn/ui** (Radix primitives) para os componentes
- **Vitest** para testes unitários
- **Oxlint** para lint

Tipografia: Inter (corpo), Bricolage Grotesque (títulos/display) e Geist Mono (valores em R$, telefones, horários) via `@fontsource-variable/*`. Veja `docs/design-direction.md` para o contrato visual completo.

## Rodando localmente

```bash
npm install
npm run dev       # servidor de desenvolvimento (http://localhost:5173)
npm run build     # typecheck (tsc -b) + build de produção (vite build)
npm run preview   # serve o build de produção localmente
npm run test      # roda a suíte de testes (vitest run)
npm run lint      # lint (oxlint)
```

## Estrutura

```
src/
  components/   componentes de UI, organizados por área (inbox, pipeline, agenda, contacts, dashboard, settings, admin, layout, ui/ para primitivos shadcn)
  lib/          estado global (store.tsx), seed de demonstração (seed.ts), seletores (selectors.ts), tipos (types.ts), constantes/labels pt-BR (constants.ts)
  pages/        uma página por rota
docs/           documentação de design e especificação do produto
```

## Contas de demonstração

A tela de login oferece acesso rápido a três papéis (atendente, gestor, admin do SaaS) que refletem os dados seed de duas lojas fictícias: **Amorim Imports** e **TechStore SP**. Cada papel enxerga apenas os dados do seu próprio tenant — o admin do SaaS pode entrar como gestor de qualquer loja (impersonação) e voltar ao painel a qualquer momento.
