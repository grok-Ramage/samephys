import { formatSci } from "./math.ts";
import type { RunResult } from "./types.ts";

export function runToJson(run: RunResult): string {
  return JSON.stringify(
    {
      family: run.input.family,
      seed: run.input.seed,
      identity: run.identity,
      pass: run.pass,
      maxResidual: run.maxResidual,
      tolerance: run.input.tolerance,
      injectFault: run.input.injectFault,
      variants: run.variants.map((v) => ({
        title: v.title,
        syntax: v.syntax,
        latex: v.latex,
        python: v.python,
        steps: v.steps,
      })),
      residual: run.residual,
      metrics: run.metrics,
      generatedAt: new Date(run.generatedAt).toISOString(),
    },
    null,
    2,
  );
}

export function runToLatex(run: RunResult): string {
  const lines = [
    `% SamePhys suite — ${run.familyName}`,
    `% identity: ${run.identity}`,
    `% verdict: ${run.pass ? "PASS" : "FAIL"}  max residual ${formatSci(run.maxResidual)}`,
    `\\begin{align*}`,
    ...run.variants.map((v, i) => `  O_{${i}} &= ${v.latex} ${i === run.variants.length - 1 ? "" : "\\\\"}`),
    `\\end{align*}`,
  ];
  return lines.join("\n");
}

export function runToPython(run: RunResult): string {
  return [
    `# SamePhys — ${run.familyName}`,
    `# ${run.identity}`,
    `# verdict ${run.pass ? "PASS" : "FAIL"}  max residual ${run.maxResidual}`,
    "import numpy as np",
    "",
    ...run.variants.map((v, i) => `# O${i}: ${v.syntax}\n# ${v.python}`),
    "",
    "def rel_rms(a, b):",
    "    a = np.asarray(a, dtype=float).ravel()",
    "    b = np.asarray(b, dtype=float).ravel()",
    "    d = np.sqrt(np.mean((a - b) ** 2))",
    "    denom = max(np.sqrt(0.5 * (np.mean(a ** 2) + np.mean(b ** 2))), 1e-15)",
    "    return d / denom",
    "",
    "# Compare flattened operator samples across generated syntax with rel_rms.",
  ].join("\n");
}

export function downloadText(filename: string, text: string, mime = "application/json"): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
