# Amorim CRM — Protótipo Leva 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protótipo web navegável do Amorim CRM — SaaS multitenant para lojas Apple de intermediação — com 10 telas, dados simulados e o fluxo-demo lead→cliente recorrente funcionando de ponta a ponta.

**Architecture:** SPA client-side (Vite + React Router). Estado central em Context + reducer com persistência em localStorage e seed realista; toda entidade carrega `tenantId` espelhando o futuro schema Postgres/RLS. Sem backend nesta leva.

**Tech Stack:** Vite, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, React Router 7, lucide-react, sonner (toasts), vitest (lógica do store).

**Spec:** `docs/superpowers/specs/2026-07-07-amorim-crm-saas-design.md` (cópia dentro do repo em `docs/`)

## Global Constraints

- Projeto novo em `D:\Skills Claude\amorim-crm`; o v1 `crm-apple-store` NÃO é tocado (referência apenas).
- Todo texto de UI em **pt-BR**. Domínio de loja: *cliente, agendamento, loja* (nunca paciente/consulta/consultório).
- Toda entidade persistida tem `id`, `tenantId`, `createdAt` (exceto `Tenant` e `User` global admin, `tenantId: null`).
- Funil fixo de 5 colunas: `novo_lead` → `em_atendimento` → `negociacao` → `fechamento` → `pos_venda`. "Perdido" é `outcome`, não coluna.
- Papéis: `atendente` (sem Dashboard/Config/Conexões alheias), `gestor` (tudo do tenant), `admin_saas` (painel de tenants + entrar como gestor).
- Responsivo: funcional em 375px, 768px e 1280px. Modo claro/escuro.
- Datas do seed sempre relativas a `Date.now()` (nunca hardcoded).
- Gate de cada task: `npm run build` (tsc -b + vite build) limpo antes do commit.
- Skills durante execução: `frontend-design`/`impeccable` guiam a direção visual (Task 3), `shadcn` para componentes, `dataviz` antes de qualquer gráfico (Task 8).

---

### Task 1: Scaffold do projeto

**Files:**
- Create: `amorim-crm/` (raiz do repo git), `amorim-crm/vite.config.ts`, `amorim-crm/src/index.css`, `amorim-crm/components.json`, `amorim-crm/docs/` (cópias do spec e deste plano), `D:\Skills Claude\.claude\launch.json`
- Copy: logos do v1 `crm-apple-store/src/assets/amorim-mark-{black,white}.png` → `amorim-crm/src/assets/`

**Interfaces:**
- Produces: alias `@/` → `src/`; Tailwind 4 via `@tailwindcss/vite`; shadcn/ui inicializado (style "new-york", baseColor "neutral", cssVariables true); scripts npm `dev|build|lint|test`.

- [ ] **Step 1:** `npm create vite@latest amorim-crm -- --template react-ts` em `D:\Skills Claude`, depois `npm i` e instalar deps:
  `npm i react-router tailwindcss @tailwindcss/vite lucide-react sonner clsx tailwind-merge class-variance-authority @fontsource-variable/inter`
  `npm i -D vitest @types/node`
- [ ] **Step 2:** Configurar `vite.config.ts` com plugin react + tailwindcss + alias `@`; `tsconfig.app.json` com `baseUrl`/`paths`; `src/index.css` com `@import "tailwindcss";` e tokens de tema (Task 3 refina).
- [ ] **Step 3:** `npx shadcn@latest init` e adicionar componentes base:
  `npx shadcn@latest add button badge input label select dialog dropdown-menu avatar separator table tabs textarea tooltip card sheet scroll-area switch popover command calendar sonner`
- [ ] **Step 4:** Copiar logos do v1; criar `docs/` no repo com cópias do spec e deste plano; criar `D:\Skills Claude\.claude\launch.json` com config `amorim-crm` (`npm --prefix amorim-crm run dev`, port 5173).
- [ ] **Step 5:** Verificar: `npm run build` limpo; `npm run dev` renderiza página placeholder "Amorim CRM".
- [ ] **Step 6:** `git init` + commit inicial `chore: scaffold Vite + Tailwind 4 + shadcn/ui`.

---

### Task 2: Modelo de dados, store e seed

**Files:**
- Create: `src/lib/types.ts`, `src/lib/constants.ts`, `src/lib/seed.ts`, `src/lib/store.tsx`, `src/lib/selectors.ts`, `src/lib/format.ts`, `src/lib/store.test.ts`

