import { defaultInput, generateRun } from "./engine.ts";
import type { FamilyId } from "./types.ts";

/** Families that are legal same-physics equivalences. Not folds. */
export const EQUIV_FAMILY_IDS = [
  "pauli",
  "su2",
  "hopf",
  "laplacian",
  "ordering",
  "shell",
  "scale",
] as const;

export type EquivFamilyId = (typeof EQUIV_FAMILY_IDS)[number];

export const EQUIV_TOLERANCE = 1e-8;

export const EQUIV_PLAN: { family: EquivFamilyId; seed: number }[] = [
  { family: "pauli", seed: 1 },
  { family: "su2", seed: 0 },
  { family: "hopf", seed: 7 },
  { family: "laplacian", seed: 0 },
  { family: "ordering", seed: 0 },
  { family: "shell", seed: 0 },
  { family: "scale", seed: 7 },
];

export type EquivGate = {
  legal: boolean;
  isFoldChart: boolean;
  cleanPass: boolean;
  faultFails: boolean;
  reasons: string[];
};

export function isEquivFamily(id: string): id is EquivFamilyId {
  return (EQUIV_FAMILY_IDS as readonly string[]).includes(id);
}

export function isFoldFamily(id: string): boolean {
  return id === "fold";
}

/**
 * Equivalence logic gate.
 * legal ≡ ¬fold ∧ (clean residual ≤ tol) ∧ (fault residual > tol)
 * Fold charts belong to foldGate (F=0, a1=0, a2≠0), not this gate.
 */
export function equivGate(args: {
  family: string;
  cleanResidual: number;
  faultResidual: number;
  tolerance?: number;
}): EquivGate {
  const tol = args.tolerance ?? EQUIV_TOLERANCE;
  const isFoldChart = isFoldFamily(args.family);
  const cleanPass = Number.isFinite(args.cleanResidual) && args.cleanResidual <= tol;
  const faultFails = Number.isFinite(args.faultResidual) && args.faultResidual > tol;
  const reasons: string[] = [];
  if (isFoldChart) {
    reasons.push("fold chart — use foldGate ($F=0$, $a_1=0$, $a_2≠0$). Not this gate.");
  }
  if (!cleanPass) {
    reasons.push(`clean residual ${args.cleanResidual} exceeds ${tol}`);
  }
  if (!faultFails) {
    reasons.push("fault did not fail — negative control missing");
  }
  return {
    legal: !isFoldChart && cleanPass && faultFails,
    isFoldChart,
    cleanPass,
    faultFails,
    reasons,
  };
}

export type EquivCaseResult = {
  family: FamilyId;
  seed: number;
  identity: string;
  identityLatex: string;
  syntaxes: string[];
  cleanResidual: number;
  faultResidual: number;
  gate: EquivGate;
};

function probe(family: FamilyId, seed: number, tolerance: number): EquivCaseResult {
  const base = { ...defaultInput(family), seed, count: 4, depth: 4, tolerance };
  const clean = generateRun({ ...base, injectFault: false });
  const fault = generateRun({ ...base, injectFault: true });
  return {
    family,
    seed,
    identity: clean.identity,
    identityLatex: clean.identityLatex,
    syntaxes: clean.variants.map((v) => v.syntax),
    cleanResidual: clean.maxResidual,
    faultResidual: fault.maxResidual,
    gate: equivGate({
      family,
      cleanResidual: clean.maxResidual,
      faultResidual: fault.maxResidual,
      tolerance,
    }),
  };
}

export type EquivReport = {
  version: 1;
  title: "SamePhys equivalence logic gate";
  generatedAt: string;
  tolerance: number;
  total: number;
  legalN: number;
  failed: number;
  ok: boolean;
  cases: EquivCaseResult[];
  foldControl: EquivCaseResult;
};

export function runEquivBattery(tolerance = EQUIV_TOLERANCE): EquivReport {
  const cases = EQUIV_PLAN.map((p) => probe(p.family, p.seed, tolerance));
  const foldControl = probe("fold", 0, tolerance);
  const legalN = cases.filter((c) => c.gate.legal).length;
  const foldRefused = !foldControl.gate.legal && foldControl.gate.isFoldChart;
  return {
    version: 1,
    title: "SamePhys equivalence logic gate",
    generatedAt: new Date().toISOString(),
    tolerance,
    total: cases.length,
    legalN,
    failed: cases.length - legalN,
    ok: legalN === cases.length && foldRefused,
    cases,
    foldControl,
  };
}

export function equivReportToText(report: EquivReport): string {
  const lines = [
    report.title,
    `generated ${report.generatedAt}`,
    `verdict ${report.ok ? "PASS" : "FAIL"}  ${report.legalN}/${report.total} legal  fold-control refused=${report.foldControl.gate.isFoldChart && !report.foldControl.gate.legal}`,
    "logic  ¬fold ∧ clean≤tol ∧ fault>tol",
    "",
    "family            seed  legal  clean residual          fault residual",
  ];
  for (const c of report.cases) {
    const name = c.family.padEnd(16);
    const legal = (c.gate.legal ? "yes" : "no").padEnd(5);
    lines.push(
      `${name} ${String(c.seed).padEnd(4)}  ${legal}  ${c.cleanResidual}  ${c.faultResidual}  ${c.identity}`,
    );
  }
  lines.push(
    "",
    `fold control  legal=${report.foldControl.gate.legal}  isFold=${report.foldControl.gate.isFoldChart}  ${report.foldControl.identity}`,
  );
  const misses = report.cases.filter((c) => !c.gate.legal);
  if (misses.length) {
    lines.push("", "illegal:");
    for (const c of misses) {
      lines.push(`  ${c.family}-${c.seed}  ${c.gate.reasons.join("; ")}`);
    }
  }
  return lines.join("\n");
}
