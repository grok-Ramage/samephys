import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runCertificate } from "./certify.ts";
import { defaultInput, FAMILIES, generateRun } from "./engine.ts";
import { inputToQuery, queryToInput } from "./permalink.ts";
import type { FamilyId } from "./types.ts";

describe("same-physics generator", () => {
  for (const family of FAMILIES.map((f) => f.id as FamilyId)) {
    it(`${family}: clean suites pass, faults fail`, () => {
      for (const seed of [0, 1, 2, 3, 4, 5, 7, 13]) {
        const clean = generateRun({
          ...defaultInput(family),
          seed,
          injectFault: false,
          count: 4,
          depth: 4,
          tolerance: 1e-8,
        });
        assert.equal(
          clean.pass,
          true,
          `${family} seed ${seed} clean should pass, maxResidual=${clean.maxResidual} identity=${clean.identity}`,
        );
        assert.ok(clean.maxResidual <= 1e-8, `${family} clean residual ${clean.maxResidual}`);

        const fault = generateRun({
          ...defaultInput(family),
          seed,
          injectFault: true,
          count: 4,
          depth: 4,
          tolerance: 1e-8,
        });
        assert.equal(
          fault.pass,
          false,
          `${family} seed ${seed} fault should fail, maxResidual=${fault.maxResidual} identity=${fault.identity}`,
        );
        assert.ok(fault.maxResidual > 1e-8, `${family} fault residual too small: ${fault.maxResidual}`);
      }
    });
  }
});

describe("master certificate", () => {
  it("every planned probe matches its expected verdict", () => {
    const report = runCertificate();
    assert.equal(report.ok, true, report.cases.filter((c) => !c.ok).map((c) => c.id).join(", "));
    assert.equal(report.failed, 0);
    assert.ok(report.total >= 30);
    for (const row of report.byFamily) {
      assert.equal(row.cleanOk, row.cleanN, `${row.family} clean`);
      assert.equal(row.faultOk, row.faultN, `${row.family} fault`);
    }
  });
});

describe("permalinks", () => {
  it("round-trips a Hopf fault suite", () => {
    const input = {
      ...defaultInput("hopf"),
      seed: 13,
      count: 5,
      depth: 2,
      tolerance: 1e-6,
      injectFault: true,
    };
    const q = inputToQuery(input);
    const back = queryToInput(q);
    assert.deepEqual(
      {
        family: back?.family,
        seed: back?.seed,
        count: back?.count,
        depth: back?.depth,
        tolerance: back?.tolerance,
        injectFault: back?.injectFault,
      },
      {
        family: "hopf",
        seed: 13,
        count: 5,
        depth: 2,
        tolerance: 1e-6,
        injectFault: true,
      },
    );
  });
});
