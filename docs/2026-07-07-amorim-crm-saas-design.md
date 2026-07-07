# Amorim CRM — SaaS Multitenant para Lojas Apple (Protótipo, Leva 1)

**Data:** 07/07/2026
**Status:** Design aprovado — pronto para plano de implementação
**Substitui:** `CRM-Design-Apple-Store.md` (06/07/2026, escopo v1 de 2 sócios)

---

## 1. Visão do produto

CRM SaaS **multitenant** para lojas de produtos Apple que operam por **intermediação** (sem controle de estoque). Cobre a jornada completa: entrada do lead → atendimento via WhatsApp → negociação → fechamento → pós-venda → **cliente recorrente** com cadastro completo.

- **Plataforma:** Web responsiva (desktop-first, utilizável no celular).
- **Marca:** Amorim CRM (logos `amorim-mark-black.png` / `amorim-mark-white.png` reaproveitados do v1).
- **Usuários do dia a dia:** Atendente/secretária, Gestor da loja, Admin do tenant (dono do SaaS).
- **Nota de terminologia:** o pedido original citava termos de clínica (paciente, consulta, consultório) vindos de um template. Decisão: domínio 100% loja — *paciente → cliente, consultas → agendamentos, consultório → loja*.

## 2. Escopo da Leva 1 (este protótipo)

**Incluído:** frontend completo e navegável com dados simulados realistas. Nenhum backend.

1. Login fake + seletor de papel/tenant (demo)
2. Dashboard / visão geral
3. Pipeline / funil de leads (Kanban com drag-and-drop)
4. Inbox de atendimento WhatsApp (simulado)
5. Ficha do cliente
6. Lista de clientes / contatos
7. Agenda / agendamentos
8. Configurações da loja (multitenant)
9. Conexão do WhatsApp da atendente (pareamento simulado)
10. Painel Admin do SaaS (lista de lojas/tenants)

**Fora do escopo (Leva 2+):** Supabase (Auth, Postgres + RLS, Edge Functions), integração real com WhatsApp (ex.: Evolution API), cobrança/planos reais, notificações push, relatórios exportáveis.

## 3. Decisões de arquitetura

| Decisão | Escolha | Racional |
|---|---|---|
| Stack | Vite + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui + React Router | Velocidade de protótipo; mesma SPA sobrevive à Leva 2 |
| Estado | Store central (Context + reducer) com persistência em localStorage | Interações reais (drag-and-drop, chat) sem backend |
| Backend futuro | Supabase: Auth, Postgres com RLS por tenant, Edge Functions para webhooks WhatsApp | Elimina servidor Node próprio; SPA não muda |
| Multitenancy | `tenantId` em toda entidade desde o dia 1 | Espelha 1:1 o schema Postgres/RLS da Leva 2 |
| Projeto | Novo, em `D:\Skills Claude\amorim-crm` | Decisão do usuário: começar do zero (v1 `crm-apple-store` fica como referência) |

## 4. Modelo de dados (todas as entidades com `id`, `tenantId`, `createdAt`)

