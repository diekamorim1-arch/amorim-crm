# Amorim CRM — Direção Visual (contrato para todas as telas)

**Conceito: "Alumínio & Bronze".** O produto vive no mundo Apple (alumínio, precisão, contenção) mas é uma revenda premium brasileira — o acento é **bronze**, não o azul-Apple (que leria como clone de apple.com) nem verde-ácido genérico. O verde fica **reservado semanticamente** ao WhatsApp (bolhas, status de conexão, badges de não-lida) — cor com significado, nunca decoração.

## Tipografia (3 papéis)

| Papel | Fonte | Uso |
|---|---|---|
| Display | **Bricolage Grotesque** (`@fontsource-variable/bricolage-grotesque`) | Títulos de página, números grandes do dashboard, wordmark. Pesos 600–700, tracking levemente negativo (`-0.02em`). Usada com contenção — só onde há hierarquia real. |
| Corpo/UI | **Inter Variable** (já instalada) | Todo o resto. `font-feature-settings: "cv11"` opcional. |
| Dados | **Geist Mono** (`@fontsource-variable/geist-mono`) | Valores em R$, telefones, horários, IDs. `font-variant-numeric: tabular-nums`. É a assinatura tipográfica do CRM: dinheiro e dados sempre em mono. |

## Cores (CSS variables shadcn em `index.css`)

**Claro (alumínio):** `--background: #F5F5F4` · `--card: #FFFFFF` · `--foreground: #1C1C1E` · `--muted-foreground: #6E6E73` · `--border: #E4E4E3` · `--primary: #A16A28` (bronze; texto sobre ele `#FFFFFF`) · `--ring: #A16A28`.
**Escuro (grafite):** `--background: #161618` · `--card: #1F1F22` · `--foreground: #F5F5F7` · `--muted-foreground: #98989D` · `--border: #2C2C2E` · `--primary: #D9A45B` (texto sobre ele `#1C1C1E`).
**Semânticas (iguais nos 2 temas, ajustar luminância no dark):** WhatsApp/sucesso `#1FAF5F` (dark `#2BC46F`); bolha enviada claro `#D9FDD3`/texto `#111B21`, bolha enviada escuro `#005C4B`/texto `#E9EDEF`; destructive `#DC2626`; atenção (negócio parado) `#D97706`.

## Forma e espaço

- Raio padrão `--radius: 0.75rem`; cards `rounded-xl`, controles `rounded-lg`, badges/pills `rounded-full`.
- Bordas de 1px fazem o trabalho; sombras quase nulas (`shadow-sm` no máximo; dialogs/popovers podem mais).
- Densidade generosa nas telas de gestão, compacta no Inbox (ferramenta de trabalho).
- Foco visível bronze (`ring-2 ring-ring ring-offset-2`) em tudo; `prefers-reduced-motion` respeitado (transições viram instantâneas).
- Motion: transições de 150–200ms em hover/estado; nada de entrance animation em cascata.

## Assinatura

**O friso de jornada:** indicador de 3 segmentos (Lead → Cliente → Recorrente) — pequena barra tripla onde os segmentos preenchem em bronze conforme a jornada avança. Aparece no `JourneyBadge` (ficha, listas, inbox). É o elemento que torna o produto reconhecível; todo o resto fica quieto.

**Wordmark:** logo `amorim-mark` (png preto no claro, branco no escuro) + "Amorim CRM" em Bricolage 600. Sidebar clara no tema claro (alumínio, não two-tone escuro).

## Copy

pt-BR, sentence case, verbos ativos ("Salvar alterações", nunca "Submeter"). Nomes de ação consistentes do botão ao toast (botão "Conectar" → toast "WhatsApp conectado"). Estados vazios convidam à ação, erros dizem o que fazer. Vocabulário do usuário: cliente, negócio, agendamento, loja.
