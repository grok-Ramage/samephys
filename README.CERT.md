# README CERT

**Verdict: PASS**  
**Stamp: 2026-08-30T19:50Z**  
**Issuer: grok-Ramage desks (CORE-GENERATOR · QUANTUM-GENERATOR · fold-hunt · generatorphysics · samephys)**

This file is the frozen certificate. It records only numbers and admits that were re-run on this stamp. It does not promote \(\Sigma\) of ReS, Einstein replacement, or a production 24D solver.

---

## 1. Owned fold (matches foldGate)

**Identity.** \(S_q(u;\alpha)=u^3/3-\alpha u\)

| Clause | Value | Gate |
|---|---|---|
| Chart | \(S_q\), claim `quantum_fold`, family `quantum` | CORE `eqgate` G0–G5 **ADMIT_CPU** |
| Point | \((u,\alpha)=(0,0)\) | Moore–Spence \(A_2\) toy |
| \(F=0\) | \(F=u^2-\alpha=0\) | on-shell |
| \(a_1=0\) | \(H=2u=0\) | kernel |
| \(a_2\neq 0\) | \(a_2=1\) | finite 1-jet |
| QID | `QID:S_q:germ:u=0:alpha=0:a2=1:Stokes=0,+/-2pi/3` | vault |
| Vault SHA-256 | `d52bf61d589c038f1e0118b4ea897bad26a7644b30cfb58f99d8edb3249549d9` | `EQUATION_VAULT.json` match |
| Stokes residual (SOLVE_CERT) | \(3.7333459727814504\times 10^{-12}\) | dressing is **not** a CERT |
| \(\Sigma_{\mathrm{ReS}}\) | empty / `CLOSED_FOR_PUBLISH` | not found |

QUANTUM-GENERATOR uses \(V=x^3/3+ax\). Same germ after \(a=-\alpha\). At \((x,a)=(0,0)\): \(|g|=0\), \(a_1=0\), fold **yes**. Default QUANTUM catastrophe is **cusp**, not this fold.

Fold Hunt `foldGate` (\(|g|<10^{-3}\), \(|a_1|<5\times 10^{-3}\), \(|a_2|>10^{-4}\)) accepts this point and **rejects** Lorentz coherent (\(a_1=-5.5724\)), Spin(4) (\(a_1=-1.8713\)), and 10D Regge (\(a_1=-4.7811\)).

---

## 2. Equivalence logic gate (not folds)

```
legal ≡ ¬fold ∧ (clean residual ≤ 10⁻⁸) ∧ (fault residual > 10⁻⁸)
```

**Verdict: PASS 7/7.** Whitney fold/cusp (family 04) is a fold chart — `foldGate`, not this gate.

| # | Family | Seed | Identity | Clean residual | Fault residual | AND |
|---|---|---|---|---|---|---|
| 01 | Pauli | 1 | \(XY=iZ\) | \(0\) | \(1.414213562373095\) | legal |
| 02 | su(2) | 0 | \([J_x,J_y]=iJ_z\) | \(2.2204460492503128\times 10^{-16}\) | \(2\) | legal |
| 03 | Hopf | 7 | \(\pi_\sigma=\pi_{\mathbb C}=\pi_{\mathbb H}\) | \(1.8218106909375956\times 10^{-16}\) | \(1.0685648767968527\) | legal |
| 05 | Laplacian | 0 | \(\Delta_3=\Delta_{\mathcal F}=-L_{C_{16}}\) | \(1.4622710540565056\times 10^{-15}\) | \(0.2224970797449924\) | legal |
| 06 | Weyl | 0 | \(\mathrm{Weyl}(xp)=qp-[q,p]/2=pq+[q,p]/2\) | \(0\) | \(0.44721359549995804\) | legal |
| 07 | Lifted shells | 0 | \(W_1\circ\pi_\sigma=W_1\circ\pi_{\mathbb C}=W_1\circ\pi_{\mathbb H}\) | \(2.0534961913228911\times 10^{-16}\) | \(0.7649808441620162\) | legal |
| 08 | Planck chart | 7 | \((\ell-\ell_P)/(\ell+\ell_P)=\tanh\tfrac12\log(\ell/\ell_P)\) | \(7.969418396230559\times 10^{-17}\) | \(0.1056837963921274\) | legal |
| 04 | Fold / cusp | 0 | \((x,y^2)\equiv(x,y\cdot y)\) | \(0\) | \(0.86524870990211\) | **refused** (fold chart) |

