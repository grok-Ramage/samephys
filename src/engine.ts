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
  pick,
  randn,
  relRms,
  shuffle,
} from "./math.ts";
import type { FamilyId, FamilyMeta, Metric, RunInput, RunResult, Variant, VizKind } from "./types.ts";

export const FAMILIES: FamilyMeta[] = [
  {
    id: "pauli",
    index: "01",
    name: "Pauli algebra",
    symbol: "σ",
    blurb: "Words, commutators, and phase rewrites on a single qubit.",
  },
  {
    id: "su2",
    index: "02",
    name: "Angular momentum",
    symbol: "su(2)",
    blurb: "Ladder operators and [Jᵢ, Jⱼ] = i εᵢⱼₖ Jₖ at spin 1.",
  },
  {
    id: "hopf",
    index: "03",
    name: "Hopf map",
    symbol: "S³→S²",
    blurb: "Pauli, quaternion, and complex syntax for the same fibration.",
  },
  {
    id: "fold",
    index: "04",
    name: "Fold / cusp",
    symbol: "W₁",
    blurb: "Whitney pullbacks: polynomial, monomial, and bilinear forms.",
  },
  {
    id: "laplacian",
    index: "05",
    name: "Discrete Laplacian",
    symbol: "Δ",
    blurb: "3-point stencil, Fourier multiplier, and cycle-graph Δ.",
  },
  {
    id: "ordering",
    index: "06",
    name: "Operator ordering",
    symbol: "qp",
    blurb: "Weyl, qp − [q,p]/2, and pq + [q,p]/2 of the same classical symbol.",
  },
  {
    id: "shell",
    index: "07",
    name: "Lifted shells",
    symbol: "π*W",
    blurb: "Whitney germs pulled back along the Hopf map — same jet, three π syntaxes.",
  },
  {
    id: "scale",
    index: "08",
    name: "Planck chart",
    symbol: "ℓ_P",
    blurb: "Cayley map of rapidity ½ log(ℓ/ℓ_P). Inversion oddness is an extra law, not a corollary.",
  },
];

export function familyMeta(id: FamilyId): FamilyMeta {
  return FAMILIES.find((f) => f.id === id) ?? FAMILIES[0]!;
}

const PX = Mat.from([
  [C0, C1],
  [C1, C0],
]);
const PY = Mat.from([
  [C0, C(0, -1)],
  [C(0, 1), C0],
]);
const PZ = Mat.from([
  [C1, C0],
  [C0, C(-1, 0)],
]);
const PI = Mat.identity(2);

type PauliAtom = "I" | "X" | "Y" | "Z";
type PauliMul = { phase: { re: number; im: number }; out: PauliAtom };

const PAULI_MAT: Record<PauliAtom, Mat> = { I: PI, X: PX, Y: PY, Z: PZ };

const PAULI_MUL: Record<string, PauliMul> = {
  II: { phase: C1, out: "I" },
  IX: { phase: C1, out: "X" },
  IY: { phase: C1, out: "Y" },
  IZ: { phase: C1, out: "Z" },
  XI: { phase: C1, out: "X" },
  XX: { phase: C1, out: "I" },
  XY: { phase: Ci, out: "Z" },
  XZ: { phase: C(0, -1), out: "Y" },
  YI: { phase: C1, out: "Y" },
  YX: { phase: C(0, -1), out: "Z" },
  YY: { phase: C1, out: "I" },
  YZ: { phase: Ci, out: "X" },
  ZI: { phase: C1, out: "Z" },
  ZX: { phase: Ci, out: "Y" },
  ZY: { phase: C(0, -1), out: "X" },
  ZZ: { phase: C1, out: "I" },
};

const EXPAND: Record<"X" | "Y" | "Z", { phase: { re: number; im: number }; word: PauliAtom[] }[]> = {
  X: [
    { phase: C(0, -1), word: ["Y", "Z"] },
    { phase: Ci, word: ["Z", "Y"] },
  ],
  Y: [
    { phase: C(0, -1), word: ["Z", "X"] },
    { phase: Ci, word: ["X", "Z"] },
  ],
  Z: [
    { phase: C(0, -1), word: ["X", "Y"] },
    { phase: Ci, word: ["Y", "X"] },
  ],
};

function pauliProduct(letters: PauliAtom[]): { phase: { re: number; im: number }; letter: PauliAtom } {
  let phase = { re: 1, im: 0 };
  let acc: PauliAtom = "I";
  for (const L of letters) {
    const r: PauliMul = PAULI_MUL[acc + L] ?? { phase: C1, out: "I" };
    phase = cmul(phase, r.phase);
    acc = r.out;
  }
  return { phase, letter: acc };
}

function evalPauliWord(phase: { re: number; im: number }, letters: PauliAtom[]): Mat {
  let m = PI;
  for (const L of letters) m = m.mul(PAULI_MAT[L]);
  return m.scale(phase);
}

function printPauli(phase: { re: number; im: number }, letters: PauliAtom[]): string {
  const body =
    letters.length === 0 || (letters.length === 1 && letters[0] === "I")
      ? "I"
      : letters.filter((L) => L !== "I").join("");
  const p = cfmt(phase);
  if (p === "1") return body || "I";
  if (p === "−1" || p === "-1") return `−${body || "I"}`;
  if (p === "i" || p === "−i") return `${p} ${body || "I"}`;
  return `(${p}) ${body || "I"}`;
}

function latexPauli(phase: { re: number; im: number }, letters: PauliAtom[]): string {
  const body =
    letters.length === 0 || (letters.length === 1 && letters[0] === "I")
      ? "I"
      : letters
          .filter((L) => L !== "I")
          .map((L) => `\\sigma_{${L.toLowerCase()}}`)
          .join(" ");
  const p = cfmt(phase);
  if (p === "1") return body;
  if (p === "i") return `i ${body}`;
  if (p === "−i") return `-i ${body}`;
  return `(${p}) ${body}`;
}

function pythonPauli(phase: { re: number; im: number }, letters: PauliAtom[]): string {
  const body = letters.filter((L) => L !== "I").join(" @ ") || "I";
  const p = cfmt(phase).replace("−", "-").replace("i", "1j");
  if (p === "1") return body;
  return `(${p}) * (${body})`;
}

function dressPauliWord(
  rng: () => number,
  phase: { re: number; im: number },
  letters: PauliAtom[],
  depth: number,
): { phase: { re: number; im: number }; letters: PauliAtom[]; steps: string[] } {
  let ph = { ...phase };
  let w: PauliAtom[] = letters.filter((L) => L !== "I");
  if (w.length === 0) w = ["I"];
  const steps: string[] = [];
  for (let d = 0; d < depth; d++) {
    const move = Math.floor(rng() * 4);
    if (move === 0) {
      const P = pick(rng, ["X", "Y", "Z"] as const);
      if (rng() > 0.5) w = [P, P, ...w];
      else w = [...w, P, P];
      steps.push(`insert ${P}${P} = I`);
    } else if (move === 1) {
      const idx = Math.floor(rng() * w.length);
      const L = w[idx]!;
      if (L === "I") continue;
      const opt = pick(rng, EXPAND[L]);
      w = [...w.slice(0, idx), ...opt.word, ...w.slice(idx + 1)];
      ph = cmul(ph, opt.phase);
      steps.push(`expand ${L} → (${cfmt(opt.phase)}) ${opt.word.join("")}`);
    } else if (move === 2 && w.length >= 2) {
      const idx = Math.floor(rng() * (w.length - 1));
      const a = w[idx]!;
      const b = w[idx + 1]!;
      const r: PauliMul = PAULI_MUL[a + b] ?? { phase: C1, out: "I" };
      w = [...w.slice(0, idx), r.out, ...w.slice(idx + 2)];
      ph = cmul(ph, r.phase);
      steps.push(`collapse ${a}${b} → (${cfmt(r.phase)}) ${r.out}`);
    } else {
      w = ["I", ...w, "I"];
      steps.push("pad with I");
    }
    if (w.length > 14) {
      const red = pauliProduct(w);
      w = [red.letter];
      ph = cmul(ph, red.phase);
      steps.push(`reduce word → (${cfmt(red.phase)}) ${red.letter}`);
    }
  }
  return { phase: ph, letters: w, steps };
}

