# SamePhys

**Cross-desk [README CERT](./README.CERT.md) (stamp 2026-08-30T19:50Z): PASS.** Owned fold \(S_q\) at \((0,0)\). equivGate 7/7. Master certificate 48/48. \(\Sigma_{\mathrm{ReS}}\) not found.

Same-physics testing of operator syntax.

Two presentations encode the same physics when they agree on every admissible
probe — matrices, spectra, or sampled maps — within a stated tolerance. The
generator starts from a closed identity and rewrites it. The harness tries to
falsify equivalence. Fault injection is the negative control: a pass is only
meaningful if the same suite can fail.

This repository is the seed-reproducible kernel (TypeScript, Node 22, no
dependencies). The interactive lab is the SamePhys app.

## Families

| # | Family | Identity class |
|---|--------|----------------|
| 01 | Pauli algebra | words, commutators, and phase rewrites on M₂(ℂ) |
| 02 | Angular momentum | su(2) at spin 1, including the Casimir |
| 03 | Hopf map | S³ → S² in Pauli, complex, and quaternion syntax, plus U(1) fibers |
| 04 | Fold / cusp | Whitney germs as polynomial maps |
| 05 | Discrete Laplacian | 3-point stencil ≡ Fourier multiplier ≡ cycle graph |
| 06 | Operator ordering | Weyl(xp) = qp − [q,p]/2 = pq + [q,p]/2 |
| 07 | Lifted shells | Whitney germs pulled back along π: W∘π_σ = W∘π_C = W∘π_H |
| 08 | Planck chart | Identity 1: (ℓ−ℓ_P)/(ℓ+ℓ_P) = tanh(½ log(ℓ/ℓ_P)). Inversion oddness is extra, not a fold certificate. |

## Master certificate

Clean identities must pass. Injected faults must fail.

```bash
node --experimental-strip-types --test src/math.test.ts src/engine.test.ts
node --experimental-strip-types src/certify.mjs
```

The shipped battery is 48 probes across all eight families. Gold checks (not
generator-dependent) include XY = iZ, [X,Y] = 2iZ, XYZ = iI, X² = I,
{X,Y} = 0, the su(2) structure constants and Casimir, Hopf three-syntax
agreement on S² with fiber invariance, and Weyl ordering on a truncated
oscillator.

## Equivalence logic gate

Legal same-physics that is **not a fold**:

```
legal ≡ ¬fold ∧ (clean residual ≤ 10⁻⁸) ∧ (fault residual > 10⁻⁸)
```

Families 01–03 and 05–08 sit on this gate. Family 04 (Whitney fold/cusp) is a
fold chart — `foldGate`, not `equivGate`.

```bash
node --experimental-strip-types src/equiv-gate.mjs
```

## Use

```ts
import { generateRun, defaultInput } from "./src/engine.ts";

const run = generateRun({ ...defaultInput("hopf"), seed: 7 });
console.log(run.pass, run.maxResidual, run.identity);
```

Permalinks in the lab:

```
?f=hopf&s=7&n=4&d=4&t=1e-8
?f=fold&s=1&fault=1
```

Export JSON, LaTeX, or a Python residual stub from any run.

## Method

- Residual for matrices is relative Frobenius distance.
- Residual for point clouds and pullbacks is relative RMS.
- A spectrum Hausdorff check sits beside the residual when the object is Hermitian.
- Seeds are deterministic (`mulberry32`). The same input is the same suite.

## License

MIT
