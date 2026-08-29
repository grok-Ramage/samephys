import { defaultInput, generateRun, familyMeta } from "./engine.ts";
import type { FamilyId } from "./types.ts";

export type CertCase = {
  id: string;
  family: FamilyId;
  seed: number;
  injectFault: boolean;
  expectPass: boolean;
};

export type CertCaseResult = CertCase & {
  pass: boolean;
  ok: boolean;
  maxResidual: number;
  identity: string;
  variantCount: number;
};

export type CertFamilyRow = {
  family: FamilyId;
  name: string;
  cleanOk: number;
  cleanN: number;
  faultOk: number;
  faultN: number;
  maxCleanResidual: number;
};

export type CertReport = {
  version: 1;
  title: "SamePhys master certificate";
  generatedAt: string;
  total: number;
  matched: number;
  failed: number;
  ok: boolean;
  cases: CertCaseResult[];
  byFamily: CertFamilyRow[];
};

export const CERT_PLAN: { family: FamilyId; seeds: number[] }[] = [
  { family: "pauli", seeds: [0, 1, 2, 3, 4, 5] },
  { family: "su2", seeds: [0, 1, 2] },
  { family: "hopf", seeds: [0, 7, 13] },
  { family: "fold", seeds: [0, 1] },
  { family: "laplacian", seeds: [0, 3] },
  { family: "ordering", seeds: [0, 5] },
];

export function listCertCases(): CertCase[] {
  const cases: CertCase[] = [];
  for (const { family, seeds } of CERT_PLAN) {
    for (const seed of seeds) {
      cases.push({
        id: `${family}-${seed}-clean`,
        family,
        seed,
        injectFault: false,
        expectPass: true,
      });
      cases.push({
        id: `${family}-${seed}-fault`,
        family,
        seed,
        injectFault: true,
        expectPass: false,
      });
    }
  }
  return cases;
}

export function runCertificate(): CertReport {
  const cases = listCertCases().map((c) => {
    const run = generateRun({
      ...defaultInput(c.family),
      seed: c.seed,
      injectFault: c.injectFault,
      count: 4,
      depth: 4,
      tolerance: 1e-8,
    });
    return {
      ...c,
      pass: run.pass,
      ok: run.pass === c.expectPass,
      maxResidual: run.maxResidual,
      identity: run.identity,
      variantCount: run.variants.length,
    };
  });

  const byFamily: CertFamilyRow[] = CERT_PLAN.map(({ family }) => {
    const rows = cases.filter((c) => c.family === family);
    const clean = rows.filter((c) => !c.injectFault);
    const fault = rows.filter((c) => c.injectFault);
    return {
      family,
      name: familyMeta(family).name,
      cleanOk: clean.filter((c) => c.ok).length,
      cleanN: clean.length,
      faultOk: fault.filter((c) => c.ok).length,
      faultN: fault.length,
      maxCleanResidual: Math.max(0, ...clean.map((c) => c.maxResidual)),
    };
  });

  const matched = cases.filter((c) => c.ok).length;
  return {
    version: 1,
    title: "SamePhys master certificate",
    generatedAt: new Date().toISOString(),
    total: cases.length,
    matched,
    failed: cases.length - matched,
    ok: matched === cases.length,
    cases,
    byFamily,
  };
}

export function reportToText(report: CertReport): string {
  const lines = [
    report.title,
    `generated ${report.generatedAt}`,
    `verdict ${report.ok ? "PASS" : "FAIL"}  ${report.matched}/${report.total} probes matched`,
    "",
    "family            clean     fault-as-designed   max clean residual",
  ];
  for (const row of report.byFamily) {
    const name = row.name.padEnd(16);
    const clean = `${row.cleanOk}/${row.cleanN}`.padEnd(9);
    const fault = `${row.faultOk}/${row.faultN}`.padEnd(19);
    lines.push(`${name} ${clean} ${fault} ${row.maxCleanResidual}`);
  }
  const misses = report.cases.filter((c) => !c.ok);
  if (misses.length) {
    lines.push("", "mismatches:");
    for (const c of misses) {
      lines.push(
        `  ${c.id}  pass=${c.pass} expected=${c.expectPass} maxResidual=${c.maxResidual}  ${c.identity}`,
      );
    }
  }
  return lines.join("\n");
}