type MatrixForm = {
  title: string;
  syntax: string;
  latex: string;
  python: string;
  steps: string[];
  mat: Mat;
};

function formToVariant(f: MatrixForm, i: number): Variant {
  return {
    id: `v${i}`,
    title: f.title,
    syntax: f.syntax,
    latex: f.latex,
    python: f.python,
    steps: f.steps,
    samples: f.mat.flatten(),
    matrix: f.mat,
  };
}

function takeForms<T>(forms: T[], n: number, rng: () => number): T[] {
  if (forms.length === 0) return [];
  const head = forms[0]!;
  const rest = shuffle(rng, forms.slice(1));
  const out = [head, ...rest];
  const uniq: T[] = [];
  const seen = new Set<string>();
  for (const f of out) {
    const rec = f as { syntax?: string; title?: string };
    const key = rec.syntax ?? rec.title ?? JSON.stringify(f);
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(f);
    if (uniq.length >= n) break;
  }
  return uniq;
}

function runPauli(input: RunInput, rng: () => number): Omit<RunResult, "id" | "generatedAt"> {
  const skeletons: {
    name: string;
    identity: string;
    latex: string;
    letters: PauliAtom[];
    phase: { re: number; im: number };
  }[] = [
    { name: "Commutator [X, Y]", identity: "[X, Y] = 2i Z", latex: "[\\sigma_x,\\sigma_y]=2i\\sigma_z", letters: ["Z"], phase: C(0, 2) },
    { name: "Product XY", identity: "XY = i Z", latex: "\\sigma_x\\sigma_y=i\\sigma_z", letters: ["Z"], phase: Ci },
    { name: "Triple XYZ", identity: "XYZ = i I", latex: "\\sigma_x\\sigma_y\\sigma_z=i I", letters: ["I"], phase: Ci },
    { name: "Conjugation XYX", identity: "XYX = −Y", latex: "\\sigma_x\\sigma_y\\sigma_x=-\\sigma_y", letters: ["Y"], phase: C(-1, 0) },
    { name: "Square X²", identity: "X² = I", latex: "\\sigma_x^2=I", letters: ["I"], phase: C1 },
    { name: "Anticommutator {X, Y}", identity: "{X, Y} = 0", latex: "\\{\\sigma_x,\\sigma_y\\}=0", letters: ["I"], phase: C0 },
  ];
  const sk = skeletons[input.seed % skeletons.length]!;
  const reduced = evalPauliWord(sk.phase, sk.letters);
  const forms: MatrixForm[] = [
    {
      title: "closed form",
      syntax: printPauli(sk.phase, sk.letters),
      latex: latexPauli(sk.phase, sk.letters),
      python: pythonPauli(sk.phase, sk.letters),
      steps: ["canonical reduction via Pauli table"],
      mat: reduced,
    },
  ];

  if (sk.name.startsWith("Commutator")) {
    forms.push(
      { title: "commutator", syntax: "[X, Y]", latex: "[\\sigma_x,\\sigma_y]", python: "X @ Y - Y @ X", steps: ["definition [A,B] = AB − BA"], mat: PX.comm(PY) },
      { title: "expanded", syntax: "XY − YX", latex: "\\sigma_x\\sigma_y-\\sigma_y\\sigma_x", python: "X @ Y - Y @ X", steps: ["expand commutator"], mat: PX.mul(PY).sub(PY.mul(PX)) },
      { title: "antisymmetry", syntax: "−[Y, X]", latex: "-[\\sigma_y,\\sigma_x]", python: "-(Y @ X - X @ Y)", steps: ["[A,B] = −[B,A]"], mat: PY.comm(PX).scale(C(-1, 0)) },
    );
  } else if (sk.name.startsWith("Product")) {
    forms.push(
      { title: "juxtaposition", syntax: "XY", latex: "\\sigma_x\\sigma_y", python: "X @ Y", steps: ["literal product"], mat: PX.mul(PY) },
      { title: "table", syntax: "i Z", latex: "i \\sigma_z", python: "1j * Z", steps: ["XY = iZ"], mat: PZ.scale(Ci) },
    );
  } else if (sk.name.startsWith("Triple")) {
    forms.push(
      { title: "word", syntax: "XYZ", latex: "\\sigma_x\\sigma_y\\sigma_z", python: "X @ Y @ Z", steps: ["literal triple"], mat: PX.mul(PY).mul(PZ) },
      { title: "assoc", syntax: "(XY)Z", latex: "(\\sigma_x\\sigma_y)\\sigma_z", python: "(X @ Y) @ Z", steps: ["left association"], mat: PX.mul(PY).mul(PZ) },
      { title: "assoc-R", syntax: "X(YZ)", latex: "\\sigma_x(\\sigma_y\\sigma_z)", python: "X @ (Y @ Z)", steps: ["right association"], mat: PX.mul(PY.mul(PZ)) },
    );
  } else if (sk.name.startsWith("Conjugation")) {
    forms.push(
      { title: "word", syntax: "XYX", latex: "\\sigma_x\\sigma_y\\sigma_x", python: "X @ Y @ X", steps: ["conjugation by X"], mat: PX.mul(PY).mul(PX) },
      { title: "reduced", syntax: "−Y", latex: "-\\sigma_y", python: "-Y", steps: ["XYX = −Y"], mat: PY.scale(C(-1, 0)) },
    );
  } else if (sk.name.startsWith("Square")) {
    forms.push(
      { title: "square", syntax: "X X", latex: "\\sigma_x \\sigma_x", python: "X @ X", steps: ["literal square"], mat: PX.mul(PX) },
      { title: "identity", syntax: "I", latex: "I", python: "I", steps: ["X² = I"], mat: PI },
    );
  } else {
    forms.push(
      { title: "anticommutator", syntax: "{X, Y}", latex: "\\{\\sigma_x,\\sigma_y\\}", python: "X @ Y + Y @ X", steps: ["definition {A,B} = AB + BA"], mat: PX.acomm(PY) },
      { title: "expanded", syntax: "XY + YX", latex: "\\sigma_x\\sigma_y+\\sigma_y\\sigma_x", python: "X @ Y + Y @ X", steps: ["expand anticommutator"], mat: PX.mul(PY).add(PY.mul(PX)) },
      { title: "zero", syntax: "0", latex: "0", python: "0 * I", steps: ["{X,Y} = 0"], mat: PI.scale(C0) },
    );
  }

  for (let i = 0; i < Math.max(2, input.count); i++) {
    const dressed = dressPauliWord(rng, sk.phase, sk.letters, Math.max(1, input.depth));
    forms.push({
      title: `rewrite ${i + 1}`,
      syntax: printPauli(dressed.phase, dressed.letters),
      latex: latexPauli(dressed.phase, dressed.letters),
      python: pythonPauli(dressed.phase, dressed.letters),
      steps: dressed.steps,
      mat: evalPauliWord(dressed.phase, dressed.letters),
    });
  }

  const selected = takeForms(forms, input.count + 1, rng);
  return packGenericRun({
    input,
    familyName: "Pauli algebra",
    identity: sk.identity,
    identityLatex: sk.latex,
    blurb: "Single-qubit Pauli syntax. Rewrite using XY = iZ, X² = I, and commutator identities. Same physics means the 2×2 matrices agree.",
    variants: selected.map(formToVariant),
    notes: [
      "Pauli multiplication is a finite group (up to phases) — every word reduces to ±I, ±X, ±Y, ±Z, times i^k.",
      "Depth controls how often we expand a letter into a two-letter product or insert P² = I.",
    ],
    viz: "matrix",
  });
}

