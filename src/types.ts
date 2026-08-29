import type { Mat } from "./math.ts";

export type FamilyId =
  | "pauli"
  | "su2"
  | "hopf"
  | "fold"
  | "laplacian"
  | "ordering";

export type VizKind = "matrix" | "cloud" | "fold" | "spectrum";

export type Variant = {
  id: string;
  title: string;
  syntax: string;
  latex: string;
  python: string;
  steps: string[];
  samples: Float64Array<ArrayBufferLike>;
  matrix?: Mat;
  cloud?: { x: number; y: number; z: number }[];
  grid?: { u: number; v: number; x: number; y: number }[];
};

export type Metric = {
  key: string;
  label: string;
  value: number;
  pass: boolean;
  detail?: string;
};

export type RunInput = {
  family: FamilyId;
  seed: number;
  count: number;
  depth: number;
  probes: number;
  tolerance: number;
  injectFault: boolean;
};

export type RunResult = {
  id: string;
  input: RunInput;
  familyName: string;
  identity: string;
  identityLatex: string;
  blurb: string;
  canonical: Variant;
  variants: Variant[];
  residual: number[][];
  maxResidual: number;
  pass: boolean;
  metrics: Metric[];
  spectrum?: { labels: string[]; series: { name: string; values: number[] }[] };
  notes: string[];
  generatedAt: number;
  viz: VizKind;
};

export type HistoryEntry = {
  id: string;
  familyName: string;
  identity: string;
  pass: boolean;
  input: RunInput;
  generatedAt: number;
};

export type FamilyMeta = {
  id: FamilyId;
  index: string;
  name: string;
  symbol: string;
  blurb: string;
};