- **Tenant** — nome, slug, logo, plano (`starter | pro`), status, configurações (tags disponíveis, motivos de perda, horário de funcionamento).
- **User** — nome, avatar, e-mail, papel (`atendente | gestor | admin_saas`), tenantId (null para admin_saas, que é global).
- **Contact** — nome, foto, WhatsApp, @Instagram, e-mail, CPF, endereço (rua, cidade, UF, CEP), origem (`instagram_organico | instagram_ads | whatsapp_direto | indicacao | outro`), produtos de interesse (multi), tags, **journeyStatus** (`lead | cliente | recorrente`), responsável (userId), primeira interação, última interação.
- **Deal** — título auto ("iPhone 16 Pro 256GB — João Silva"), contactId, produto(s), valor (R$), forma de pagamento (`pix | cartao_avista | cartao_parcelado | boleto`), troca de usado (bool + descrição), **stage**, **outcome** (`aberto | ganho | perdido`), motivo de perda (obrigatório se perdido: `preco | prazo_entrega | sem_modelo | concorrencia | sem_resposta | desistiu`), responsável, previsão de fechamento, data de última movimentação (para alerta de 3 dias).
- **Conversation** — contactId, atendente atribuído (userId | null), status (`aberta | resolvida`), não-lidas (nº), última mensagem (preview + hora).
- **Message** — conversationId, direção (`in | out`), texto, timestamp, status (`enviada | entregue | lida`), autor (userId quando out).
- **Appointment** — tipo (`entrega | retirada | atendimento | follow_up`), contactId, dealId (opcional), data/hora início e fim, status (`agendado | concluido | cancelado`), responsável, observação.
- **Activity** — tipo (`mensagem | mudanca_estagio | nota | agendamento | venda`), descrição, contactId, dealId (opcional), userId, timestamp. Alimenta a timeline da ficha do cliente.
- **WhatsAppConnection** — userId (atendente), número, status (`desconectado | pareando | conectado`), conectado desde.

## 5. Funil de vendas (Pipeline)

Colunas do board (o board acompanha até a recompra, decisão do usuário):

1. **Novo Lead** — mensagem recebida, ainda sem resposta qualificada.
2. **Em Atendimento** — conversa ativa, qualificando interesse/orçamento/produto.
3. **Negociação** — proposta enviada (produto + valor + condição).
4. **Fechamento** — cliente confirmou; aguardando pagamento/pedido.
5. **Pós-venda / Recompra** — venda concluída (outcome `ganho`); foco em acompanhamento e recompra.

Regras:

- **Perdido não é coluna:** em qualquer estágio o negócio pode ser marcado Perdido (motivo obrigatório) — sai do board e fica no filtro "Perdidos".
- **Alerta de parado:** negócio sem movimentação há 3+ dias exibe badge de atenção.
- **Jornada do contato:** 1ª venda ganha → `cliente`; 2ª+ → `recorrente`.
- Cada coluna mostra soma em R$ e contagem de negócios.

## 6. Papéis e permissões

| Recurso | Atendente | Gestor | Admin SaaS |
|---|---|---|---|
| Inbox WhatsApp | ✔ | ✔ | via "entrar como gestor" |
| Pipeline | ✔ | ✔ | idem |
| Clientes + Ficha | ✔ | ✔ | idem |
| Agenda | ✔ | ✔ | idem |
| Dashboard (financeiro) | ✖ | ✔ | idem |
| Configurações da loja | ✖ | ✔ | idem |
| Conexão WhatsApp | só a própria | todas | idem |
| Painel de tenants (criar loja, planos) | ✖ | ✖ | ✔ |

Atendente vê todos os registros da loja (atribuição ≠ restrição), mas sem telas financeiras/administrativas. Demo: seletor no topbar troca papel e tenant instantaneamente.

## 7. Telas