Replay: `node --experimental-strip-types src/equiv-gate.mjs` in `samephys`.

---

## 3. SamePhys master certificate

**Verdict: PASS 48/48 probes matched.** Clean identities pass. Injected faults fail.

| Family | Clean | Fault-as-designed | Max clean residual |
|---|---|---|---|
| Pauli algebra | 6/6 | 6/6 | \(0\) |
| Angular momentum | 3/3 | 3/3 | \(2.22\times 10^{-16}\) |
| Hopf map | 3/3 | 3/3 | \(1.82\times 10^{-16}\) |
| Fold / cusp | 2/2 | 2/2 | \(5.14\times 10^{-17}\) |
| Discrete Laplacian | 2/2 | 2/2 | \(1.46\times 10^{-15}\) |
| Operator ordering | 2/2 | 2/2 | \(0\) |
| Lifted shells | 3/3 | 3/3 | \(3.28\times 10^{-16}\) |
| Planck chart | 3/3 | 3/3 | \(7.97\times 10^{-17}\) |

Replay: `node --experimental-strip-types src/certify.mjs` in `samephys`.

---

## 4. CORE eqgate vs prior sentences (fail-closed G0–G5)

| Sentence | Result | Gate | Matches prior desks |
|---|---|---|---|
| \(S_q\) fold at \((0,0)\) | **ADMIT** | ADMIT | legal fold |
| Moore–Spence / WKB / Stokes on \(S_q\) | **ADMIT** | ADMIT | legal fold |
| Planck / \(\ell_P\) / scale chain | **ADMIT** | scale | equiv ledger, not a fold |
| Pauli \(XY=iZ\) as \(S_q\) text | **ADMIT** | text | sentence-legal only, not a residual cert |
| Weyl as \(S_q\) text | **ADMIT** | text | sentence-legal only |
| Hopf claimed as Hess ReS fold | **REFUSE** | G4 | Hopf is not a ReS fold |
| Restencil 24D \(\varepsilon\in[3.3,5]\) | **REFUSE** | G3 | closed ReS chart |
| Lorentz coherent as hunt fold | **REFUSE** | G4 | \(a_1\) not kernel |
| \(a_1+q_c\) mix | **REFUSE** | G0 | ledgers stay split |
| \(S_q\) + GPU | **REFUSE** | G5 | CPU/text only |

---

## 5. What this CERT does not claim

- Replacement of Einstein field equations
- Physical spacetime singularity theorem
- \(\Sigma_{\mathrm{ReS}}\) nonempty
- Production 24D \(S\) (file is not on disk)
- Hopf, Pauli, Weyl, Laplacian, Planck, or lifted shells as folds of ReS
- QUANTUM default cusp sample as a fold (\(a_1\neq 0\))

---

## 6. Desk roles

| Repo | Role |
|---|---|
| [CORE-GENERATOR](https://github.com/grok-Ramage/CORE-GENERATOR) | Owns \(S_q\). `eqgate` admit/refuse. This README CERT. |
| [QUANTUM-GENERATOR](https://github.com/grok-Ramage/QUANTUM-GENERATOR) | \(A_2\) germ \(V=x^3/3+ax\). Hopf fibers / Pauli **X** are circuit geometry, not ReS folds. |
| [fold-hunt](https://github.com/grok-Ramage/fold-hunt) | Agents 1–5 + `foldGate` + `equivGate` freeze. Hunt closed for publish. |
| [generatorphysics](https://github.com/grok-Ramage/generatorphysics) | SamePhys lab. Logic-gate dialog. |
| [samephys](https://github.com/grok-Ramage/samephys) | Kernel: master certificate 48/48 and equivGate 7/7. |

**Bottom line.** The unique fold that matches every prior gate is \(S_q\) at \((0,0)\) with \(a_2=1\), admitted as `quantum_fold`. Seven SamePhys identities are legal equivalences, not folds. ReS hunt remains closed. \(\Sigma\) is not found.
