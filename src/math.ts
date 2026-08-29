export type C = { re: number; im: number };

export function C(re = 0, im = 0): C {
  return { re, im };
}

export const C0: C = { re: 0, im: 0 };
export const C1: C = { re: 1, im: 0 };
export const Ci: C = { re: 0, im: 1 };

export function cadd(a: C, b: C): C {
  return { re: a.re + b.re, im: a.im + b.im };
}
export function csub(a: C, b: C): C {
  return { re: a.re - b.re, im: a.im - b.im };
}
export function cmul(a: C, b: C): C {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  };
}
export function cconj(a: C): C {
  return { re: a.re, im: -a.im };
}
export function cabs2(a: C): number {
  return a.re * a.re + a.im * a.im;
}
export function cabs(a: C): number {
  return Math.hypot(a.re, a.im);
}
export function cscale(a: C, s: number): C {
  return { re: a.re * s, im: a.im * s };
}
export function cneg(a: C): C {
  return { re: -a.re, im: -a.im };
}
export function ceq(a: C, b: C, eps = 1e-10): boolean {
  return Math.abs(a.re - b.re) < eps && Math.abs(a.im - b.im) < eps;
}

function trimNum(x: number, digits = 4): string {
  if (Math.abs(x) < 1e-10) return "0";
  const s = x.toFixed(digits).replace(/\.?0+$/, "");
  return s;
}

export function cfmt(a: C, digits = 3): string {
  const re0 = Math.abs(a.re) < 1e-10;
  const im0 = Math.abs(a.im) < 1e-10;
  if (re0 && im0) return "0";
  if (im0) return trimNum(a.re, digits);
  if (re0) {
    if (Math.abs(a.im - 1) < 1e-10) return "i";
    if (Math.abs(a.im + 1) < 1e-10) return "−i";
    return `${trimNum(a.im, digits)}i`;
  }
  const sign = a.im < 0 ? "−" : "+";
  const imag =
    Math.abs(Math.abs(a.im) - 1) < 1e-10 ? "i" : `${trimNum(Math.abs(a.im), digits)}i`;
  return `${trimNum(a.re, digits)} ${sign} ${imag}`;
}

export class Mat {
  n: number;
  re: Float64Array<ArrayBufferLike>;
  im: Float64Array<ArrayBufferLike>;

  constructor(n: number, re?: Float64Array<ArrayBufferLike>, im?: Float64Array<ArrayBufferLike>) {
    this.n = n;
    this.re = re ?? new Float64Array(n * n);
    this.im = im ?? new Float64Array(n * n);
  }

  static zeros(n: number): Mat {
    return new Mat(n);
  }

  static identity(n: number): Mat {
    const m = new Mat(n);
    for (let i = 0; i < n; i++) m.re[i * n + i] = 1;
    return m;
  }

  static from(rows: C[][]): Mat {
    const n = rows.length;
    const m = new Mat(n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const z = rows[i]![j] ?? C0;
        m.re[i * n + j] = z.re;
        m.im[i * n + j] = z.im;
      }
    }
    return m;
  }

  clone(): Mat {
    return new Mat(this.n, Float64Array.from(this.re), Float64Array.from(this.im));
  }

  at(i: number, j: number): C {
    const k = i * this.n + j;
    return { re: this.re[k]!, im: this.im[k]! };
  }

  set(i: number, j: number, z: C): void {
    const k = i * this.n + j;
    this.re[k] = z.re;
    this.im[k] = z.im;
  }

  mul(b: Mat): Mat {
    const n = this.n;
    const out = new Mat(n);
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < n; k++) {
        const ar = this.re[i * n + k]!;
        const ai = this.im[i * n + k]!;
        if (ar === 0 && ai === 0) continue;
        for (let j = 0; j < n; j++) {
          const br = b.re[k * n + j]!;
          const bi = b.im[k * n + j]!;
          const idx = i * n + j;
          out.re[idx]! += ar * br - ai * bi;
          out.im[idx]! += ar * bi + ai * br;
        }
      }
    }
    return out;
  }

  add(b: Mat): Mat {
    const n = this.n;
    const out = new Mat(n);
    for (let i = 0; i < n * n; i++) {
      out.re[i] = this.re[i]! + b.re[i]!;
      out.im[i] = this.im[i]! + b.im[i]!;
    }
    return out;
  }

  sub(b: Mat): Mat {
    const n = this.n;
    const out = new Mat(n);
    for (let i = 0; i < n * n; i++) {
      out.re[i] = this.re[i]! - b.re[i]!;
      out.im[i] = this.im[i]! - b.im[i]!;
    }
    return out;
  }

  scale(z: C): Mat {
    const n = this.n;
    const out = new Mat(n);
    for (let i = 0; i < n * n; i++) {
      const ar = this.re[i]!;
      const ai = this.im[i]!;
      out.re[i] = z.re * ar - z.im * ai;
      out.im[i] = z.re * ai + z.im * ar;
    }
    return out;
  }

  adj(): Mat {
    const n = this.n;
    const out = new Mat(n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        out.re[i * n + j] = this.re[j * n + i]!;
        out.im[i * n + j] = -this.im[j * n + i]!;
      }
    }
    return out;
  }

  comm(b: Mat): Mat {
    return this.mul(b).sub(b.mul(this));
  }

  acomm(b: Mat): Mat {
    return this.mul(b).add(b.mul(this));
  }

  frobenius2(): number {
    let s = 0;
    for (let i = 0; i < this.n * this.n; i++) {
      s += this.re[i]! * this.re[i]! + this.im[i]! * this.im[i]!;
    }
    return s;
  }

  frobenius(): number {
    return Math.sqrt(this.frobenius2());
  }

  relDiff(b: Mat): number {
    const d = this.sub(b).frobenius();
    const n = Math.max(this.frobenius(), b.frobenius(), 1e-15);
    return d / n;
  }

  flatten(): Float64Array<ArrayBufferLike> {
    const out = new Float64Array(this.n * this.n * 2);
    for (let i = 0; i < this.n * this.n; i++) {
      out[2 * i] = this.re[i]!;
      out[2 * i + 1] = this.im[i]!;
    }
    return out;
  }

  maxAbsImag(): number {
    let m = 0;
    for (let i = 0; i < this.im.length; i++) m = Math.max(m, Math.abs(this.im[i]!));
    return m;
  }
}