export const PAULI = { I: PI, X: PX, Y: PY, Z: PZ };

export function spin1(): { Jx: Mat; Jy: Mat; Jz: Mat; Jp: Mat; Jm: Mat; J2: Mat } {
  const s = Math.sqrt(2);
  const Jp = Mat.from([
    [C0, C(s), C0],
    [C0, C0, C(s)],
    [C0, C0, C0],
  ]);
  const Jm = Mat.from([
    [C0, C0, C0],
    [C(s), C0, C0],
    [C0, C(s), C0],
  ]);
  const Jz = Mat.from([
    [C1, C0, C0],
    [C0, C0, C0],
    [C0, C0, C(-1, 0)],
  ]);
  const Jx = Jp.add(Jm).scale(C(0.5, 0));
  const Jy = Jp.sub(Jm).scale(C(0, -0.5));
  const J2 = Jx.mul(Jx).add(Jy.mul(Jy)).add(Jz.mul(Jz));
  return { Jx, Jy, Jz, Jp, Jm, J2 };
}

function runSu2(input: RunInput, rng: () => number): Omit<RunResult, "id" | "generatedAt"> {
  const { Jx, Jy, Jz, Jp, Jm, J2 } = spin1();
  const I3 = Mat.identity(3);
  const targets: { name: string; latex: string; forms: MatrixForm[] }[] = [
    {
      name: "[Jx, Jy] = i Jz",
      latex: "[J_x,J_y]=i J_z",
      forms: [
        { title: "commutator", syntax: "[Jx, Jy]", latex: "[J_x,J_y]", python: "Jx @ Jy - Jy @ Jx", mat: Jx.comm(Jy), steps: ["definition"] },
        { title: "closed", syntax: "i Jz", latex: "i J_z", python: "1j * Jz", mat: Jz.scale(Ci), steps: ["so(3) structure constants"] },
        { title: "expanded", syntax: "Jx Jy − Jy Jx", latex: "J_x J_y - J_y J_x", python: "Jx@Jy - Jy@Jx", mat: Jx.mul(Jy).sub(Jy.mul(Jx)), steps: ["expand"] },
        { title: "antisym", syntax: "−[Jy, Jx]", latex: "-[J_y,J_x]", python: "-(Jy @ Jx - Jx @ Jy)", mat: Jy.comm(Jx).scale(C(-1, 0)), steps: ["antisymmetry"] },
      ],
    },
    {
      name: "[Jz, J+] = J+",
      latex: "[J_z,J_+]=J_+",
      forms: [
        { title: "commutator", syntax: "[Jz, J+]", latex: "[J_z,J_+]", python: "Jz @ Jp - Jp @ Jz", mat: Jz.comm(Jp), steps: ["definition"] },
        { title: "closed", syntax: "J+", latex: "J_+", python: "Jp", mat: Jp, steps: ["ladder identity"] },
        { title: "via Jx,Jy", syntax: "[Jz, Jx + i Jy]", latex: "[J_z, J_x + i J_y]", python: "Jz.comm(Jx + 1j*Jy)", mat: Jz.comm(Jx.add(Jy.scale(Ci))), steps: ["J+ = Jx + i Jy"] },
      ],
    },
    {
      name: "J² = Jx² + Jy² + Jz² = 2 I",
      latex: "J^2=j(j+1)I=2I",
      forms: [
        { title: "sum of squares", syntax: "Jx² + Jy² + Jz²", latex: "J_x^2+J_y^2+J_z^2", python: "Jx@Jx + Jy@Jy + Jz@Jz", mat: J2, steps: ["definition of Casimir"] },
        { title: "Casimir", syntax: "j(j+1) I", latex: "j(j+1)I", python: "2 * I", mat: I3.scale(C(2, 0)), steps: ["j = 1 ⇒ j(j+1) = 2"] },
        { title: "ladder form", syntax: "J− J+ + Jz² + Jz", latex: "J_- J_+ + J_z^2 + J_z", python: "Jm@Jp + Jz@Jz + Jz", mat: Jm.mul(Jp).add(Jz.mul(Jz)).add(Jz), steps: ["J² = J−J+ + Jz(Jz+1)"] },
        { title: "ladder form +", syntax: "J+ J− + Jz² − Jz", latex: "J_+ J_- + J_z^2 - J_z", python: "Jp@Jm + Jz@Jz - Jz", mat: Jp.mul(Jm).add(Jz.mul(Jz)).sub(Jz), steps: ["J² = J+J− + Jz(Jz−1)"] },
      ],
    },
  ];
  const t = targets[input.seed % targets.length]!;
  const selected = takeForms(t.forms, input.count + 1, rng);
  return packGenericRun({
    input,
    familyName: "Angular momentum",
    identity: t.name,
    identityLatex: t.latex,
    blurb: "Spin-1 representation of su(2). Ladder and Cartesian syntax must give the same 3×3 matrices (ħ = 1).",
    variants: selected.map(formToVariant),
    notes: [
      "J± = Jx ± i Jy. Structure constants εᵢⱼₖ are tested as matrix identities, not symbols.",
      "The Casimir J² is 2I on the spin-1 irrep — a same-physics check of two rewrite paths.",
    ],
    viz: "matrix",
  });
}

export type HopfPt = { zr: number; zi: number; wr: number; wi: number };

function sampleS3(rng: () => number, n: number): HopfPt[] {
  const pts: HopfPt[] = [];
  for (let i = 0; i < n; i++) {
    const a = randn(rng);
    const b = randn(rng);
    const c = randn(rng);
    const d = randn(rng);
    const nrm = Math.hypot(a, b, c, d) || 1;
    pts.push({ zr: a / nrm, zi: b / nrm, wr: c / nrm, wi: d / nrm });
  }
  return pts;
}

export function hopfPauli(p: HopfPt) {
  const nx = 2 * (p.zr * p.wr + p.zi * p.wi);
  const ny = 2 * (p.zr * p.wi - p.zi * p.wr);
  const nz = p.zr * p.zr + p.zi * p.zi - (p.wr * p.wr + p.wi * p.wi);
  return { x: nx, y: ny, z: nz };
}

export function hopfComplex(p: HopfPt) {
  const re = 2 * (p.zr * p.wr + p.zi * p.wi);
  const im = 2 * (p.zi * p.wr - p.zr * p.wi);
  const nz = p.zr * p.zr + p.zi * p.zi - (p.wr * p.wr + p.wi * p.wi);
  return { x: re, y: -im, z: nz };
}

function qmul(
  a: [number, number, number, number],
  b: [number, number, number, number],
): [number, number, number, number] {
  const [a0, a1, a2, a3] = a;
  const [b0, b1, b2, b3] = b;
  return [
    a0 * b0 - a1 * b1 - a2 * b2 - a3 * b3,
    a0 * b1 + a1 * b0 + a2 * b3 - a3 * b2,
    a0 * b2 - a1 * b3 + a2 * b0 + a3 * b1,
    a0 * b3 + a1 * b2 - a2 * b1 + a3 * b0,
  ];
}

export function hopfQuaternion(p: HopfPt) {
  // Identify (z, w) ∈ C² with q = z_r + z_i i + w_i j + w_r k so that
  // q i q̄ ∈ Im H reproduces n = ψ† σ ψ.
  const q: [number, number, number, number] = [p.zr, p.zi, p.wi, p.wr];
  const qbar: [number, number, number, number] = [p.zr, -p.zi, -p.wi, -p.wr];
  const i: [number, number, number, number] = [0, 1, 0, 0];
  const v = qmul(qmul(q, i), qbar);
  return { x: v[2]!, y: -v[3]!, z: v[1]! };
}