**Interfaces (Produces — contrato para TODAS as tasks seguintes):**

```ts
// types.ts (completo)
export type Role = "atendente" | "gestor" | "admin_saas";
export type Stage = "novo_lead" | "em_atendimento" | "negociacao" | "fechamento" | "pos_venda";
export type Outcome = "aberto" | "ganho" | "perdido";
export type LossReason = "preco" | "prazo_entrega" | "sem_modelo" | "concorrencia" | "sem_resposta" | "desistiu";
export type JourneyStatus = "lead" | "cliente" | "recorrente";
export type Origin = "instagram_organico" | "instagram_ads" | "whatsapp_direto" | "indicacao" | "outro";
export type ProductLine = "iphone" | "ipad" | "mac" | "watch" | "airpods" | "acessorios";
export type PaymentMethod = "pix" | "cartao_avista" | "cartao_parcelado" | "boleto";
export type AppointmentType = "entrega" | "retirada" | "atendimento" | "follow_up";
export type AppointmentStatus = "agendado" | "concluido" | "cancelado";
export type ConnectionStatus = "desconectado" | "pareando" | "conectado";
export type ActivityType = "mensagem" | "mudanca_estagio" | "nota" | "agendamento" | "venda";

export interface Tenant { id: string; name: string; slug: string; plan: "starter" | "pro"; status: "ativo" | "suspenso"; createdAt: string;
  settings: { tags: string[]; lossReasons: LossReason[]; businessHours: string }; }
export interface User { id: string; tenantId: string | null; name: string; email: string; role: Role; avatarColor: string; createdAt: string; }
export interface Contact { id: string; tenantId: string; name: string; whatsapp: string; instagram?: string; email?: string; cpf?: string;
  address?: { street: string; city: string; state: string; zip: string };
  origin: Origin; interests: ProductLine[]; tags: string[]; journeyStatus: JourneyStatus;
  ownerId: string; firstContactAt: string; lastInteractionAt: string; createdAt: string; }
export interface Deal { id: string; tenantId: string; contactId: string; title: string; products: string; value: number;
  payment: PaymentMethod; tradeIn: boolean; tradeInDesc?: string; stage: Stage; outcome: Outcome;
  lossReason?: LossReason; ownerId: string; expectedCloseAt?: string; stageChangedAt: string; createdAt: string; }
export interface Conversation { id: string; tenantId: string; contactId: string; assigneeId: string | null;
  status: "aberta" | "resolvida"; unread: number; createdAt: string; }
export interface Message { id: string; tenantId: string; conversationId: string; direction: "in" | "out"; text: string;
  authorId?: string; status: "enviada" | "entregue" | "lida"; createdAt: string; }
export interface Appointment { id: string; tenantId: string; contactId: string; dealId?: string; type: AppointmentType;
  startsAt: string; endsAt: string; status: AppointmentStatus; ownerId: string; note?: string; createdAt: string; }
export interface Activity { id: string; tenantId: string; contactId: string; dealId?: string; userId: string;
  type: ActivityType; description: string; createdAt: string; }
export interface WhatsAppConnection { id: string; tenantId: string; userId: string; phone: string;
  status: ConnectionStatus; connectedAt?: string; createdAt: string; }
export interface Session { userId: string; tenantId: string; role: Role; }
export interface CrmState { tenants: Tenant[]; users: User[]; contacts: Contact[]; deals: Deal[]; conversations: Conversation[];
  messages: Message[]; appointments: Appointment[]; activities: Activity[]; connections: WhatsAppConnection[]; session: Session | null; }
```

```ts
// constants.ts — labels pt-BR centralizados
export const STAGES: { id: Stage; label: string }[] = [
  { id: "novo_lead", label: "Novo Lead" }, { id: "em_atendimento", label: "Em Atendimento" },
  { id: "negociacao", label: "Negociação" }, { id: "fechamento", label: "Fechamento" },
  { id: "pos_venda", label: "Pós-venda / Recompra" }];
export const LOSS_REASON_LABELS: Record<LossReason, string> = { preco: "Preço", prazo_entrega: "Prazo de entrega",
  sem_modelo: "Sem o modelo/cor", concorrencia: "Concorrência", sem_resposta: "Cliente sumiu", desistiu: "Desistiu da compra" };
// idem para Origin, ProductLine, PaymentMethod, AppointmentType, JourneyStatus, Role — todos com labels pt-BR
export const STALE_DAYS = 3;
```

