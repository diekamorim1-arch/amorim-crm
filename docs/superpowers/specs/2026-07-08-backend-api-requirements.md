# Requisitos de Backend por Feature — Amorim CRM

**Data:** 08/07/2026
**Status:** Design aprovado — documento de planejamento (sem código de backend ainda)
**Objetivo:** Mapear cada função do frontend (já implementado nas levas 1 e 1.1, rodando hoje sobre localStorage) para o endpoint de backend correspondente, guiando a futura implementação em FastAPI + Supabase + EvolutionAPI.

---

## 1. Arquitetura geral

**Stack:** FastAPI (Python) expõe a API REST consumida pelo frontend. Supabase fornece Postgres (persistência) e Auth (login/JWT). EvolutionAPI cuida da conexão real com o WhatsApp.

**Fluxo de autorização (decisão de arquitetura):** o FastAPI usa a **service-role key** da Supabase e decide tenant/papel em Python — a mesma responsabilidade que hoje o `tenantScope`/`currentUser` do frontend cumprem sobre o `CrmState`. As políticas RLS na Supabase continuam existindo com `tenant_id = auth.jwt() ->> 'tenant_id'` para o papel `authenticated`, como rede de segurança e para o dia em que o Supabase Realtime for ligado (Realtime respeita RLS; hoje ele não protege nada porque o FastAPI nunca passa pelo caminho `authenticated`/`anon`).

**Claims customizados:** ao criar/convidar um usuário, o FastAPI grava `tenant_id`/`role` no `app_metadata` do usuário via Supabase Admin API — esses dois campos passam a vir dentro do JWT emitido pela Supabase Auth em todo login seguinte.

**Fluxo do WhatsApp:** EvolutionAPI → webhook HTTP assinado → `POST /webhooks/evolution` no FastAPI → FastAPI aplica as regras de negócio (cria Activity, atualiza `last_interaction_at` do contato, incrementa `unread`) → grava na Supabase. Nenhuma credencial privilegiada da Supabase é dada à EvolutionAPI.

**Estrutura de pastas:**
```
backend/
  app/
    config.py                 # Settings (pydantic-settings) + load_dotenv
    main.py                   # cria app, registra routers, middlewares
    deps.py                   # Depends() compartilhados (get_current_user, get_db)
    core/
      auth.py                 # valida JWT da Supabase, extrai user_id/tenant_id/role
      supabase_client.py      # client Supabase (service role), singleton
      errors.py                # exceções -> {"error": {"code","message"}}
    modules/
      auth/          (router.py, schemas.py, service.py)
      tenants/                 # admin: CRUD de lojas, impersonação
      users/                   # equipe: convite, papel
      contacts/
      deals/
      suppliers/
      conversations/           # inbox + mensagens
      appointments/
      activities/              # timeline (majoritariamente leitura)
      connections/             # pareamento WhatsApp
      dashboard/               # métricas agregadas
      settings/                # config da loja (tags, motivos de perda, horário)
    webhooks/
      evolution.py
  tests/
    ...  (1 arquivo de teste por módulo, mesma convenção do frontend)
```

## 2. Autenticação e multitenancy

- **Login:** frontend chama `supabase.auth.signInWithPassword` diretamente contra a Supabase Auth (não passa pelo FastAPI) e recebe um JWT. Esse JWT vai em `Authorization: Bearer <jwt>` em toda chamada ao FastAPI dali em diante.
- **`GET /auth/me`** (FastAPI, todos os papéis): valida o JWT, retorna `{id, tenant_id, role, name, email, avatar_color}` — usado no boot do app para popular `currentUser`/`session` (substitui o `LOGIN`/`SWITCH_SESSION` do reducer atual).
- **Impersonação (`ENTER_TENANT_AS_GESTOR`):** `POST /tenants/{id}/impersonate` (só `admin_saas`) retorna um novo JWT com `tenant_id`/`role` trocados para aquele tenant como gestor — implementado via `supabase.auth.admin` mintando uma sessão com claims sobrescritos, ou (mais simples) o FastAPI emite seu próprio JWT de curta duração assinado com o mesmo segredo, só para essa sessão de impersonação. **Nota de implementação:** decisão fina de qual dos dois mecanismos usar fica para a fase de implementação — ambos atendem ao contrato do endpoint acima.
- **Convite de usuário (`ADD_USER`):** `POST /users/invite` (só `gestor`) cria o usuário via Supabase Admin API (e-mail + senha temporária ou magic link) e já grava `app_metadata.tenant_id`/`role`.

