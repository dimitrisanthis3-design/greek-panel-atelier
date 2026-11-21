// CSV export of the bill of materials, formatted for Greek Excel (semicolons, decimal comma, UTF-8 BOM).
import type { BomLine, Totals } from "./hager";
import type { CustomItem, PanelConfig } from "./panel";

function cell(v: string | number): string {
  const s = typeof v === "number" ? v.toFixed(2).replace(".", ",") : v;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function qtyCell(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n).replace(".", ",");
}

export function buildBomCsv(
  cfg: PanelConfig,
  lines: BomLine[],
  prices: Record<string, number>,
  totals: Totals,
): string {
  const rows: string[][] = [
    ["Υλικολόγιο & Προσφορά"],
    ["Έργο / Πελάτης", cell(cfg.project)],
    ["Πίνακας", cell(cfg.panelName)],
    ["Ημερομηνία", cell(cfg.date)],
    [],
    ["Α/Α", "Κωδικός", "Περιγραφή", "Ποσότητα", "Τιμή Μονάδας (€)", "Σύνολο (€)"],
  ];
  let i = 1;
  for (const l of lines) {
    const price = prices[l.code] ?? 0;
    rows.push([
      String(i++),
      cell(l.code),
      cell(`Hager ${l.description}`),
      qtyCell(l.qty),
      cell(price),
      cell(price * l.qty),
    ]);
  }
  for (const c of cfg.customItems as CustomItem[]) {
    rows.push([
      String(i++),
      cell(c.code),
      cell(c.description),
      qtyCell(c.qty),
      cell(c.unitPrice),
      cell(c.unitPrice * c.qty),
    ]);
  }
  rows.push(
    [],
    ["", "", "", "", "Καθαρό σύνολο", cell(totals.net)],
    ["", "", "", "", `ΦΠΑ ${cfg.vatPercent}%`, cell(totals.vat)],
    ["", "", "", "", "Γενικό σύνολο", cell(totals.gross)],
  );
  return "\uFEFF" + rows.map((r) => r.join(";")).join("\r\n");
}

export function downloadText(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Latin-only file name from free Greek text. */
export function fileSlug(text: string): string {
  const map: Record<string, string> = {
    α: "a",
    β: "v",
    γ: "g",
    δ: "d",
    ε: "e",
    ζ: "z",
    η: "i",
    θ: "th",
    ι: "i",
    κ: "k",
    λ: "l",
    μ: "m",
    ν: "n",
    ξ: "x",
    ο: "o",
    π: "p",
    ρ: "r",
    σ: "s",
    ς: "s",
    τ: "t",
    υ: "y",
    φ: "f",
    χ: "ch",
    ψ: "ps",
    ω: "o",
  };
  const plain = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("");
  return plain.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "pinakas";
}