```ts
// store.tsx — API pública
export type CrmAction =
  | { type: "LOGIN"; userId: string } | { type: "LOGOUT" }
  | { type: "SWITCH_SESSION"; userId: string }               // seletor de papel/tenant da demo
  | { type: "ENTER_TENANT_AS_GESTOR"; tenantId: string }     // admin_saas entra numa loja
  | { type: "MOVE_DEAL"; dealId: string; stage: Stage }       // p/ pos_venda ⇒ outcome ganho + journey update + activity "venda"
  | { type: "MARK_DEAL_LOST"; dealId: string; reason: LossReason }
  | { type: "ADD_CONTACT"; contact: Contact } | { type: "UPDATE_CONTACT"; contact: Contact }
  | { type: "ADD_DEAL"; deal: Deal }
  | { type: "SEND_MESSAGE"; conversationId: string; text: string; authorId: string }
  | { type: "RECEIVE_MESSAGE"; conversationId: string; text: string }
  | { type: "MARK_CONVERSATION_READ"; conversationId: string }
  | { type: "ASSIGN_CONVERSATION"; conversationId: string; assigneeId: string | null }
  | { type: "ADD_APPOINTMENT"; appointment: Appointment } | { type: "UPDATE_APPOINTMENT"; appointment: Appointment }
  | { type: "ADD_ACTIVITY"; activity: Activity }
  | { type: "SET_CONNECTION_STATUS"; connectionId: string; status: ConnectionStatus }
  | { type: "UPDATE_TENANT"; tenant: Tenant } | { type: "ADD_TENANT"; tenant: Tenant }
  | { type: "ADD_USER"; user: User } | { type: "UPDATE_USER"; user: User }
  | { type: "RESET_DEMO" };
export function CrmProvider({ children }: { children: ReactNode }): JSX.Element; // carrega localStorage ("amorim-crm-state-v1") com fallback p/ seed
export function useCrm(): { state: CrmState; dispatch: Dispatch<CrmAction> };
export function newId(prefix: string): string;
```

```ts
// selectors.ts — todos recebem state e retornam dados JÁ filtrados pelo tenant da sessão
export function tenantScope(state: CrmState): { contacts; deals; conversations; messages; appointments; activities; connections; users };
export function currentUser(state: CrmState): User | null;
export function dealsByStage(state: CrmState): Record<Stage, Deal[]>;   // só outcome !== "perdido"
export function lostDeals(state: CrmState): Deal[];
export function isStale(deal: Deal): boolean;                            // stageChangedAt > 3 dias e outcome "aberto"
export function contactById(state: CrmState, id: string): Contact | undefined;
export function conversationWithContact(state: CrmState, contactId: string): Conversation | undefined;
export function dashboardMetrics(state: CrmState): { newLeadsMonth: number; inNegotiationValue: number;
  revenueMonth: number; revenuePrevMonth: number; conversionRate: number;
  funnelCounts: { stage: Stage; count: number; value: number }[];
  byChannel: { origin: Origin; total: number; won: number }[];
  lossRanking: { reason: LossReason; count: number }[] };
// format.ts
export function brl(value: number): string;           // "R$ 8.499,00"
export function relativeTime(iso: string): string;    // "há 2 h", "ontem", "há 4 dias"
export function daysAgo(n: number, hour?: number): string; // ISO relativo a hoje (usado pelo seed)
```

**Regras de negócio do reducer (testadas):**
1. `MOVE_DEAL` (qualquer destino): atualiza `stageChangedAt` e cria Activity `mudanca_estagio`. Destino `pos_venda`: adicionalmente seta `outcome: "ganho"`, cria Activity `venda` e recalcula `journeyStatus` do contato (1 ganho ⇒ `cliente`, 2+ ⇒ `recorrente`).
2. `MARK_DEAL_LOST`: exige `reason`; seta `outcome: "perdido"` (deal some de `dealsByStage`, aparece em `lostDeals`).
3. `SEND_MESSAGE`/`RECEIVE_MESSAGE`: cria Message, atualiza `lastInteractionAt` do contato e cria Activity `mensagem`; `RECEIVE_MESSAGE` incrementa `unread`.
4. `RESET_DEMO`: limpa localStorage e restaura `buildSeed()` preservando a sessão atual.
5. Toda mutação persiste em localStorage (efeito no Provider); JSON inválido ⇒ fallback silencioso p/ seed.

