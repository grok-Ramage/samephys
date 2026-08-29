import { FAMILIES } from "./engine.ts";
import type { FamilyId, RunInput } from "./types.ts";

const TOLS = [1e-12, 1e-10, 1e-8, 1e-6, 1e-4, 1e-2];

function formatTol(t: number): string {
  const hit = TOLS.find((x) => Math.abs(x - t) < 1e-18);
  if (hit === 1e-12) return "1e-12";
  if (hit === 1e-10) return "1e-10";
  if (hit === 1e-8) return "1e-8";
  if (hit === 1e-6) return "1e-6";
  if (hit === 1e-4) return "1e-4";
  if (hit === 1e-2) return "1e-2";
  return String(t);
}

export function inputToQuery(input: RunInput): string {
  const p = new URLSearchParams();
  p.set("f", input.family);
  p.set("s", String(input.seed));
  p.set("n", String(input.count));
  p.set("d", String(input.depth));
  p.set("t", formatTol(input.tolerance));
  if (input.injectFault) p.set("fault", "1");
  return p.toString();
}

export function inputToHref(input: RunInput): string {
  if (typeof window === "undefined") return `?${inputToQuery(input)}`;
  return `${window.location.origin}${window.location.pathname}?${inputToQuery(input)}`;
}

export function writeLabUrl(input: RunInput): void {
  if (typeof window === "undefined") return;
  const next = `?${inputToQuery(input)}`;
  if (window.location.search !== next) {
    window.history.replaceState(null, "", next);
  }
}

export function queryToInput(search: string): Partial<RunInput> | null {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  if (!raw) return null;
  const p = new URLSearchParams(raw);
  const out: Partial<RunInput> = {};
  const f = p.get("f");
  if (f && FAMILIES.some((x) => x.id === f)) out.family = f as FamilyId;
  const s = p.get("s");
  if (s != null && s !== "" && Number.isFinite(Number(s))) out.seed = Math.max(0, Math.floor(Number(s)));
  const n = p.get("n");
  if (n != null && Number.isFinite(Number(n))) out.count = Math.min(8, Math.max(2, Math.floor(Number(n))));
  const d = p.get("d");
  if (d != null && Number.isFinite(Number(d))) out.depth = Math.min(8, Math.max(0, Math.floor(Number(d))));
  const t = p.get("t");
  if (t != null && Number.isFinite(Number(t))) out.tolerance = Number(t);
  const fault = p.get("fault");
  if (fault === "1" || fault === "true") out.injectFault = true;
  if (fault === "0" || fault === "false") out.injectFault = false;
  return Object.keys(out).length ? out : null;
}
