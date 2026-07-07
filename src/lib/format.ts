// Helpers de formatação e datas relativas usados pela UI e pelo seed.

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Formata um valor numérico como moeda BRL: "R$ 8.499,00" */
export function brl(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Formata um ISO string como tempo relativo em pt-BR: "há 2 h", "ontem", "há 4 dias". */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;

  if (diffMs < 0) return "agora";

  const diffMin = Math.floor(diffMs / MINUTE_MS);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;

  const diffHours = Math.floor(diffMs / HOUR_MS);
  if (diffHours < 24) return `há ${diffHours} h`;

  const diffDays = Math.floor(diffMs / DAY_MS);
  if (diffDays === 1) return "ontem";
  return `há ${diffDays} dias`;
}

/**
 * Retorna um ISO string relativo a agora, `n` dias atrás.
 * Se `hour` for informado, fixa o horário (0-23) do resultado — útil para
 * gerar dados de seed determinísticos (ex.: "hoje às 14h").
 */
export function daysAgo(n: number, hour?: number): string {
  const date = new Date();
  date.setDate(date.getDate() - n);
  if (hour !== undefined) {
    date.setHours(hour, 0, 0, 0);
  }
  return date.toISOString();
}

/** Retorna um ISO string relativo a agora, `n` horas atrás. */
export function hoursAgo(n: number): string {
  return new Date(Date.now() - n * HOUR_MS).toISOString();
}