**Seed (`buildSeed(): CrmState`):**
- Tenant 1 **Amorim Imports** (pro): gestor "Rafael Amorim", atendentes "Juliana Costa" e "Samuel Ferreira"; 14 contatos (5 leads, 5 clientes, 4 recorrentes) com nomes/telefones BR plausíveis; 12 deals (2 em cada estágio ativo + 2 ganhos históricos + 2 perdidos [preco, sem_resposta] + 1 em negociação com `stageChangedAt` = 4 dias atrás p/ badge); 8 conversas (2 não atribuídas com unread>0) com 6-12 mensagens cada usando linguagem real de negociação Apple (troca de usado, parcelamento, prazo, frete); 10 appointments na semana corrente (mistura dos 4 tipos, 2 hoje); activities coerentes com tudo; 2 connections (Juliana `conectado`, Samuel `desconectado`).
- Tenant 2 **TechStore SP** (starter): 1 gestor "Marcos Lima", 1 atendente "Ana Souza", 4 contatos, 3 deals, 2 conversas, 2 appointments — prova o isolamento.
- Admin SaaS: "Diego Amorim" (`tenantId: null`).
- Todas as datas via `daysAgo()`/`hoursAgo()` relativas a agora.

- [ ] **Step 1:** Escrever `types.ts`, `constants.ts`, `format.ts` conforme contratos acima.
- [ ] **Step 2:** Escrever testes em `store.test.ts` (vitest, sem DOM): mover deal p/ pos_venda ⇒ ganho + journey `cliente`; 2º ganho ⇒ `recorrente`; MARK_DEAL_LOST guarda motivo e some do board; SEND_MESSAGE atualiza lastInteractionAt; isStale true p/ 4 dias / false p/ 1 dia; buildSeed: todo registro de cada coleção tem tenantId válido e FKs existentes.
- [ ] **Step 3:** Rodar `npx vitest run` — falha (reducer não existe).
- [ ] **Step 4:** Implementar `store.tsx`, `selectors.ts`, `seed.ts`.
- [ ] **Step 5:** `npx vitest run` — verde. `npm run build` limpo.
- [ ] **Step 6:** Commit `feat: data model, store com reducer multitenant e seed realista`.

---

### Task 3: Shell do app — login fake, layout, navegação por papel, tema

**Files:**
- Create: `src/App.tsx` (rotas), `src/pages/LoginPage.tsx`, `src/components/layout/AppShell.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/Topbar.tsx`, `src/components/layout/SessionSwitcher.tsx`, `src/components/layout/GlobalSearch.tsx`, `src/components/layout/ThemeToggle.tsx`, `src/lib/theme.tsx`
- Modify: `src/main.tsx` (Provider + Router + Toaster), `src/index.css` (design tokens)

**Interfaces:**
- Consumes: `useCrm`, `Session`, `Role`, selectors.
- Produces: rotas nomeadas — `/login`, `/` (dashboard), `/pipeline`, `/inbox`, `/inbox/:conversationId`, `/clientes`, `/clientes/:contactId`, `/agenda`, `/config`, `/whatsapp`, `/admin`. Guard: sem sessão ⇒ `/login`; atendente em rota proibida ⇒ redirect `/pipeline`; admin_saas sem tenant ativo ⇒ `/admin`. Componente `<AppShell>` envolve todas as rotas autenticadas.

**Comportamento:**
- **Direção visual (invocar `frontend-design` antes deste task):** estética premium minimalista Apple-adjacent; Inter Variable; tokens claro/escuro em CSS variables no `index.css`; acento da marca Amorim; cantos `rounded-xl`; densidade generosa.
- **LoginPage:** logo Amorim, form e-mail/senha decorativo, 3 cards "Entrar como" (Atendente Juliana · Amorim Imports / Gestor Rafael · Amorim Imports / Admin do SaaS Diego) ⇒ `LOGIN` + navigate.
- **Sidebar (desktop):** itens por papel — atendente: Pipeline, Inbox, Clientes, Agenda; gestor: + Dashboard (primeiro), Configurações, WhatsApp; admin_saas: Lojas (admin). Colapsável. **Mobile (<768px):** bottom-bar com os 4-5 itens principais + sheet "mais".
- **Topbar:** GlobalSearch (Command palette — busca contatos/deals/conversas do tenant, navega ao selecionar), ThemeToggle, sino fake (badge count), SessionSwitcher (dropdown com todos os usuários seed agrupados por loja + admin; troca via `SWITCH_SESSION`).
- **Tema:** classe `dark` no `<html>`, persistida em localStorage, respeita `prefers-color-scheme` na 1ª visita.