function flattenCloud(c: { x: number; y: number; z: number }[]): Float64Array {
  const out = new Float64Array(c.length * 3);
  for (let i = 0; i < c.length; i++) {
    out[3 * i] = c[i]!.x;
    out[3 * i + 1] = c[i]!.y;
    out[3 * i + 2] = c[i]!.z;
  }
  return out;
}

function runHopf(input: RunInput, rng: () => number): Omit<RunResult, "id" | "generatedAt"> {
  const n = Math.max(24, Math.min(128, input.probes * 8));
  const pts = sampleS3(rng, n);
  const pauli = pts.map(hopfPauli);
  const complex = pts.map(hopfComplex);
  const quat = pts.map(hopfQuaternion);
  const fiberPts: HopfPt[] = pts.map((p) => {
    const a = rng() * 2 * Math.PI;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return {
      zr: c * p.zr - s * p.zi,
      zi: s * p.zr + c * p.zi,
      wr: c * p.wr - s * p.wi,
      wi: s * p.wr + c * p.wi,
    };
  });
  const fiberPauli = fiberPts.map(hopfPauli);

  const forms = [
    {
      title: "spinor / Pauli",
      syntax: "n = ψ† σ ψ",
      latex: "n=\\psi^\\dagger \\sigma \\psi",
      python: "n = psi.conj().T @ sigma @ psi",
      steps: ["two-component spinor on S³", "nᵢ = ⟨σᵢ⟩"],
      cloud: pauli,
    },
    {
      title: "complex Hopf",
      syntax: "(2 z w̄, |z|² − |w|²)",
      latex: "(2z\\bar w,\\lvert z\\rvert^2-\\lvert w\\rvert^2)",
      python: "(2*z*np.conj(w), abs(z)**2 - abs(w)**2)",
      steps: ["Hopf map C² ⊃ S³ → C × R ≅ R³", "y-sign matches Pauli"],
      cloud: complex,
    },
    {
      title: "quaternion",
      syntax: "q i q̄",
      latex: "q\\, i\\, \\bar q",
      python: "q * np.quaternion(0,1,0,0) * q.conjugate()",
      steps: ["identify S³ with unit quaternions", "Ad_q(i) lands in Im H ≅ R³"],
      cloud: quat,
    },
    {
      title: "U(1) fiber",
      syntax: "ψ ↦ e^{iα} ψ  (same n)",
      latex: "\\pi(e^{i\\alpha}\\psi)=\\pi(\\psi)",
      python: "hopf(np.exp(1j*alpha) * psi)",
      steps: ["phase the spinor along the Hopf fiber", "projection is U(1)-invariant"],
      cloud: fiberPauli,
    },
  ];

  const selected = takeForms(forms, input.count + 1, rng).map((f, i) => ({
    id: `v${i}`,
    title: f.title,
    syntax: f.syntax,
    latex: f.latex,
    python: f.python,
    steps: f.steps,
    samples: flattenCloud(f.cloud),
    cloud: f.cloud,
  }));

  const meanRad =
    pauli.reduce((s, p) => s + Math.abs(Math.hypot(p.x, p.y, p.z) - 1), 0) / pauli.length;

  return packGenericRun({
    input,
    familyName: "Hopf map",
    identity: "π_Pauli = π_C = π_H  and  π(e^{iα}ψ) = π(ψ)",
    identityLatex: "\\pi_{\\sigma}=\\pi_{\\mathbb C}=\\pi_{\\mathbb H}",
    blurb: "Three syntactic presentations of the Hopf fibration S³ → S², plus fiber invariance. Same physics means the S² image of every sample agrees.",
    variants: selected,
    notes: [
      "Points are drawn from the Gaussian measure on C², then normalized onto S³.",
      "A fault injects a y-sign flip on one syntax — the classical orientation mismatch the test is built to catch.",
    ],
    viz: "cloud",
    extraMetrics: [
      {
        key: "on-sphere",
        label: "mean |n| − 1",
        value: meanRad,
        pass: meanRad < 1e-10,
        detail: "images should lie on S²",
      },
    ],
  });
}

function runFold(input: RunInput, rng: () => number): Omit<RunResult, "id" | "generatedAt"> {
  const N = 18;
  const kind = input.seed % 2 === 0 ? "fold" : "cusp";
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < N; i++) {
    xs.push(-1 + (2 * i) / (N - 1));
    ys.push(-1 + (2 * i) / (N - 1));
  }

  function apply(map: (x: number, y: number) => { u: number; v: number }) {
    const grid: { u: number; v: number; x: number; y: number }[] = [];
    const samples = new Float64Array(N * N * 2);
    let k = 0;
    for (const x of xs) {
      for (const y of ys) {
        const { u, v } = map(x, y);
        grid.push({ u, v, x, y });
        samples[k++] = u;
        samples[k++] = v;
      }
    }
    return { grid, samples };
  }

  const forms =
    kind === "fold"
      ? [
          {
            title: "Whitney fold",
            syntax: "(x, y) ↦ (x, y²)",
            latex: "(x,y)\\mapsto(x,y^2)",
            python: "lambda x,y: (x, y**2)",
            steps: ["standard fold germ"],
            ...apply((x, y) => ({ u: x, v: y * y })),
          },
          {
            title: "monomial",
            syntax: "(x, y·y)",
            latex: "(x,y\\cdot y)",
            python: "lambda x,y: (x, y*y)",
            steps: ["juxtaposition vs exponent — same polynomial"],
            ...apply((x, y) => ({ u: x, v: y * y })),
          },
          {
            title: "bilinear",
            syntax: "(x, yᵀ A y)  A = e₂⊗e₂",
            latex: "(x, y^{\\mathsf T} A y)",
            python: "lambda x,y: (x, y * 1 * y)",
            steps: ["quadratic form with A = diag(0,1)"],
            ...apply((x, y) => ({ u: x, v: y * y })),
          },
          {
            title: "even part",
            syntax: "(x, ½((y)² + (−y)²))",
            latex: "(x,\\tfrac12(y^2+(-y)^2))",
            python: "lambda x,y: (x, 0.5*(y**2 + (-y)**2))",
            steps: ["evenization of y ↦ y²"],
            ...apply((x, y) => ({ u: x, v: 0.5 * (y * y + y * y) })),
          },
        ]
      : [
          {
            title: "Whitney cusp",
            syntax: "(x, y) ↦ (x, y³ + x y)",
            latex: "(x,y)\\mapsto(x,y^3+xy)",
            python: "lambda x,y: (x, y**3 + x*y)",
            steps: ["standard cusp germ"],
            ...apply((x, y) => ({ u: x, v: y * y * y + x * y })),
          },
          {
            title: "factored",
            syntax: "(x, y (y² + x))",
            latex: "(x, y(y^2+x))",
            python: "lambda x,y: (x, y*(y**2 + x))",
            steps: ["factor y from the second component"],
            ...apply((x, y) => ({ u: x, v: y * (y * y + x) })),
          },
          {
            title: "Horner",
            syntax: "(x, (y² + x) y)",
            latex: "(x,(y^2+x)y)",
            python: "lambda x,y: (x, (y**2 + x)*y)",
            steps: ["Horner rearrangement"],
            ...apply((x, y) => ({ u: x, v: (y * y + x) * y })),
          },
        ];

  const selected = takeForms(forms, input.count + 1, rng).map((f, i) => ({
    id: `v${i}`,
    title: f.title,
    syntax: f.syntax,
    latex: f.latex,
    python: f.python,
    steps: f.steps,
    samples: f.samples,
    grid: f.grid,
  }));

  return packGenericRun({
    input,
    familyName: "Fold / cusp",
    identity: kind === "fold" ? "(x, y²) ≡ (x, y·y) ≡ yᵀ A y" : "y³ + x y ≡ y(y² + x)",
    identityLatex: kind === "fold" ? "(x,y^2)" : "(x,y^3+xy)",
    blurb: "Same-physics testing of Whitney germs: different syntax for the same polynomial map, sampled on a square grid.",
    variants: selected,
    notes: [
      "A fault replaces y² by y³ (fold) or drops the x y term (cusp) — a different jet, so the test must fail.",
      "Pullbacks of observables agree iff the maps agree pointwise on the grid.",
    ],
    viz: "fold",
  });
}

