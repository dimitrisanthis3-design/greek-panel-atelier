// Browser storage for the current panel, saved projects and the supplier price list.
// Call only from effects or event handlers: localStorage does not exist during SSR.
import { normalizeConfig, type PanelConfig } from "./panel";
import { normalizeInstaller, type Installer } from "./yde";

const CURRENT = "msy:current";
const PROJECTS = "msy:projects";
const PRICES = "msy:prices";
const PROTOCOL_SEQUENCE = "msy:protocol-sequence";
export const FILE_FORMAT = "sxediastis-monogrammikou";

export interface SavedProject {
  id: string;
  name: string;
  savedAt: string;
  config: PanelConfig;
}

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadCurrent(): PanelConfig | null {
  return normalizeConfig(read(CURRENT));
}
export function saveCurrent(cfg: PanelConfig): boolean {
  return write(CURRENT, cfg);
}

export function parsePrices(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[k] = v;
  }
  return out;
}
export function loadPrices(): Record<string, number> {
  return parsePrices(read(PRICES));
}
export function savePrices(p: Record<string, number>): boolean {
  return write(PRICES, p);
}

export function listProjects(): SavedProject[] {
  const raw = read(PROJECTS);
  if (!Array.isArray(raw)) return [];
  const out: SavedProject[] = [];
  for (const p of raw) {
    if (typeof p !== "object" || p === null) continue;
    const r = p as Record<string, unknown>;
    const config = normalizeConfig(r["config"]);
    if (!config || typeof r["id"] !== "string" || typeof r["name"] !== "string") continue;
    out.push({
      id: r["id"],
      name: r["name"],
      savedAt: typeof r["savedAt"] === "string" ? r["savedAt"] : "",
      config,
    });
  }
  return out.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

/** Save under a name; an existing project with the same name is overwritten. */
export function saveProject(name: string, config: PanelConfig): SavedProject[] | null {
  const list = listProjects();
  const key = name.trim().toLocaleLowerCase("el");
  const existing = list.find((p) => p.name.trim().toLocaleLowerCase("el") === key);
  const entry: SavedProject = {
    id: existing?.id ?? crypto.randomUUID(),
    name: name.trim(),
    savedAt: new Date().toISOString(),
    config,
  };
  const next = [entry, ...list.filter((p) => p.id !== entry.id)];
  return write(PROJECTS, next) ? next : null;
}

export function deleteProject(id: string): SavedProject[] {
  const next = listProjects().filter((p) => p.id !== id);
  write(PROJECTS, next);
  return next;
}

export function projectFile(config: PanelConfig, prices: Record<string, number>): string {
  return JSON.stringify(
    { format: FILE_FORMAT, version: 1, exportedAt: new Date().toISOString(), config, prices },
    null,
    2,
  );
}

/** Read an exported settings file; accepts a bare config object too. */
export function parseProjectFile(
  text: string,
): { config: PanelConfig; prices: Record<string, number> } | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const wrapped = r["format"] === FILE_FORMAT;
  const config = normalizeConfig(wrapped ? r["config"] : r);
  if (!config) return null;
  if (!wrapped && !("circuits" in r) && !("supply" in r)) return null;
  return { config, prices: wrapped ? parsePrices(r["prices"]) : {} };
}

// The user's own Google Gemini key, kept only on this device when they choose to.
const GEMINI_KEY = "msy:gemini-key";
export function loadGeminiKey(): string {
  const v = read(GEMINI_KEY);
  return typeof v === "string" ? v : "";
}
export function saveGeminiKey(key: string): void {
  if (key.trim()) write(GEMINI_KEY, key.trim());
  else {
    try {
      window.localStorage.removeItem(GEMINI_KEY);
    } catch {
      /* ignore */
    }
  }
}

// The electrician's own details for the ΥΔΕ forms, kept permanently on this device.
const INSTALLER = "msy:installer";
export function loadInstaller(): Installer {
  return normalizeInstaller(read(INSTALLER));
}
export function saveInstaller(i: Installer): boolean {
  if (i.stampImage.length > 1_200_000) return false;
  return write(INSTALLER, normalizeInstaller(i));
}

/** A Greek-safe surname/project token for the printed protocol number. */
export function protocolNameToken(owner: string, project: string): string {
  const ownerName = owner.trim();
  const name = ownerName
    ? ownerName.includes(",")
      ? (ownerName.split(",")[0] ?? ownerName)
      : (ownerName.split(/\s+/).filter(Boolean).at(-1) ?? ownerName)
    : project;
  const token = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("el-GR")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return token || "ΕΡΓΟ";
}

/** Allocate the next persistent sequence number and format it for a protocol. */
export function nextProtocolNumber(owner: string, project: string, date = new Date()): string {
  const savedSequence = read(PROTOCOL_SEQUENCE);
  const current =
    typeof savedSequence === "number"
      ? savedSequence
      : typeof savedSequence === "string"
        ? Number.parseInt(savedSequence, 10)
        : 0;
  const sequence = Number.isFinite(current) ? Math.max(0, Math.floor(current)) + 1 : 1;
  write(PROTOCOL_SEQUENCE, sequence);
  const datePart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `${datePart}-${String(sequence).padStart(3, "0")}-${protocolNameToken(owner, project)}`;
}

/** Keep the allocated date/sequence while refreshing the automatic surname/project suffix. */
export function renameProtocolNumber(protocolNo: string, owner: string, project: string): string {
  const match = /^(\d{4}-\d{4}-\d{3,})-.+$/.exec(protocolNo);
  return match ? `${match[1]}-${protocolNameToken(owner, project)}` : protocolNo;
}

/** Start a new project with today's date and the next unique protocol number. */
export function startNumberedProject(config: PanelConfig, date = new Date()): PanelConfig {
  return {
    ...config,
    date: date.toLocaleDateString("el-GR"),
    yde: {
      ...config.yde,
      protocolNo: nextProtocolNumber(config.yde.owner, config.project, date),
      protocolNoAuto: true,
    },
  };
}