- [ ] **Step 1:** Invocar skill `frontend-design`; definir tokens no `index.css`.
- [ ] **Step 2:** Implementar theme.tsx, LoginPage, AppShell, Sidebar, Topbar, SessionSwitcher, GlobalSearch, rotas com guards (páginas destino ainda placeholders com título).
- [ ] **Step 3:** Verificar via preview: login como cada papel mostra menu correto; guard funciona (URL /config como atendente redireciona); switcher troca tenant e papel; dark mode alterna; mobile 375px mostra bottom-bar.
- [ ] **Step 4:** `npm run build` limpo. Commit `feat: app shell com login fake, navegação por papel e tema`.

---

### Task 4: Pipeline Kanban

**Files:**
- Create: `src/pages/PipelinePage.tsx`, `src/components/pipeline/KanbanColumn.tsx`, `src/components/pipeline/DealCard.tsx`, `src/components/pipeline/AddLeadDialog.tsx`, `src/components/pipeline/MarkLostDialog.tsx`, `src/components/pipeline/LostDealsSheet.tsx`

**Interfaces:**
- Consumes: `dealsByStage`, `lostDeals`, `isStale`, `MOVE_DEAL`, `MARK_DEAL_LOST`, `ADD_CONTACT`+`ADD_DEAL`, `STAGES`, `brl`.

**Comportamento:**
- 5 colunas com header (label, contagem, soma `brl`), scroll horizontal no mobile com snap.
- Drag-and-drop nativo HTML5 (`draggable` + `onDragOver`/`onDrop` por coluna ⇒ `MOVE_DEAL`); coluna alvo ganha highlight. Fallback: menu no card "Mover para…".
- DealCard: título, contato (avatar + nome), valor, badge tempo no estágio; badge âmbar "Parado há Xd" quando `isStale`; menu: mover, marcar como perdido, abrir ficha, abrir conversa.
- Soltar em `pos_venda` ⇒ toast "Venda ganha! 🎉 {contato} agora é {cliente|recorrente}".
- MarkLostDialog: select de motivo obrigatório (labels de `LOSS_REASON_LABELS`), botão desabilitado sem motivo.
- LostDealsSheet: botão "Perdidos (N)" no header abre sheet com lista (título, valor, motivo, data).
- AddLeadDialog ("+ Novo lead"): nome*, WhatsApp*, origem, produto de interesse, valor estimado, responsável ⇒ cria Contact (journeyStatus `lead`) + Deal em `novo_lead` + Activity.

- [ ] **Step 1:** Implementar tudo acima.
- [ ] **Step 2:** Verificar via preview: arrastar card atualiza coluna e soma; deal seed parado 4d mostra badge; marcar perdido exige motivo e move p/ sheet; novo lead aparece na 1ª coluna; arrastar até pos_venda dispara toast e muda journeyStatus (conferir depois na lista de clientes); recarregar página preserva tudo (localStorage).
- [ ] **Step 3:** `npm run build` limpo. Commit `feat: pipeline kanban com drag-and-drop, perdidos e quick-add`.

---

### Task 5: Lista de clientes + Ficha do cliente

**Files:**
- Create: `src/pages/ContactsPage.tsx`, `src/pages/ContactDetailPage.tsx`, `src/components/contacts/ContactFormDialog.tsx`, `src/components/contacts/JourneyBadge.tsx`, `src/components/contacts/ActivityTimeline.tsx`

**Interfaces:**
- Consumes: `tenantScope`, `contactById`, `ADD_CONTACT`/`UPDATE_CONTACT`, labels de constants.
- Produces: `<JourneyBadge status={JourneyStatus}>` e `<ActivityTimeline contactId>` reutilizados pelo Inbox (Task 6).

**Comportamento:**
- **ContactsPage:** busca por nome/WhatsApp/@instagram; filtros (journeyStatus, tag, origem, responsável); tabela desktop (Nome+avatar, WhatsApp, Status, Última interação `relativeTime`, Responsável) que vira lista de cards no mobile; linha clica ⇒ ficha; botão "Novo cliente" abre ContactFormDialog (nome* e WhatsApp* obrigatórios com erro inline).
- **ContactDetailPage:** header com avatar grande, nome, JourneyBadge, tags, origem, botões "Abrir conversa" (navega `/inbox/:id` da conversa do contato; cria conversa se não existir) e "Editar". Abas: **Dados** (contato, CPF, endereço completo), **Negócios** (deals abertos c/ estágio), **Compras** (deals ganhos: produto, valor, data — total gasto no topo), **Agendamentos** (futuros e passados), **Timeline** (ActivityTimeline: ícone por tipo, descrição, `relativeTime`, mais recente primeiro).