export function whitneyGerm(x: number, y: number, kind: "fold" | "cusp"): { u: number; v: number } {
  if (kind === "fold") return { u: x, v: y * y };
  return { u: x, v: y * y * y + x * y };
}

/** W ∘ π written in (z, w) without naming n. Uses the Pauli chart (n_x, n_y). */
export function spinorPullback(p: HopfPt, kind: "fold" | "cusp"): { u: number; v: number } {
  const a = p.zr * p.wr + p.zi * p.wi;
  const b = p.zr * p.wi - p.zi * p.wr;
  return whitneyGerm(2 * a, 2 * b, kind);
}

function flattenUV(pairs: { u: number; v: number }[]): Float64Array {
  const out = new Float64Array(pairs.length * 2);
  for (let i = 0; i < pairs.length; i++) {
    out[2 * i] = pairs[i]!.u;
    out[2 * i + 1] = pairs[i]!.v;
  }
  return out;
}

function runShell(input: RunInput, rng: () => number): Omit<RunResult, "id" | "generatedAt"> {
  const kind: "fold" | "cusp" = input.seed % 2 === 0 ? "fold" : "cusp";
  const n = Math.max(24, Math.min(128, input.probes * 8));
  const pts = sampleS3(rng, n);
  const fiberPts: HopfPt[] = pts.map((p) => {
    const a = rng() * 2 * Math.PI;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return {
      zr: c * p.zr - s * p.zi,
      zi: s * p.zr + c * p.zi,
      wr: c * p.wr - s * p.wi,
      wi: s * p.wr + c * p.wi,
    };
  });

  function pack(
    title: string,
    syntax: string,
    latex: string,
    python: string,
    steps: string[],
    uv: { u: number; v: number }[],
    ns: { x: number; y: number; z: number }[],
  ) {
    const grid = uv.map((q, i) => ({
      u: q.u,
      v: q.v,
      x: ns[i]!.x,
      y: ns[i]!.y,
    }));
    return {
      title,
      syntax,
      latex,
      python,
      steps,
      samples: flattenUV(uv),
      grid,
      cloud: ns,
    };
  }

  const nPauli = pts.map(hopfPauli);
  const nCx = pts.map(hopfComplex);
  const nQuat = pts.map(hopfQuaternion);
  const nFiber = fiberPts.map(hopfPauli);

  const uvPauli = nPauli.map((p) => whitneyGerm(p.x, p.y, kind));
  const uvCx = nCx.map((p) => whitneyGerm(p.x, p.y, kind));
  const uvQuat = nQuat.map((p) => whitneyGerm(p.x, p.y, kind));
  const uvSpinor = pts.map((p) => spinorPullback(p, kind));
  const uvFiber = nFiber.map((p) => whitneyGerm(p.x, p.y, kind));

  const forms =
    kind === "fold"
      ? [
          pack(
            "base then lift",
            "W₁(π_σ ψ) = (n_x, n_y²)",
            "W_1(\\pi_\\sigma\\psi)=(n_x,n_y^2)",
            "nx, ny**2",
            ["Hopf via Pauli", "Whitney fold in the (n_x, n_y) chart"],
            uvPauli,
            nPauli,
          ),
          pack(
            "complex then lift",
            "W₁(π_C ψ)",
            "W_1(\\pi_{\\mathbb C}\\psi)",
            "W(hopf_complex(psi))",
            ["Hopf via (2z w̄, |z|²−|w|²)", "same germ"],
            uvCx,
            nCx,
          ),
          pack(
            "quaternion then lift",
            "W₁(q i q̄)",
            "W_1(q\\, i\\, \\bar q)",
            "W(q * i * q.conjugate())",
            ["Hopf via Ad_q(i)", "same germ"],
            uvQuat,
            nQuat,
          ),
          pack(
            "spinor pullback",
            "(2a, 4b²)  a=Re(z w̄)_σ, b=…",
            "(2a, 4b^2)",
            "(2*a, 4*b**2)",
            ["expand W₁∘π in (z, w)", "no intermediate n"],
            uvSpinor,
            nPauli,
          ),
          pack(
            "evenized pullback",
            "(n_x, ½(n_y² + (−n_y)²))",
            "(n_x,\\tfrac12(n_y^2+(-n_y)^2))",
            "(nx, 0.5*(ny**2 + (-ny)**2))",
            ["fold is even in n_y", "same polynomial"],
            nPauli.map((p) => ({ u: p.x, v: 0.5 * (p.y * p.y + p.y * p.y) })),
            nPauli,
          ),
          pack(
            "U(1) fiber",
            "W₁(π(e^{iα}ψ)) = W₁(πψ)",
            "W_1(\\pi(e^{i\\alpha}\\psi))=W_1(\\pi\\psi)",
            "W(hopf(exp(1j*a)*psi))",
            ["phase along the Hopf fiber", "pulled-back germ is U(1)-invariant"],
            uvFiber,
            nFiber,
          ),
        ]
      : [
          pack(
            "base then lift",
            "W₂(π_σ ψ) = (n_x, n_y³ + n_x n_y)",
            "W_2(\\pi_\\sigma\\psi)=(n_x,n_y^3+n_x n_y)",
            "nx, ny**3 + nx*ny",
            ["Hopf via Pauli", "Whitney cusp in the (n_x, n_y) chart"],
            uvPauli,
            nPauli,
          ),
          pack(
            "complex then lift",
            "W₂(π_C ψ)",
            "W_2(\\pi_{\\mathbb C}\\psi)",
            "W(hopf_complex(psi))",
            ["Hopf via complex chart", "same germ"],
            uvCx,
            nCx,
          ),
          pack(
            "quaternion then lift",
            "W₂(q i q̄)",
            "W_2(q\\, i\\, \\bar q)",
            "W(q * i * q.conjugate())",
            ["Hopf via Ad_q(i)", "same germ"],
            uvQuat,
            nQuat,
          ),
          pack(
            "spinor pullback",
            "(2a, 8b³ + 4ab)",
            "(2a, 8b^3+4ab)",
            "(2*a, 8*b**3 + 4*a*b)",
            ["expand W₂∘π in (z, w)", "Horner in the chart coordinates is implicit"],
            uvSpinor,
            nPauli,
          ),
          pack(
            "factored pullback",
            "(n_x, n_y(n_y² + n_x))",
            "(n_x, n_y(n_y^2+n_x))",
            "(nx, ny*(ny**2 + nx))",
            ["factor n_y from the second component"],
            nPauli.map((p) => ({ u: p.x, v: p.y * (p.y * p.y + p.x) })),
            nPauli,
          ),
          pack(
            "U(1) fiber",
            "W₂(π(e^{iα}ψ)) = W₂(πψ)",
            "W_2(\\pi(e^{i\\alpha}\\psi))=W_2(\\pi\\psi)",
            "W(hopf(exp(1j*a)*psi))",
            ["phase along the Hopf fiber", "pulled-back germ is U(1)-invariant"],
            uvFiber,
            nFiber,
          ),
        ];

  const selected = takeForms(forms, input.count + 1, rng).map((f, i) => ({
    id: `v${i}`,
    title: f.title,
    syntax: f.syntax,
    latex: f.latex,
    python: f.python,
    steps: f.steps,
    samples: f.samples,
    grid: f.grid,
    cloud: f.cloud,
  }));

  const fiberRes = relRms(flattenUV(uvPauli), flattenUV(uvFiber));
  const meanRad =
    nPauli.reduce((s, p) => s + Math.abs(Math.hypot(p.x, p.y, p.z) - 1), 0) / nPauli.length;

  return packGenericRun({
    input,
    familyName: "Lifted shells",
    identity:
      kind === "fold"
        ? "W₁∘π_σ = W₁∘π_C = W₁∘π_H = W₁∘π∘e^{iα}"
        : "W₂∘π_σ = W₂∘π_C = W₂∘π_H = W₂∘π∘e^{iα}",
    identityLatex:
      kind === "fold"
        ? "W_1\\circ\\pi_{\\sigma}=W_1\\circ\\pi_{\\mathbb C}=W_1\\circ\\pi_{\\mathbb H}"
        : "W_2\\circ\\pi_{\\sigma}=W_2\\circ\\pi_{\\mathbb C}=W_2\\circ\\pi_{\\mathbb H}",
    blurb:
      kind === "fold"
        ? "Hopf-lifted Whitney fold: the germ (n_x, n_y²) pulled back along three syntaxes for π: S³ → S², plus the spinor polynomial and fiber invariance."
        : "Hopf-lifted Whitney cusp: the germ (n_x, n_y³ + n_x n_y) pulled back along three syntaxes for π, plus the spinor polynomial and fiber invariance.",
    variants: selected,
    notes: [
      "The chart is (n_x, n_y) on S². A stereographic fold is a different map — that is not this identity.",
      "Fault swaps the jet: fold becomes cubic, cusp drops the n_x n_y term. Orientation flip on n_y is a no-op for the fold (even), so it is not the control.",
    ],
    viz: "lift",
    extraMetrics: [
      {
        key: "fiber",
        label: "fiber residual",
        value: fiberRes,
        pass: fiberRes < 1e-10,
        detail: "W(π(e^{iα}ψ)) vs W(πψ)",
      },
      {
        key: "on-sphere",
        label: "mean |n| − 1",
        value: meanRad,
        pass: meanRad < 1e-10,
      },
    ],
  });
}