## 3. Convenções de API

- Prefixo `/api/v1`. `Authorization: Bearer <jwt>` obrigatório em tudo, exceto `POST /auth/me` que só precisa do JWT ser válido (sem exigir um papel específico).
- IDs: UUID (`gen_random_uuid()`), gerados pelo Postgres — o backend é a fonte de verdade, não mais o client.
- Sucesso: retorna o recurso direto (sem envelope). Erro: `{"error": {"code": "...", "message": "..."}}`, com o HTTP status apropriado (400/403/404/409).
- Listas são normalizadas (sem join aninhado) — um Deal retorna `contact_id`, o front busca o contato separadamente, mesma forma normalizada que o `CrmState` já usa hoje.
- Datas: ISO 8601 (`timestamptz` no Postgres, string no wire) — sem mudança de formato em relação ao que o frontend já produz com `.toISOString()`.
- Toda tabela tem `id uuid primary key default gen_random_uuid()`, `tenant_id uuid not null references tenants(id)` (exceto `tenants` e `users` globais), `created_at timestamptz not null default now()`.
- Cada endpoint abaixo documenta os papéis que podem chamá-lo, replicando exatamente a matriz já implementada no frontend (atendente/gestor/admin_saas).

## 4. Módulo: Tenants (Admin do SaaS)

**Tabela `tenants`:** `id, name, slug unique, plan text check in ('starter','pro'), status text check in ('ativo','suspenso'), settings jsonb, created_at`. (`settings` guarda `{tags: string[], loss_reasons: string[], business_hours: string}` — mantido como jsonb por ser um blob de configuração pequeno e sem necessidade de query relacional.)

| Rota | Papéis | Corpo | Observação |
|---|---|---|---|
| `GET /tenants` | admin_saas | — | Lista todas as lojas |
| `POST /tenants` | admin_saas | `{name, plan}` | Cria tenant + usuário gestor padrão "Gestor {name}" (compound, mesma regra do `TenantFormDialog`) |
| `PATCH /tenants/{id}` | gestor (só o próprio tenant), admin_saas (qualquer um) | campos parciais | Edita nome/horário/plano — usado pela aba Loja de Configurações |
| `POST /tenants/{id}/impersonate` | admin_saas | — | Ver seção 2 |

## 5. Módulo: Users (Equipe)

**Tabela `users`:** não é uma tabela própria — é uma *view* sobre `auth.users` (Supabase) enriquecida com `app_metadata` (`tenant_id`, `role`) + colunas extras (`name`, `avatar_color`) guardadas em `public.user_profiles(id references auth.users, tenant_id, role, name, avatar_color, created_at)`.

| Rota | Papéis | Corpo | Observação |
|---|---|---|---|
| `GET /users` | atendente, gestor | — | Equipe do tenant atual (`tenantScope().users`) |
| `POST /users/invite` | gestor | `{name, email, role}` | Ver seção 2 |
| `PATCH /users/{id}/role` | gestor | `{role}` | Troca de papel inline na aba Equipe |

## 6. Módulo: Contacts

**Tabela `contacts`:** `id, tenant_id, name, whatsapp, instagram, email, cpf, address jsonb, origin text, interests text[], tags text[], journey_status text check in ('lead','cliente','recorrente'), owner_id references user_profiles, first_contact_at, last_interaction_at, created_at`.

| Rota | Papéis | Corpo | Observação |
|---|---|---|---|
| `GET /contacts?journey_status=&tag=&origin=&owner_id=&search=` | atendente, gestor | — | Lista com os mesmos filtros da tela Clientes |
| `GET /contacts/{id}` | atendente, gestor | — | Ficha do cliente |
| `POST /contacts` | atendente, gestor | dados do Contact | `journey_status` sempre nasce `"lead"` |
| `PATCH /contacts/{id}` | atendente, gestor | campos parciais | Edição via `ContactFormDialog` |

## 7. Módulo: Deals (Pipeline)