- [ ] **Step 1:** Implementar tudo acima.
- [ ] **Step 2:** Verificar via preview: filtros combinam; cliente recorrente do seed mostra 2+ compras e total; editar persiste; "Abrir conversa" navega certo; mobile ok.
- [ ] **Step 3:** `npm run build` limpo. Commit `feat: lista de clientes e ficha completa com timeline`.

---

### Task 6: Inbox WhatsApp

**Files:**
- Create: `src/pages/InboxPage.tsx`, `src/components/inbox/ConversationList.tsx`, `src/components/inbox/ChatPane.tsx`, `src/components/inbox/MessageBubble.tsx`, `src/components/inbox/ContactPanel.tsx`, `src/components/inbox/QuickDealDialog.tsx`, `src/lib/fakeReply.ts`

**Interfaces:**
- Consumes: conversas/mensagens do escopo, `SEND_MESSAGE`/`RECEIVE_MESSAGE`/`ASSIGN_CONVERSATION`/`MARK_CONVERSATION_READ`, `JourneyBadge` (Task 5), `QuickDealDialog` reutiliza campos do AddLeadDialog (Task 4). Não depende da Task 7.
- Produces: `scheduleFakeReply(dispatch, conversationId): void` — após 3–6s aleatórios, dispara `RECEIVE_MESSAGE` com uma de ~8 respostas plausíveis de cliente ("Consigo por PIX?", "Tenho um 13 Pro pra dar de entrada…", etc.), sem repetir a última.

**Comportamento:**
- Layout 3 painéis (desktop ≥1024px): lista (w-80) | chat (flex-1) | contexto (w-80, colapsável). Mobile: navegação empilhada lista ⇒ chat (voltar), contexto vira sheet.
- **ConversationList:** abas Minhas / Não atribuídas / Todas; busca; item mostra avatar, nome, preview, hora `relativeTime`, badge unread verde.
- **ChatPane:** header (contato + botão assumir/atribuir); bolhas estilo WhatsApp (out: verde-accent alinhada à direita com ✓✓; in: superfície neutra à esquerda), separadores de dia ("Hoje", "Ontem", data); composer com textarea auto-grow, Enter envia; enviar ⇒ `SEND_MESSAGE` + `scheduleFakeReply`; abrir conversa ⇒ `MARK_CONVERSATION_READ`.
- **ContactPanel:** resumo (JourneyBadge, WhatsApp, origem, tags), negócio ativo (título, valor, estágio + select p/ mover), ações rápidas: Criar negócio (QuickDealDialog), Agendar (nesta task o botão navega para `/agenda`; a Task 7 troca por `<AppointmentDialog>` pré-preenchido), Abrir ficha.
- Conversa não atribuída aberta por atendente mostra banner "Assumir esta conversa".

- [ ] **Step 1:** Implementar tudo acima.
- [ ] **Step 2:** Verificar via preview: enviar mensagem mostra bolha própria e resposta fake chega em ~5s com unread na lista; assumir conversa move p/ aba Minhas; criar negócio pelo painel aparece no Pipeline; mobile empilha corretamente.
- [ ] **Step 3:** `npm run build` limpo. Commit `feat: inbox WhatsApp com chat simulado e painel de contexto`.

---

### Task 7: Agenda

**Files:**
- Create: `src/pages/AgendaPage.tsx`, `src/components/agenda/WeekGrid.tsx`, `src/components/agenda/TodayList.tsx`, `src/components/agenda/AppointmentDialog.tsx`

**Interfaces:**
- Consumes: appointments do escopo, `ADD_APPOINTMENT`/`UPDATE_APPOINTMENT`, contatos p/ combobox.
- Produces: `<AppointmentDialog contactId? dealId? open onOpenChange>` — reutilizado pelo ContactPanel (Task 6) e pela ficha (Task 5).

