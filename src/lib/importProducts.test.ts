import { describe, expect, it } from "vitest";
import { parseProductLine, parseProductLines } from "./importProducts";

describe("parseProductLine", () => {
  it("faz o parse de uma linha válida com decimal em vírgula", () => {
    const row = parseProductLine("iPhone 15 Pro - Titânio Natural - 6.500,00");
    expect(row).toEqual({
      raw: "iPhone 15 Pro - Titânio Natural - 6.500,00",
      name: "iPhone 15 Pro",
      colors: "Titânio Natural",
      price: 6500,
      valid: true,
    });
  });

  it("aceita valor com ponto decimal ou inteiro puro", () => {
    expect(parseProductLine("AirPods Pro - Branco - 1800.5").price).toBe(1800.5);
    expect(parseProductLine("AirPods Pro - Branco - 1800").price).toBe(1800);
  });

  it("marca linha vazia como inválida", () => {
    expect(parseProductLine("   ").valid).toBe(false);
  });

  it("marca linha sem as 3 partes como inválida", () => {
    const row = parseProductLine("iPhone 15 - 4500");
    expect(row.valid).toBe(false);
    expect(row.error).toMatch(/NOME - CORES - VALOR/);
  });

  it("marca valor não numérico como inválido, preservando nome/cores já lidos", () => {
    const row = parseProductLine("iPhone 15 - Preto - abc");
    expect(row.valid).toBe(false);
    expect(row.name).toBe("iPhone 15");
    expect(row.colors).toBe("Preto");
  });

  it("marca valor zero ou negativo como inválido", () => {
    expect(parseProductLine("Produto - Cor - 0").valid).toBe(false);
    expect(parseProductLine("Produto - Cor - -50").valid).toBe(false);
  });

  it("cores vazias viram undefined em vez de string vazia", () => {
    // "Produto" + " - " (separador) + "" (cores vazias) + " - " + "100"
    const row = parseProductLine("Produto - " + " - 100");
    expect(row.valid).toBe(true);
    expect(row.name).toBe("Produto");
    expect(row.colors).toBeUndefined();
    expect(row.price).toBe(100);
  });
});

describe("parseProductLines", () => {
  it("faz o parse de várias linhas, ignorando linhas em branco", () => {
    const text = "iPhone 15 - Preto, Branco - 4500\n\n  \nAirPods Pro - Branco - 1800\r\niPad - Cinza - 3200";
    const rows = parseProductLines(text);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.valid)).toBe(true);
    expect(rows.map((r) => r.name)).toEqual(["iPhone 15", "AirPods Pro", "iPad"]);
  });

  it("mistura linhas válidas e inválidas mantendo a ordem original", () => {
    const text = "iPhone 15 - Preto - 4500\nlinha quebrada\nAirPods Pro - Branco - 1800";
    const rows = parseProductLines(text);
    expect(rows.map((r) => r.valid)).toEqual([true, false, true]);
  });
});