export function rmsDiff(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    s += d * d;
  }
  return Math.sqrt(s / n);
}

export function relRms(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const d = rmsDiff(a, b);
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    na += (a[i] ?? 0) ** 2;
    nb += (b[i] ?? 0) ** 2;
  }
  const denom = Math.max(Math.sqrt((na + nb) / (2 * Math.max(n, 1))), 1e-15);
  return d / denom;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  if (a === 0) a = 0x9e3779b9;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randn(rng: () => number): number {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function pick<T>(rng: () => number, xs: readonly T[]): T {
  return xs[Math.floor(rng() * xs.length) % xs.length]!;
}

export function shuffle<T>(rng: () => number, xs: T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

/** Jacobi eigenvalues of a real symmetric matrix. */
export function realSymmetricEigs(aIn: Float64Array, n: number, sweeps = 40): number[] {
  const a = Float64Array.from(aIn);
  for (let sweep = 0; sweep < sweeps; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) off += a[i * n + j]! * a[i * n + j]!;
    }
    if (off < 1e-24) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = a[p * n + q]!;
        if (Math.abs(apq) < 1e-14) continue;
        const app = a[p * n + p]!;
        const aqq = a[q * n + q]!;
        const tau = (aqq - app) / (2 * apq);
        const t = Math.sign(tau) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
        const c = 1 / Math.sqrt(1 + t * t);
        const s = t * c;
        a[p * n + p] = app - t * apq;
        a[q * n + q] = aqq + t * apq;
        a[p * n + q] = 0;
        a[q * n + p] = 0;
        for (let k = 0; k < n; k++) {
          if (k === p || k === q) continue;
          const akp = a[k * n + p]!;
          const akq = a[k * n + q]!;
          const r1 = c * akp - s * akq;
          const r2 = s * akp + c * akq;
          a[k * n + p] = r1;
          a[p * n + k] = r1;
          a[k * n + q] = r2;
          a[q * n + k] = r2;
        }
      }
    }
  }
  const eigs: number[] = [];
  for (let i = 0; i < n; i++) eigs.push(a[i * n + i]!);
  eigs.sort((x, y) => x - y);
  return eigs;
}

/** Eigenvalues of a Hermitian matrix (duplicates from 2n embedding collapsed). */
export function hermitianEigs(m: Mat): number[] {
  const n = m.n;
  if (m.maxAbsImag() < 1e-12) {
    return realSymmetricEigs(m.re, n);
  }
  const N = 2 * n;
  const a = new Float64Array(N * N);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const re = m.re[i * n + j]!;
      const im = m.im[i * n + j]!;
      a[i * N + j] = re;
      a[(i + n) * N + (j + n)] = re;
      a[i * N + (j + n)] = -im;
      a[(i + n) * N + j] = im;
    }
  }
  const raw = realSymmetricEigs(a, N, 48);
  const out: number[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    const x = raw[i]!;
    const y = raw[i + 1] ?? x;
    out.push(0.5 * (x + y));
  }
  return out;
}

export function hausdorff(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const d = (xs: number[], ys: number[]) =>
    Math.max(...xs.map((x) => Math.min(...ys.map((y) => Math.abs(x - y)))));
  return Math.max(d(a, b), d(b, a));
}

export function formatSci(x: number, digits = 2): string {
  if (!Number.isFinite(x)) return "∞";
  if (x === 0) return "0";
  const ax = Math.abs(x);
  if (ax >= 1e-3 && ax < 1e3) return trimNum(x, digits + 1);
  const exp = Math.floor(Math.log10(ax));
  const mant = x / 10 ** exp;
  return `${mant.toFixed(digits)}×10${sup(exp)}`;
}

function sup(n: number): string {
  const map: Record<string, string> = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    "-": "⁻",
  };
  return String(n)
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("");
}