**Comportamento:**
- Header: navegação semana anterior/hoje/próxima; toggle Semana | Hoje (mobile default Hoje).
- **WeekGrid:** 7 colunas (Seg–Dom), slots 08h–20h; bloco colorido por tipo (entrega=accent, retirada=azul, atendimento=violeta, follow_up=âmbar) com nome do contato e hora; clicar abre AppointmentDialog em modo edição; dia atual destacado.
- **TodayList:** lista vertical ordenada por hora com tipo, contato (link p/ ficha), negócio vinculado, responsável e ações concluir/cancelar (`UPDATE_APPOINTMENT`).
- **AppointmentDialog:** tipo, contato (combobox com busca), negócio (select dos deals abertos do contato), data, hora início/fim, responsável, observação; validação: contato e horário obrigatórios.

- [ ] **Step 1:** Implementar tudo acima e trocar o botão "Agendar" do ContactPanel (Task 6) e da ficha (Task 5) pelo `<AppointmentDialog>` pré-preenchido com o contato.
- [ ] **Step 2:** Verificar via preview: seed mostra 2 itens hoje; criar agendamento pela ficha aparece na grade; agendar pelo Inbox pré-preenche o contato; concluir muda visual; semana navega.
- [ ] **Step 3:** `npm run build` limpo. Commit `feat: agenda semanal com agendamentos vinculados`.

---

### Task 8: Dashboard

**Files:**
- Create: `src/pages/DashboardPage.tsx`, `src/components/dashboard/MetricCard.tsx`, `src/components/dashboard/FunnelChart.tsx`, `src/components/dashboard/ChannelTable.tsx`, `src/components/dashboard/LossRanking.tsx`

**Interfaces:**
- Consumes: `dashboardMetrics`, `TodayList` (Task 7, variante compacta), conversas não atribuídas.

**Comportamento (invocar skill `dataviz` antes dos gráficos):**
- Linha 1 — 4 MetricCards: Leads novos no mês, Em negociação (R$ soma estágios negociacao+fechamento), Receita no mês (delta % vs mês anterior com seta), Taxa de conversão (ganhos ÷ deals criados, %).
- Linha 2 — FunnelChart: barras horizontais por estágio (count + valor), SVG puro com tokens do tema; ChannelTable: origem × leads × ganhos × taxa.
- Linha 3 — LossRanking (barras proporcionais por motivo); card "Conversas não atribuídas (N)" com link p/ Inbox; TodayList compacta.
- Grid responsivo: 4→2→1 colunas. Rota `/` visível só p/ gestor (guard da Task 3 já cobre).

- [ ] **Step 1:** Invocar skill `dataviz`; implementar tudo acima.
- [ ] **Step 2:** Verificar via preview: números batem com o seed (conferir manualmente 2-3 métricas); ganhar um deal no Pipeline atualiza Receita e Funil; dark mode ok nos gráficos.
- [ ] **Step 3:** `npm run build` limpo. Commit `feat: dashboard do gestor com métricas do funil`.

---

### Task 9: Configurações da loja

**Files:**
- Create: `src/pages/SettingsPage.tsx`, `src/components/settings/StoreTab.tsx`, `src/components/settings/TeamTab.tsx`, `src/components/settings/FunnelTagsTab.tsx`, `src/components/settings/InviteUserDialog.tsx`

**Interfaces:**
- Consumes: `UPDATE_TENANT`, `ADD_USER`/`UPDATE_USER`, tenant/users do escopo.

**Comportamento:**
- Abas: **Loja** (nome, slug read-only, horário de funcionamento, badge do plano; salvar ⇒ `UPDATE_TENANT` + toast), **Equipe** (tabela nome/e-mail/papel/status; editar papel via select inline; InviteUserDialog: nome, e-mail, papel [atendente|gestor] ⇒ `ADD_USER` + toast "Convite enviado (simulado)"), **Funil e Tags** (tags do tenant como chips add/remove; motivos de perda idem; nota "Estágios do funil personalizáveis na versão Pro" — YAGNI), aba **Integrações** desabilitada com tooltip "Em breve — Leva 2".

- [ ] **Step 1:** Implementar tudo acima.
- [ ] **Step 2:** Verificar via preview: renomear loja reflete na sidebar/topbar; convidar usuário aparece na equipe e no SessionSwitcher; tag nova disponível no ContactFormDialog.
- [ ] **Step 3:** `npm run build` limpo. Commit `feat: configurações da loja com equipe e tags`.

---

### Task 10: Conexão WhatsApp

**Files:**
- Create: `src/pages/WhatsAppPage.tsx`, `src/components/whatsapp/ConnectionCard.tsx`, `src/components/whatsapp/PairingDialog.tsx`, `src/components/whatsapp/FakeQr.tsx`