/** Compactification of the log-Planck line: 0 ↦ −1, ℓ_P ↦ 0, ∞ ↦ +1. */
export function planckCompact(u: number): number {
  return Math.tanh(u / 2);
}

export function planckRational(z: number): number {
  if (z <= 0 || !Number.isFinite(z)) return z > 0 ? 1 : -1;
  return (z - 1) / (z + 1);
}

function runScale(input: RunInput, rng: () => number): Omit<RunResult, "id" | "generatedAt"> {
  const L = 6 + 2 * input.depth;
  const n = Math.max(48, Math.min(160, input.probes * 10));
  const us: number[] = [];
  for (let i = 0; i < n; i++) us.push(-L + (2 * L * i) / (n - 1));

  function pack(title: string, syntax: string, latex: string, python: string, steps: string[], ts: number[]) {
    const grid = us.map((u, i) => ({
      x: u,
      y: ts[i]!,
      u: ts[i]!,
      v: ts[n - 1 - i]!,
    }));
    return {
      title,
      syntax,
      latex,
      python,
      steps,
      samples: Float64Array.from(ts),
      grid,
    };
  }

  const z = us.map((u) => Math.exp(u));
  const tCayley = us.map(planckCompact);
  const tMobius = z.map(planckRational);
  const tTanhLog = z.map((zi) => Math.tanh(Math.log(zi) / 2));
  const tInvRational = z.map((zi) => {
    const w = 1 / zi;
    return (1 - w) / (1 + w);
  });
  const tExp = us.map((u) => {
    const e = Math.exp(u);
    return (e - 1) / (e + 1);
  });

  const forms = [
    pack(
      "Möbius / Planck unit",
      "(ℓ − ℓ_P)/(ℓ + ℓ_P)",
      "\\dfrac{\\ell-\\ell_P}{\\ell+\\ell_P}",
      "(ell - ell_p) / (ell + ell_p)",
      ["z = ℓ/ℓ_P, z ≠ 1", "Cayley map of rapidity η = ½ log z"],
      tMobius,
    ),
    pack(
      "hyperbolic",
      "tanh(½ log(ℓ/ℓ_P))",
      "\\tanh\\tfrac12\\log(\\ell/\\ell_P)",
      "np.tanh(0.5 * np.log(ell / ell_p))",
      ["Identity 1: the two writings are the same function", "checked as a residual, not assumed"],
      tTanhLog,
    ),
    pack(
      "Cayley of the log line",
      "tanh(u/2)  u = log(ℓ/ℓ_P)",
      "\\tanh(u/2)",
      "np.tanh(u/2)",
      ["work entirely in the log chart", "same map, no intermediate z"],
      tCayley,
    ),
    pack(
      "reciprocal form",
      "(1 − ℓ_P/ℓ)/(1 + ℓ_P/ℓ)",
      "\\dfrac{1-\\ell_P/\\ell}{1+\\ell_P/\\ell}",
      "(1 - ell_p/ell) / (1 + ell_p/ell)",
      ["algebraic rewrite of (z−1)/(z+1)", "not the inversion law T(1/z) = −T(z)"],
      tInvRational,
    ),
    pack(
      "exponential",
      "(e^u − 1)/(e^u + 1)",
      "\\dfrac{e^u-1}{e^u+1}",
      "(np.exp(u) - 1) / (np.exp(u) + 1)",
      ["expand tanh in exponentials", "same rational function of e^u"],
      tExp,
    ),
  ];

  const selected = takeForms(forms, input.count + 1, rng).map((f, i) => ({
    id: `v${i}`,
    title: f.title,
    syntax: f.syntax,
    latex: f.latex,
    python: f.python,
    steps: f.steps,
    samples: f.samples,
    grid: f.grid,
  }));

  let invMax = 0;
  for (const u of us) invMax = Math.max(invMax, Math.abs(planckCompact(u) + planckCompact(-u)));
  const left = tCayley[0]!;
  const right = tCayley[tCayley.length - 1]!;

  return packGenericRun({
    input,
    familyName: "Planck chart",
    identity: "(ℓ − ℓ_P)/(ℓ + ℓ_P) = tanh(½ log(ℓ/ℓ_P))",
    identityLatex: "\\dfrac{\\ell-\\ell_P}{\\ell+\\ell_P}=\\tanh\\tfrac12\\log(\\ell/\\ell_P)",
    blurb: "Identity 1 only: the Cayley map of rapidity η = ½ log(ℓ/ℓ_P). Same physics means the rational and hyperbolic writings agree as functions of x = ℓ/ℓ_P > 0.",
    variants: selected,
    notes: [
      "Identity 1 is the suite. Reciprocal and exponential forms are algebraic rewrites of the same function.",
      "T(ℓ_P²/ℓ) = −T(ℓ) is an extra law: it holds iff T is odd in u = log(ℓ/ℓ_P). tanh(u) without the ½ is also odd, so that law does not certify Identity 1. It is not a fold certificate.",
      `Samples are log-spaced in ℓ/ℓ_P from e^{−${L}} to e^{${L}}. Fault drops the ½ — a different compactification.`,
    ],
    viz: "scale",
    extraMetrics: [
      {
        key: "involution",
        label: "extra law |T(ℓ)+T(ℓ_P²/ℓ)|",
        value: invMax,
        pass: invMax < 1e-12,
        detail: "oddness of this T — not implied by Identity 1",
      },
      {
        key: "poles",
        label: "approach to ±1",
        value: Math.max(Math.abs(left + 1), Math.abs(right - 1)),
        pass: true,
        detail: "ends of the window vs the infinities",
      },
    ],
  });
}

