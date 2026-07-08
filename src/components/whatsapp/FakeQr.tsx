// FakeQr — pseudo-QR determinístico derivado do userId: a mesma pessoa vê
// sempre o mesmo padrão (estável entre renders), mas cada usuário tem um
// padrão visualmente distinto do outro. NÃO é um QR code real/escaneável —
// é só o suficiente para vender a ilusão do pareamento do WhatsApp Web.

const GRID = 21; // módulos por lado, estilo QR versão 1
const FINDER_SIZE = 7; // "olhos" de 7x7 nos 3 cantos, como um QR de verdade

interface FakeQrProps {
  seed: string;
  size?: number;
}

/** Hash simples (djb2) — determinístico, converte o userId numa seed numérica. */
function hashSeed(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

/** PRNG determinístico (mulberry32) — mesma seed sempre gera a mesma sequência. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function inFinderZone(row: number, col: number): boolean {
  const inCorner = (r: number, c: number) =>
    row >= r && row < r + FINDER_SIZE && col >= c && col < c + FINDER_SIZE;
  return inCorner(0, 0) || inCorner(0, GRID - FINDER_SIZE) || inCorner(GRID - FINDER_SIZE, 0);
}

/** Desenha o anel externo + núcleo 3x3 de um "olho" de QR (7x7 módulos). */
function isFinderModule(localRow: number, localCol: number): boolean {
  const isRing = localRow === 0 || localRow === 6 || localCol === 0 || localCol === 6;
  const isCore = localRow >= 2 && localRow <= 4 && localCol >= 2 && localCol <= 4;
  return isRing || isCore;
}

const FINDER_ORIGINS: [number, number][] = [
  [0, 0],
  [0, GRID - FINDER_SIZE],
  [GRID - FINDER_SIZE, 0],
];

export function FakeQr({ seed, size = 176 }: FakeQrProps) {
  const random = mulberry32(hashSeed(seed));
  const cellSize = size / GRID;

  const dataModules: { row: number; col: number }[] = [];
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      if (inFinderZone(row, col)) continue;
      if (random() > 0.5) dataModules.push({ row, col });
    }
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label="Código de pareamento para escanear (simulado)"
      className="rounded-md bg-white p-2"
    >
      <rect x={0} y={0} width={size} height={size} fill="#ffffff" />
      {dataModules.map(({ row, col }) => (
        <rect
          key={`${row}-${col}`}
          x={col * cellSize}
          y={row * cellSize}
          width={cellSize}
          height={cellSize}
          fill="#111b21"
        />
      ))}
      {FINDER_ORIGINS.map(([baseRow, baseCol]) =>
        Array.from({ length: FINDER_SIZE }, (_, localRow) =>
          Array.from({ length: FINDER_SIZE }, (_, localCol) =>
            isFinderModule(localRow, localCol) ? (
              <rect
                key={`f-${baseRow}-${baseCol}-${localRow}-${localCol}`}
                x={(baseCol + localCol) * cellSize}
                y={(baseRow + localRow) * cellSize}
                width={cellSize}
                height={cellSize}
                fill="#111b21"
              />
            ) : null,
          ),
        ),
      )}
    </svg>
  );
}