**Interfaces:**
- Consumes: connections do escopo, `SET_CONNECTION_STATUS`.

**Comportamento:**
- Grid de ConnectionCards (um por atendente/gestor do tenant): avatar, nome, número, indicador de status (verde pulsante conectado / cinza desconectado / âmbar pareando), "Conectado desde" `relativeTime`, botão Conectar/Desconectar.
- Gestor vê todos os cards; atendente só o próprio (rota visível p/ ambos, conteúdo filtrado).
- **PairingDialog:** passos numerados estilo WhatsApp Web ("Abra o WhatsApp no seu celular…"), FakeQr (SVG determinístico pseudo-QR gerado do userId), status `pareando` imediato; após 4s ⇒ `conectado`, check verde animado, toast "WhatsApp de {nome} conectado", dialog fecha em +1,5s. QR "expira" após 20s com botão regenerar.
- Card desconectado exibe aviso "Mensagens deste número não estão sendo recebidas".

- [ ] **Step 1:** Implementar tudo acima.
- [ ] **Step 2:** Verificar via preview: fluxo completo conectar/desconectar como gestor; como atendente Samuel vê só o próprio card; estado persiste ao recarregar.
- [ ] **Step 3:** `npm run build` limpo. Commit `feat: conexão WhatsApp com pareamento simulado`.

---

### Task 11: Painel Admin do SaaS

**Files:**
- Create: `src/pages/AdminTenantsPage.tsx`, `src/components/admin/TenantFormDialog.tsx`

**Interfaces:**
- Consumes: `tenants`/`users` globais (admin não tem escopo), `ADD_TENANT`, `ENTER_TENANT_AS_GESTOR`.

**Comportamento:**
- Cards de resumo (Lojas ativas, Usuários totais, distribuição por plano) + tabela: Loja, Plano (badge), Usuários (count), Status, Criada em, ações.
- Ação "Entrar como gestor" ⇒ `ENTER_TENANT_AS_GESTOR` (sessão vira gestor daquele tenant, banner no topo "Você está vendo Amorim Imports como Admin — Voltar ao painel").
- TenantFormDialog: nome, slug auto, plano ⇒ cria tenant + gestor padrão ("Gestor {nome}") + toast; loja nova abre vazia (estados vazios da Task 12 cobrem).

- [ ] **Step 1:** Implementar tudo acima (incluindo banner de impersonação no AppShell).
- [ ] **Step 2:** Verificar via preview: admin loga ⇒ `/admin`; entrar como gestor mostra dados do tenant certo; voltar ao painel restaura; criar loja aparece na tabela e no SessionSwitcher.
- [ ] **Step 3:** `npm run build` limpo. Commit `feat: painel admin de tenants com impersonação`.

---

### Task 12: Polimento, estados vazios e verificação final

**Files:**
- Create: `src/components/EmptyState.tsx`; Modify: páginas que listam dados; `src/components/layout/Topbar.tsx` (item "Resetar demo" no menu do usuário com AlertDialog de confirmação ⇒ `RESET_DEMO`).

**Comportamento:**
- `<EmptyState icon title description action?>` aplicado a: Inbox sem conversas na aba ("Nenhuma conversa não atribuída 🎉"), Pipeline sem deals na coluna, Clientes sem resultado de filtro, Agenda sem itens no dia, Perdidos vazio, tenant recém-criado em todas as telas.
- Passar skill `impeccable` nas telas: hierarquia, espaçamentos, contraste AA, foco visível, transições discretas.

- [ ] **Step 1:** Implementar EmptyState + reset de demo; aplicar impeccable.
- [ ] **Step 2:** **Corredor de validação completo via preview (espelha spec §9):** login atendente ⇒ Inbox: assumir conversa não atribuída, responder, receber resposta fake ⇒ criar negócio pelo painel ⇒ Pipeline: arrastar até Fechamento e depois Pós-venda (toast ganho) ⇒ Agendar entrega ⇒ Ficha mostra "Cliente" + compra ⇒ trocar p/ gestor: Dashboard reflete receita/conversão ⇒ trocar p/ TechStore SP: dados isolados ⇒ admin: criar loja e entrar como gestor.
- [ ] **Step 3:** Responsividade 375/768/1280 + dark mode em todas as telas (preview_resize); screenshots finais para o usuário.
- [ ] **Step 4:** `npm run build` + `npx vitest run` + lint limpos. Commit `feat: estados vazios, reset de demo e polimento final`.