function dft(x: Float64Array): { re: Float64Array; im: Float64Array } {
  const n = x.length;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    let sr = 0;
    let si = 0;
    for (let t = 0; t < n; t++) {
      const ang = (-2 * Math.PI * k * t) / n;
      sr += x[t]! * Math.cos(ang);
      si += x[t]! * Math.sin(ang);
    }
    re[k] = sr;
    im[k] = si;
  }
  return { re, im };
}

function idft(re: Float64Array, im: Float64Array): Float64Array {
  const n = re.length;
  const x = new Float64Array(n);
  for (let t = 0; t < n; t++) {
    let s = 0;
    for (let k = 0; k < n; k++) {
      const ang = (2 * Math.PI * k * t) / n;
      s += re[k]! * Math.cos(ang) - im[k]! * Math.sin(ang);
    }
    x[t] = s / n;
  }
  return x;
}

function runLaplacian(input: RunInput, _rng: () => number): Omit<RunResult, "id" | "generatedAt"> {
  const N = 16;
  const stencil3 = Mat.zeros(N);
  const graph = Mat.zeros(N);
  const fourier = Mat.zeros(N);
  for (let i = 0; i < N; i++) {
    stencil3.set(i, i, C(-2, 0));
    stencil3.set(i, (i + 1) % N, C1);
    stencil3.set(i, (i - 1 + N) % N, C1);
    graph.set(i, i, C(2, 0));
    graph.set(i, (i + 1) % N, C(-1, 0));
    graph.set(i, (i - 1 + N) % N, C(-1, 0));
  }
  for (let j = 0; j < N; j++) {
    const e = new Float64Array(N);
    e[j] = 1;
    const { re, im } = dft(e);
    for (let k = 0; k < N; k++) {
      const lam = 2 * Math.cos((2 * Math.PI * k) / N) - 2;
      re[k] *= lam;
      im[k] *= lam;
    }
    const col = idft(re, im);
    for (let i = 0; i < N; i++) fourier.set(i, j, C(col[i]!, 0));
  }
  const negGraph = graph.scale(C(-1, 0));

  const forms: MatrixForm[] = [
    {
      title: "3-point stencil",
      syntax: "(Δu)ᵢ = uᵢ₋₁ − 2uᵢ + uᵢ₊₁",
      latex: "(\\Delta u)_i=u_{i-1}-2u_i+u_{i+1}",
      python: "u[i-1] - 2*u[i] + u[i+1]",
      steps: ["periodic second difference"],
      mat: stencil3,
    },
    {
      title: "Fourier multiplier",
      syntax: "F⁻¹ diag(2 cos(2πk/N) − 2) F",
      latex: "\\mathcal F^{-1}\\mathrm{diag}(2\\cos\\theta_k-2)\\mathcal F",
      python: "ifft(lam * fft(u))",
      steps: ["symbol of the 3-point stencil on Z_N"],
      mat: fourier,
    },
    {
      title: "cycle graph",
      syntax: "−(D − A)  on C_N",
      latex: "-(D-A)_{C_N}",
      python: "-(deg * I - A)",
      steps: ["graph Laplacian of the cycle, sign-matched to analysis"],
      mat: negGraph,
    },
  ];

  const selected = takeForms(forms, input.count + 1, _rng);
  return packGenericRun({
    input,
    familyName: "Discrete Laplacian",
    identity: "Δ_stencil = Δ_Fourier = −L_cycle   on Z₁₆",
    identityLatex: "\\Delta_{3}=\\Delta_{\\mathcal F}=-L_{C_N}",
    blurb: "Three syntactic operators for the same periodic second difference. Strict same-physics: the matrices are identical.",
    variants: selected.map(formToVariant),
    notes: [
      "The 5-point stencil is a different operator (higher-order consistent, not equal). Fault mode swaps it in.",
      "Spectrum is 2 cos(2πk/N) − 2, k = 0…N−1.",
    ],
    viz: "spectrum",
  });
}

export function truncatedSHO(dim: number) {
  const a = Mat.zeros(dim);
  const ad = Mat.zeros(dim);
  for (let n = 0; n < dim - 1; n++) {
    ad.set(n + 1, n, C(Math.sqrt(n + 1), 0));
    a.set(n, n + 1, C(Math.sqrt(n + 1), 0));
  }
  const q = a.add(ad).scale(C(1 / Math.sqrt(2), 0));
  const p = a.sub(ad).scale(C(0, -1 / Math.sqrt(2)));
  return { a, ad, q, p };
}

function runOrdering(input: RunInput, rng: () => number): Omit<RunResult, "id" | "generatedAt"> {
  const dim = 8;
  const { q, p } = truncatedSHO(dim);
  const half = C(0.5, 0);
  const comm = q.comm(p);
  const weyl = q.mul(p).add(p.mul(q)).scale(half);
  const qpShift = q.mul(p).sub(comm.scale(half));
  const pqShift = p.mul(q).add(comm.scale(half));

  const forms: MatrixForm[] = [
    {
      title: "Weyl",
      syntax: "(qp + pq) / 2",
      latex: "\\tfrac12(qp+pq)",
      python: "0.5 * (q @ p + p @ q)",
      steps: ["Weyl (symmetric) ordering of xp"],
      mat: weyl,
    },
    {
      title: "qp corrected",
      syntax: "qp − [q,p]/2",
      latex: "qp - [q,p]/2",
      python: "q @ p - 0.5 * (q @ p - p @ q)",
      steps: ["[q,p] ≈ i I in infinite dimension; exact identity uses the truncated commutator"],
      mat: qpShift,
    },
    {
      title: "pq corrected",
      syntax: "pq + [q,p]/2",
      latex: "pq + [q,p]/2",
      python: "p @ q + 0.5 * (q @ p - p @ q)",
      steps: ["pq = Weyl − [q,p]/2"],
      mat: pqShift,
    },
  ];

  const selected = takeForms(forms, input.count + 1, rng);
  return packGenericRun({
    input,
    familyName: "Operator ordering",
    identity: "Weyl(xp) = qp − [q,p]/2 = pq + [q,p]/2",
    identityLatex: "\\mathrm{Weyl}(xp)=qp-[q,p]/2=pq+[q,p]/2",
    blurb: "On the truncated oscillator, three syntaxes for the same classical symbol xp. Dropping the i/2 correction is a physics bug — that is the fault mode.",
    variants: selected.map(formToVariant),
    notes: [
      "Truncation to dim = 8 means [q, p] ≈ i I only on the interior of the Fock space. Residuals include that edge.",
      "Same-physics testing is how ordering bugs show up: the matrices stop agreeing.",
    ],
    viz: "matrix",
  });
}

