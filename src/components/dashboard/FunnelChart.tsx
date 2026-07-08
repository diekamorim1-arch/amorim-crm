// FunnelChart — barras horizontais por estágio do funil (quantidade de
// negócios abertos + valor em R$), SVG puro (sem lib de gráficos) usando os
// tokens de tema (--chart-1 para a barra, --foreground/--muted-foreground
// para texto) para que light/dark funcionem sem CSS extra. Ordinal por
// natureza (a ordem dos estágios importa), então usa um único hue —
// ver skill dataviz: "sequential (magnitude) é o default seguro".
//
// Layout: coluna fixa de rótulo do estágio, trilha de barra com largura
// proporcional a max(count), e uma coluna de valores (contagem + R$) numa
// posição fixa após a trilha — assim o rótulo nunca colide com a ponta da
// barra nem fica clipado quando a barra ocupa a trilha inteira.

import { brl } from "@/lib/format";
import type { Stage } from "@/lib/types";

interface FunnelRow {
  stage: Stage;
  count: number;
  value: number;
}

interface FunnelChartProps {
  data: FunnelRow[];
  stageLabels: Record<Stage, string>;
}

const ROW_HEIGHT = 40;
const BAR_HEIGHT = 22; // ≤ 24px por spec de marca
const LABEL_X = 4;
const LABEL_WIDTH = 150;
const TRACK_X = LABEL_WIDTH + 14;
const TRACK_WIDTH = 300;
const VALUE_X = TRACK_X + TRACK_WIDTH + 14;
const VIEW_WIDTH = 620;
const CORNER_RADIUS = 4;

/** Path de retângulo com cantos arredondados só na ponta (direita); a base
 * (esquerda, de onde a barra "cresce") fica quadrada — spec de marca da skill dataviz. */
function rightRoundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  if (w <= 0) return "";
  const radius = Math.min(r, w, h / 2);
  return [
    `M${x},${y}`,
    `H${x + w - radius}`,
    `Q${x + w},${y} ${x + w},${y + radius}`,
    `V${y + h - radius}`,
    `Q${x + w},${y + h} ${x + w - radius},${y + h}`,
    `H${x}`,
    "Z",
  ].join(" ");
}

export function FunnelChart({ data, stageLabels }: FunnelChartProps) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const viewHeight = data.length * ROW_HEIGHT;

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${viewHeight}`}
      width="100%"
      height={viewHeight}
      role="img"
      aria-label="Funil de vendas por estágio: quantidade de negócios e valor"
    >
      {data.map((row, i) => {
        const y = i * ROW_HEIGHT;
        const barY = y + (ROW_HEIGHT - BAR_HEIGHT) / 2;
        const barWidth = (row.count / maxCount) * TRACK_WIDTH;
        const path = rightRoundedRectPath(TRACK_X, barY, barWidth, BAR_HEIGHT, CORNER_RADIUS);

        return (
          <g key={row.stage}>
            <title>
              {stageLabels[row.stage]}: {row.count} negócio{row.count === 1 ? "" : "s"}, {brl(row.value)}
            </title>
            <text
              x={LABEL_X}
              y={y + ROW_HEIGHT / 2}
              dominantBaseline="middle"
              className="fill-foreground text-[12px]"
            >
              {stageLabels[row.stage].length > 22 ? stageLabels[row.stage].split(" / ")[0] : stageLabels[row.stage]}
            </text>
            {row.count > 0 && <path d={path} fill="var(--chart-1)" />}
            <text
              x={VALUE_X}
              y={y + ROW_HEIGHT / 2}
              dominantBaseline="middle"
              className="fill-foreground font-mono text-[12px] tabular-nums"
            >
              {row.count} · {brl(row.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
