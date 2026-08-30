import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EQUIV_FAMILY_IDS,
  equivGate,
  isEquivFamily,
  isFoldFamily,
  runEquivBattery,
} from "./equiv-gate.ts";

describe("equivGate logic", () => {
  it("AND of ¬fold, clean pass, and fault fail", () => {
    const ok = equivGate({ family: "hopf", cleanResidual: 1e-16, faultResidual: 1.0 });
    assert.equal(ok.legal, true);
    assert.equal(ok.isFoldChart, false);
    assert.equal(ok.cleanPass, true);
    assert.equal(ok.faultFails, true);
  });

  it("refuses Whitney fold even when residuals would pass the AND", () => {
    const g = equivGate({ family: "fold", cleanResidual: 0, faultResidual: 0.8 });
    assert.equal(g.isFoldChart, true);
    assert.equal(g.cleanPass, true);
    assert.equal(g.faultFails, true);
    assert.equal(g.legal, false);
  });

  it("refuses a clean identity whose fault does not fire", () => {
    const g = equivGate({ family: "pauli", cleanResidual: 0, faultResidual: 0 });
    assert.equal(g.legal, false);
    assert.equal(g.faultFails, false);
  });

  it("refuses a dirty identity even if the fault fails", () => {
    const g = equivGate({ family: "pauli", cleanResidual: 0.2, faultResidual: 1 });
    assert.equal(g.legal, false);
    assert.equal(g.cleanPass, false);
  });

  it("classifies families", () => {
    for (const id of EQUIV_FAMILY_IDS) assert.equal(isEquivFamily(id), true);
    assert.equal(isEquivFamily("fold"), false);
    assert.equal(isFoldFamily("fold"), true);
    assert.equal(isFoldFamily("hopf"), false);
  });
});

describe("live equivalence battery", () => {
  it("seven non-fold identities are legal and the fold chart is refused", () => {
    const report = runEquivBattery();
    assert.equal(report.total, 7);
    assert.equal(report.ok, true, equivMisses(report));
    assert.equal(report.legalN, 7);
    assert.equal(report.foldControl.gate.isFoldChart, true);
    assert.equal(report.foldControl.gate.legal, false);
    for (const c of report.cases) {
      assert.equal(c.gate.legal, true, `${c.family} ${c.identity}`);
      assert.ok(c.syntaxes.length >= 2, `${c.family} needs ≥2 syntaxes`);
    }
  });
});

function equivMisses(report: ReturnType<typeof runEquivBattery>): string {
  return report.cases
    .filter((c) => !c.gate.legal)
    .map((c) => `${c.family}:${c.gate.reasons.join(",")}`)
    .join("; ");
}