function injectFault(input: RunInput, variants: Variant[], rng: () => number): Variant[] {
  if (!input.injectFault || variants.length < 2) return variants;
  const out: Variant[] = variants.map((v) => ({
    ...v,
    samples: Float64Array.from(v.samples),
    matrix: v.matrix?.clone(),
    cloud: v.cloud?.map((p) => ({ ...p })),
    grid: v.grid?.map((p) => ({ ...p })),
  }));
  const last = out[out.length - 1]!;
  last.steps = [...last.steps, "FAULT injected — this syntax is no longer equivalent"];
  last.title = `${last.title} · fault`;

  switch (input.family) {
    case "pauli": {
      if (last.matrix) {
        if (last.matrix.frobenius() < 1e-12) {
          last.matrix = PI;
          last.syntax = "I";
          last.steps.push("replace the zero operator by I (illegal on this identity)");
        } else {
          last.matrix = last.matrix.scale(C(0, -1));
          last.syntax = `i · (${last.syntax})`;
          last.steps.push("multiply by i (illegal on this identity)");
        }
        last.samples = last.matrix.flatten();
      }
      break;
    }
    case "su2": {
      if (last.matrix) {
        last.matrix = last.matrix.scale(C(-1, 0));
        last.samples = last.matrix.flatten();
      }
      last.syntax = `−(${last.syntax})`;
      last.steps.push("global sign flip");
      break;
    }
    case "hopf": {
      if (last.cloud) {
        last.cloud = last.cloud.map((p) => ({ ...p, y: -p.y }));
        last.samples = flattenCloud(last.cloud);
      }
      last.steps.push("flip n_y — orientation mismatch");
      break;
    }
    case "fold": {
      if (last.grid) {
        last.grid = last.grid.map((p) => ({ ...p, v: p.y * p.y * p.y }));
        const s = new Float64Array(last.grid.length * 2);
        last.grid.forEach((p, i) => {
          s[2 * i] = p.u;
          s[2 * i + 1] = p.v;
        });
        last.samples = s;
      }
      last.syntax = last.syntax.replace("y²", "y³").replace("y^2", "y^3");
      last.steps.push("replace fold by a cubic (wrong germ)");
      break;
    }
    case "laplacian": {
      const N = last.matrix?.n ?? 16;
      const s5 = Mat.zeros(N);
      for (let i = 0; i < N; i++) {
        s5.set(i, i, C(-5 / 2, 0));
        s5.set(i, (i + 1) % N, C(4 / 3, 0));
        s5.set(i, (i - 1 + N) % N, C(4 / 3, 0));
        s5.set(i, (i + 2) % N, C(-1 / 12, 0));
        s5.set(i, (i - 2 + N) % N, C(-1 / 12, 0));
      }
      last.matrix = s5;
      last.samples = s5.flatten();
      last.syntax = "5-point stencil (−1/12, 4/3, −5/2, …)";
      last.steps.push("swap in a consistent-but-different stencil");
      break;
    }
    case "ordering": {
      const dim = last.matrix?.n ?? 8;
      const { q, p } = truncatedSHO(dim);
      last.matrix = q.mul(p);
      last.samples = last.matrix.flatten();
      last.syntax = "qp   (no i/2)";
      last.steps.push("drop the commutator correction");
      break;
    }
    case "shell": {
      const kind = input.seed % 2 === 0 ? "fold" : "cusp";
      if (last.grid) {
        last.grid = last.grid.map((p) => ({
          ...p,
          v: kind === "fold" ? p.y * p.y * p.y : p.y * p.y * p.y,
        }));
        const s = new Float64Array(last.grid.length * 2);
        last.grid.forEach((p, i) => {
          s[2 * i] = p.u;
          s[2 * i + 1] = p.v;
        });
        last.samples = s;
      }
      if (kind === "fold") {
        last.syntax = last.syntax.replace("n_y²", "n_y³").replace("n_y^2", "n_y^3").replace("4b²", "8b³");
        last.steps.push("replace the lifted fold by a cubic (wrong jet)");
      } else {
        last.syntax = last.syntax.replace("n_x n_y", "0").replace("+ 4ab", "");
        last.steps.push("drop the n_x n_y term (wrong jet)");
      }
      break;
    }
    case "scale": {
      if (last.grid) {
        last.grid = last.grid.map((p) => {
          const t = Math.tanh(p.x);
          return { ...p, y: t, u: t, v: -t };
        });
        last.samples = Float64Array.from(last.grid.map((p) => p.y));
      }
      last.syntax = "tanh(log(ℓ/ℓ_P))   (no ½)";
      last.steps.push("drop the ½ — a different compactification; ∞ is approached twice as fast");
      break;
    }
    default:
      for (let i = 0; i < last.samples.length; i++) last.samples[i]! *= 1 + 0.25 * rng();
  }
  out[out.length - 1] = last;
  return out;
}

function pairwiseResidual(variants: Variant[]): number[][] {
  const n = variants.length;
  const r: number[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const d =
        variants[i]!.matrix && variants[j]!.matrix
          ? variants[i]!.matrix!.relDiff(variants[j]!.matrix!)
          : relRms(variants[i]!.samples, variants[j]!.samples);
      r[i]![j] = d;
      r[j]![i] = d;
    }
  }
  return r;
}

function packGenericRun(args: {
  input: RunInput;
  familyName: string;
  identity: string;
  identityLatex: string;
  blurb: string;
  variants: Variant[];
  notes: string[];
  viz: VizKind;
  extraMetrics?: Metric[];
}): Omit<RunResult, "id" | "generatedAt"> {
  const rng = mulberry32(args.input.seed ^ 0x51ed);
  const variants = injectFault(args.input, args.variants, rng);
  const canonical = variants[0]!;
  const residual = pairwiseResidual(variants);
  let maxResidual = 0;
  for (let i = 0; i < residual.length; i++) {
    for (let j = i + 1; j < residual.length; j++) {
      maxResidual = Math.max(maxResidual, residual[i]![j]!);
    }
  }
  const pass = maxResidual <= args.input.tolerance;

  const metrics: Metric[] = [
    {
      key: "max-res",
      label: "max relative residual",
      value: maxResidual,
      pass,
      detail: `threshold ${formatSci(args.input.tolerance)}`,
    },
    {
      key: "variants",
      label: "syntax variants",
      value: variants.length,
      pass: true,
    },
  ];

  const withMat = variants.filter((v) => v.matrix);
  if (withMat.length >= 2 && withMat[0]!.matrix && withMat[1]!.matrix) {
    const specA = hermitianEigs(withMat[0]!.matrix);
    const specB = hermitianEigs(withMat[1]!.matrix);
    const hd = hausdorff(specA, specB);
    metrics.push({
      key: "spec",
      label: "spectrum Hausdorff",
      value: hd,
      pass: hd <= Math.max(args.input.tolerance * 10, 1e-6),
      detail: "eigenvalue clouds of the first two forms",
    });
  }
  if (args.extraMetrics) metrics.push(...args.extraMetrics);

  let spectrum: RunResult["spectrum"];
  if (withMat.length > 0) {
    const series = withMat.slice(0, 4).map((v) => ({
      name: v.title,
      values: hermitianEigs(v.matrix!),
    }));
    const mlen = Math.max(...series.map((s) => s.values.length), 0);
    spectrum = {
      labels: Array.from({ length: mlen }, (_, i) => String(i)),
      series,
    };
  }

  return {
    input: args.input,
    familyName: args.familyName,
    identity: args.identity,
    identityLatex: args.identityLatex,
    blurb: args.blurb,
    canonical,
    variants,
    residual,
    maxResidual,
    pass,
    metrics,
    spectrum,
    notes: args.notes,
    viz: args.viz,
  };
}

export function generateRun(input: RunInput): RunResult {
  const rng = mulberry32(input.seed * 2654435761);
  let body: Omit<RunResult, "id" | "generatedAt">;
  switch (input.family) {
    case "pauli":
      body = runPauli(input, rng);
      break;
    case "su2":
      body = runSu2(input, rng);
      break;
    case "hopf":
      body = runHopf(input, rng);
      break;
    case "fold":
      body = runFold(input, rng);
      break;
    case "laplacian":
      body = runLaplacian(input, rng);
      break;
    case "ordering":
      body = runOrdering(input, rng);
      break;
    case "shell":
      body = runShell(input, rng);
      break;
    case "scale":
      body = runScale(input, rng);
      break;
    default:
      body = runPauli(input, rng);
  }
  return {
    ...body,
    id: `${input.family}-${input.seed}-${input.count}-${input.depth}-${input.injectFault ? "F" : "C"}`,
    generatedAt: Date.now(),
  };
}

export function defaultInput(family: FamilyId = "scale"): RunInput {
  return {
    family,
    seed: 7,
    count: 4,
    depth: 4,
    probes: 8,
    tolerance: 1e-8,
    injectFault: false,
  };
}