Já detalhado na Seção 2 da conversa de brainstorming — reproduzido aqui como parte do documento final.

**Tabela `deals`:** `id, tenant_id, contact_id references contacts, title, products, value numeric, payment text, trade_in boolean, trade_in_desc, stage text check in (5 valores), outcome text check in ('aberto','ganho','perdido'), loss_reason text, owner_id references user_profiles, expected_close_at, stage_changed_at, created_at, supplier_product_id references supplier_products, supplier_value numeric, gift_value numeric`.

| Rota | Papéis | Corpo | Observação |
|---|---|---|---|
| `GET /deals?stage=&outcome=&owner_id=&contact_id=` | atendente, gestor | — | `outcome=perdido` cobre a tela de Perdidos |
| `POST /leads` | atendente, gestor | `{name, whatsapp, origin, product_line?, value, owner_id}` | Compound: cria Contact+Deal+Activity numa transação |
| `POST /deals` | atendente, gestor | dados do Deal | Negócio para contato já existente (QuickDealDialog) |
| `PATCH /deals/{id}` | atendente, gestor | campos parciais | Edição geral |
| `POST /deals/{id}/move` | atendente, gestor | `{stage}` | `stage_changed_at=now` + Activity + se `pos_venda`: `outcome=ganho` + recalcula `journey_status` do contato (2º+ ganho vira `recorrente`) |
| `POST /deals/{id}/mark-lost` | atendente, gestor | `{reason}` | — |
| `PATCH /deals/{id}/financials` | **gestor apenas** | `{supplier_product_id?, supplier_value, gift_value}` | 403 se atendente chamar |

## 8. Módulo: Suppliers (Fornecedores)

**Tabelas:**
- `suppliers`: `id, tenant_id, name, whatsapp, contact_name, email, notes, created_at`.
- `supplier_products`: `id, tenant_id, supplier_id references suppliers, name, current_price numeric, updated_at, created_at`.
- `supplier_price_changes`: `id, tenant_id, supplier_product_id references supplier_products, price numeric, changed_at` (append-only, sem UPDATE/DELETE).

| Rota | Papéis | Corpo | Observação |
|---|---|---|---|
| `GET /suppliers?search=` | atendente (leitura), gestor | — | — |
| `GET /suppliers/{id}` | atendente (leitura), gestor | — | Inclui produtos |
| `POST /suppliers` | **gestor apenas** | dados do Supplier | — |
| `PATCH /suppliers/{id}` | **gestor apenas** | campos parciais | — |
| `POST /suppliers/{id}/products` | **gestor apenas** | `{name, current_price}` | Não cria `supplier_price_changes` na criação |
| `PATCH /supplier-products/{id}/price` | **gestor apenas** | `{price}` | Cria uma linha em `supplier_price_changes` E atualiza `current_price`/`updated_at`, na mesma transação |
| `GET /supplier-products/{id}/price-history` | atendente, gestor | — | Mais recente primeiro |

## 9. Módulo: Conversations (Inbox)

**Tabelas:**
- `conversations`: `id, tenant_id, contact_id references contacts, assignee_id references user_profiles nullable, status text check in ('aberta','resolvida'), unread int default 0, created_at`.
- `messages`: `id, tenant_id, conversation_id references conversations, direction text check in ('in','out'), text, author_id references user_profiles nullable, status text check in ('enviada','entregue','lida'), created_at`.

| Rota | Papéis | Corpo | Observação |
|---|---|---|---|
| `GET /conversations?assignee_id=&status=` | atendente, gestor | — | Abas Minhas/Não atribuídas/Todas via `assignee_id=me` / `assignee_id=null` / sem filtro |
| `GET /conversations/{id}/messages` | atendente, gestor | — | Marca como lida como efeito colateral (equivalente a `MARK_CONVERSATION_READ`) |
| `POST /conversations` | atendente, gestor | `{contact_id}` | Cria conversa sob demanda ("Abrir conversa" sem conversa existente) |
| `POST /conversations/{id}/messages` | atendente, gestor | `{text}` | Mensagem `direction=out`; dispara o webhook de envio real pra EvolutionAPI (fora do escopo deste documento — chamada à API do Evolution) |
| `PATCH /conversations/{id}/assignee` | atendente, gestor | `{assignee_id}` (nullable) | Assumir/desatribuir conversa |
| `POST /webhooks/evolution` | — (autenticado por assinatura HMAC do Evolution, não por JWT de usuário) | payload do Evolution | Mensagem recebida real: cria `messages` (`direction=in`), atualiza `contacts.last_interaction_at`, incrementa `unread`, cria Activity |

