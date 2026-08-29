import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  C,
  C0,
  C1,
  Ci,
  Mat,
  cfmt,
  cmul,
  formatSci,
  hausdorff,
  hermitianEigs,
  mulberry32,
  relRms,
} from "./math.ts";
import {
  PAULI,
  defaultInput,
  generateRun,
  hopfComplex,
  hopfPauli,
  hopfQuaternion,
  spin1,
  truncatedSHO,
} from "./engine.ts";

function nearly(a: number, b: number, eps = 1e-10): void {
  assert.ok(Math.abs(a - b) < eps, `expected ${a} ≈ ${b}`);
}

describe("complex / matrix primitives", () => {
  it("multiplies i * i = −1", () => {
    const z = cmul(Ci, Ci);
    nearly(z.re, -1);
    nearly(z.im, 0);
  });

  it("formats i and −i", () => {
    assert.equal(cfmt(Ci), "i");
    assert.equal(cfmt(C(0, -1)), "−i");
  });

  it("Pauli XY = iZ as matrices", () => {
    const { X, Y, Z, I } = PAULI;
    assert.ok(X.mul(Y).relDiff(Z.scale(Ci)) < 1e-12);
    assert.ok(X.comm(Y).relDiff(Z.scale(C(0, 2))) < 1e-12);
    assert.ok(X.mul(Y).mul(Z).relDiff(I.scale(Ci)) < 1e-12);
    assert.ok(X.mul(X).relDiff(I) < 1e-12);
    assert.ok(X.acomm(Y).relDiff(I.scale(C0)) < 1e-12);
    assert.ok(X.mul(Y).mul(X).relDiff(Y.scale(C(-1, 0))) < 1e-12);
  });

  it("su(2) spin-1 structure constants and Casimir", () => {
    const { Jx, Jy, Jz, J2 } = spin1();
    const I3 = Mat.identity(3);
    assert.ok(Jx.comm(Jy).relDiff(Jz.scale(Ci)) < 1e-12);
    assert.ok(Jy.comm(Jz).relDiff(Jx.scale(Ci)) < 1e-12);
    assert.ok(Jz.comm(Jx).relDiff(Jy.scale(Ci)) < 1e-12);
    assert.ok(J2.relDiff(I3.scale(C(2, 0))) < 1e-12);
  });

  it("Hopf three syntaxes agree and land on S²", () => {
    const rng = mulberry32(2026);
    for (let i = 0; i < 48; i++) {
      const a = rng() * 2 - 1;
      const b = rng() * 2 - 1;
      const c = rng() * 2 - 1;
      const d = rng() * 2 - 1;
      const n = Math.hypot(a, b, c, d) || 1;
      const p = { zr: a / n, zi: b / n, wr: c / n, wi: d / n };
      const pauli = hopfPauli(p);
      const cx = hopfComplex(p);
      const q = hopfQuaternion(p);
      nearly(pauli.x, cx.x, 1e-12);
      nearly(pauli.y, cx.y, 1e-12);
      nearly(pauli.z, cx.z, 1e-12);
      nearly(pauli.x, q.x, 1e-12);
      nearly(pauli.y, q.y, 1e-12);
      nearly(pauli.z, q.z, 1e-12);
      nearly(Math.hypot(pauli.x, pauli.y, pauli.z), 1, 1e-12);
    }
    const north = hopfPauli({ zr: 1, zi: 0, wr: 0, wi: 0 });
    nearly(north.x, 0);
    nearly(north.y, 0);
    nearly(north.z, 1);
  });

  it("fiber phase leaves the Hopf image invariant", () => {
    const p = { zr: 0.6, zi: 0.2, wr: -0.5, wi: 0.591607978 };
    const nrm = Math.hypot(p.zr, p.zi, p.wr, p.wi);
    p.zr /= nrm;
    p.zi /= nrm;
    p.wr /= nrm;
    p.wi /= nrm;
    const n0 = hopfPauli(p);
    const a = 1.7;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const rotated = {
      zr: c * p.zr - s * p.zi,
      zi: s * p.zr + c * p.zi,
      wr: c * p.wr - s * p.wi,
      wi: s * p.wr + c * p.wi,
    };
    const n1 = hopfPauli(rotated);
    nearly(n0.x, n1.x, 1e-12);
    nearly(n0.y, n1.y, 1e-12);
    nearly(n0.z, n1.z, 1e-12);
  });

  it("Weyl ordering identities on the truncated oscillator", () => {
    const { q, p } = truncatedSHO(8);
    const half = C(0.5, 0);
    const comm = q.comm(p);
    const weyl = q.mul(p).add(p.mul(q)).scale(half);
    const qpShift = q.mul(p).sub(comm.scale(half));
    const pqShift = p.mul(q).add(comm.scale(half));
    assert.ok(weyl.relDiff(qpShift) < 1e-12);
    assert.ok(weyl.relDiff(pqShift) < 1e-12);
  });

  it("spectrum of σz is {−1, +1}", () => {
    const eigs = hermitianEigs(PAULI.Z);
    assert.equal(eigs.length, 2);
    assert.ok(hausdorff(eigs, [-1, 1]) < 1e-10);
  });

  it("relRms and formatSci behave at edges", () => {
    assert.equal(relRms([1, 0], [1, 0]), 0);
    assert.ok(relRms([1, 0], [1, 1]) > 0.4);
    assert.equal(formatSci(0), "0");
    assert.match(formatSci(1e-11), /10/);
  });
});

describe("generator smoke", () => {
  it("default Pauli suite passes", () => {
    const run = generateRun(defaultInput("pauli"));
    assert.equal(run.pass, true);
    assert.ok(run.generatedAt > 0);
    assert.ok(run.variants.length >= 2);
  });
});
