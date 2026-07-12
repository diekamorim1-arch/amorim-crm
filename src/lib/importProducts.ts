// Parser client-side pra importação de produtos de fornecedor: cada linha do
// arquivo (.csv/.txt/.docx) segue o formato "NOME - CORES - VALOR". Mantido
// separado do componente de dialog pra ser testável sem precisar montar UI.

export interface ParsedProductRow {
  raw: string;
  name?: string;
  colors?: string;
  price?: number;
  valid: boolean;
  error?: string;
}

/** Aceita tanto "1.500,00" (separador de milhar ponto, decimal vírgula,
 * padrão pt-BR) quanto "1500.00"/"1500" (decimal ponto ou inteiro). */
function parseBrlNumber(text: string): number | null {
  const cleaned = text.replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  const normalized = hasComma && hasDot ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(",", ".");

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function parseProductLine(line: string): ParsedProductRow {
  const raw = line;
  const trimmed = line.trim();
  if (!trimmed) {
    return { raw, valid: false, error: "Linha vazia" };
  }

  const parts = trimmed.split(" - ").map((p) => p.trim());
  if (parts.length !== 3) {
    return { raw, valid: false, error: `Esperado "NOME - CORES - VALOR", encontrado ${parts.length} parte(s)` };
  }

  const [name, colors, priceText] = parts;
  if (!name) {
    return { raw, valid: false, error: "Nome vazio" };
  }

  const price = parseBrlNumber(priceText);
  if (price === null || price <= 0) {
    return { raw, name, colors: colors || undefined, valid: false, error: `Valor inválido: "${priceText}"` };
  }

  return { raw, name, colors: colors || undefined, price, valid: true };
}

export function parseProductLines(text: string): ParsedProductRow[] {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(parseProductLine);
}