## 10. Módulo: Appointments (Agenda)

**Tabela `appointments`:** `id, tenant_id, contact_id references contacts, deal_id references deals nullable, type text check in (4 valores), starts_at, ends_at, status text check in ('agendado','concluido','cancelado'), owner_id references user_profiles, note, created_at`.

| Rota | Papéis | Corpo | Observação |
|---|---|---|---|
| `GET /appointments?from=&to=&contact_id=` | atendente, gestor | — | `from`/`to` cobrem a grade semanal e a lista "Hoje" |
| `POST /appointments` | atendente, gestor | dados do Appointment | — |
| `PATCH /appointments/{id}` | atendente, gestor | campos parciais | Edição e concluir/cancelar (`status`) |

## 11. Módulo: Activities (Timeline)

**Tabela `activities`:** `id, tenant_id, contact_id references contacts, deal_id references deals nullable, user_id references user_profiles, type text check in (5 valores), description, created_at`.

| Rota | Papéis | Corpo | Observação |
|---|---|---|---|
| `GET /activities?contact_id=` | atendente, gestor | — | Timeline da ficha do cliente, mais recente primeiro |
| `POST /activities` | atendente, gestor | dados da Activity | Uso direto raro — a maioria das activities nasce como efeito colateral de outros endpoints (mover deal, enviar mensagem, criar agendamento) |

## 12. Módulo: Connections (WhatsApp)

**Tabela `connections`:** `id, tenant_id, user_id references user_profiles, phone, status text check in ('desconectado','pareando','conectado'), connected_at, created_at`.

| Rota | Papéis | Corpo | Observação |
|---|---|---|---|
| `GET /connections` | atendente (só a própria), gestor (todas do tenant) | — | Filtro por `user_id` aplicado no backend conforme o papel |
| `POST /connections/{id}/pair` | atendente (a própria), gestor | — | Inicia pareamento real com a EvolutionAPI (cria uma instância Evolution vinculada a esse `connection.id`), retorna o QR code real |
| `POST /connections/{id}/disconnect` | atendente (a própria), gestor | — | — |

## 13. Módulo: Dashboard

Sem tabela própria — agregações sobre `deals`/`contacts`/`conversations`/`appointments` do tenant.

| Rota | Papéis | Observação |
|---|---|---|
| `GET /dashboard/metrics` | **gestor apenas** | Retorna `{new_leads_month, in_negotiation_value, revenue_month, revenue_prev_month, conversion_rate, net_profit_month, funnel_counts[], by_channel[], loss_ranking[]}` — mesmo formato de `dashboardMetrics()` do frontend, calculado em SQL/Python no lugar do `selectors.ts` |
| `GET /dashboard/today` | gestor | Agendamentos de hoje + conversas não atribuídas — dados já cobertos por `GET /appointments` e `GET /conversations`, este endpoint é um atalho opcional que combina os dois numa chamada |

## 14. Módulo: Settings

Endpoints adicionais sobre a tabela `tenants` (campo `settings` jsonb) já coberta na Seção 4.

| Rota | Papéis | Corpo | Observação |
|---|---|---|---|
| `PATCH /tenants/{id}/settings` | **gestor apenas** | `{tags?, loss_reasons?, business_hours?}` | Aba Funil e Tags de Configurações |

## 15. Fora de escopo deste documento

- Implementação real do código (este é só o mapeamento de requisitos).
- Definição fina de rate limiting, paginação por cursor, e observabilidade (logs/métricas) — a escala atual (CRM de uma loja) não exige isso ainda; revisitar se o SaaS crescer.
- Mecanismo exato de impersonação (JWT sobrescrito vs. sessão custom do FastAPI) — decisão de implementação, não de contrato de API.
- Fila/retry assíncrono para o webhook do Evolution — se necessário por volume, entra como detalhe de implementação do módulo `webhooks/evolution.py`, não muda o contrato do endpoint.