1. **Login (fake)** — form decorativo + 3 cartões "entrar como" (Atendente, Gestor, Admin SaaS).
2. **Dashboard** (Gestor) — cards: leads novos no mês, valor em negociação, receita fechada no mês (vs anterior), taxa de conversão; funil visual; conversão por canal de origem; ranking de motivos de perda; agenda do dia; conversas não atribuídas.
3. **Pipeline** — Kanban 5 colunas, drag-and-drop, quick-add de lead, badge 3+ dias, ação "marcar como perdido" com dialog de motivo, filtro Perdidos.
4. **Inbox** — 3 painéis responsivos: (a) conversas com abas Minhas / Não atribuídas / Todas + busca; (b) chat estilo WhatsApp com envio simulado e resposta automática fake após alguns segundos; (c) contexto do contato: dados-chave, negócio ativo, ações rápidas (criar negócio, agendar, mudar estágio, abrir ficha). No mobile os painéis viram navegação empilhada.
5. **Ficha do cliente** — cabeçalho com foto/nome/status da jornada/tags; abas: Dados (cadastro completo), Negócios, Compras (deals ganhos), Agendamentos, Timeline. Botão "abrir conversa".
6. **Clientes** — tabela com busca, filtros (status da jornada, tag, origem, responsável), colunas: nome, WhatsApp, status, última interação, responsável. Dialog novo contato.
7. **Agenda** — visão semanal em grade + lista "Hoje"; cores por tipo; criar/editar agendamento vinculado a contato/negócio.
8. **Configurações da loja** — abas: Loja (nome, logo, horários), Equipe (listar/convidar/editar papel), Funil e Tags (tags, motivos de perda), *(placeholder Leva 2: Integrações)*.
9. **Conexão WhatsApp** — card por atendente: número, status com indicador, "Conectar" abre dialog com QR fake que transita `pareando → conectado` em ~4s; ação desconectar.
10. **Admin SaaS — Tenants** — tabela de lojas (nome, plano, usuários, status, criado em), dialog criar loja, botão "entrar como gestor" (troca contexto).

**Navegação:** sidebar colapsável (desktop) / bottom bar ou drawer (mobile); topbar com busca global (contatos, negócios, conversas), sino de notificações fake e seletor de papel+tenant.

## 8. Dados simulados (seed)

- **2 tenants:** Amorim Imports (principal, dados ricos) e "TechStore SP" (dados menores, prova o isolamento).
- Por tenant principal: ~14 contatos distribuídos na jornada (leads, clientes, 3+ recorrentes), ~12 negócios espalhados no funil (2 perdidos com motivos variados, 1 parado 4+ dias para o badge), ~8 conversas com históricos plausíveis de compra de iPhone/Mac (troca de usado, parcelamento, frete), ~10 agendamentos na semana corrente, timeline populada.
- Usuários: 2 atendentes + 1 gestor por loja + 1 admin do SaaS.
- Datas geradas relativas a "hoje" para o demo nunca parecer velho.
- Reset de demo disponível (limpa localStorage e re-seeda).

## 9. Fluxo-demo central (corredor de validação)

Lead manda mensagem (Inbox, não atribuída) → atendente assume e responde → cria negócio pela ação rápida → arrasta no Pipeline até Fechamento → marca Ganho → agenda entrega na Agenda → ficha mostra jornada "Cliente" + compra → Dashboard reflete receita e conversão. **Este fluxo deve funcionar de ponta a ponta no protótipo.**

## 10. Direção visual

Estética premium minimalista inspirada no universo Apple: base neutra com muito respiro, tipografia de peso forte em títulos, cantos suaves, sombras discretas, acento da marca Amorim, modo claro/escuro. Bolhas de chat fiéis ao vocabulário visual do WhatsApp (sem copiar a UI). Implementação guiada pelas skills `frontend-design` e `impeccable`; componentes via `shadcn/ui`.

## 11. Tratamento de erros e estados

- Estados vazios desenhados para toda lista (ex.: "Nenhuma conversa não atribuída 🎉").
- Validação de formulários inline (nome/WhatsApp obrigatórios em contato; motivo obrigatório ao perder negócio).
- Dados corrompidos no localStorage → fallback silencioso para o seed.

## 12. Testes e verificação

- Protótipo validado via preview no navegador: fluxo-demo central completo, troca de papel/tenant, responsividade (375px / 768px / 1280px), modo escuro.
- `tsc -b` e lint limpos como gate de build.

## 13. Riscos e mitigação

- **Escopo grande (10 telas):** construir na ordem do fluxo-demo (shell → dados → Pipeline → Inbox → Ficha → Agenda → Dashboard → Config → Conexão → Admin), cada tela navegável antes da próxima.
- **Simulação do WhatsApp parecer "de mentira":** conversas seed escritas com linguagem real de negociação de iPhone; resposta automática com delay e variação.
