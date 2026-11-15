// Handwriting recognition: compares drawn strokes (start, middle, end points)
// with the stroke medians of each character (data from Make Me a Hanzi).
// Assumes roughly correct stroke order; tolerates one stroke more or fewer.
import { BASE } from "./dict";

export type Pt = [number, number];
type Feat = number[]; // 6 numbers per stroke, each 0..15

let index: Promise<[string, Feat][]> | null = null;

export function loadHw() {
  if (!index) {
    index = fetch(`${BASE}/data/hw.json`)
      .then((r) => r.json())
      .then((o: Record<string, string>) =>
        Object.entries(o).map(([ch, hex]) => [ch, [...hex].map((c) => parseInt(c, 16))] as [string, Feat]),
      );
  }
  return index;
}

function halfPoint(s: Pt[]): Pt {
  let total = 0;
  for (let i = 1; i < s.length; i++) total += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
  let acc = 0;
  for (let i = 1; i < s.length; i++) {
    const d = Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
    if (acc + d >= total / 2 && d > 0) {
      const t = (total / 2 - acc) / d;
      return [s[i - 1][0] + t * (s[i][0] - s[i - 1][0]), s[i - 1][1] + t * (s[i][1] - s[i - 1][1])];
    }
    acc += d;
  }
  return s[0];
}

export function features(strokes: Pt[][]): Feat {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of strokes) for (const [x, y] of s) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const size = Math.max(maxX - minX, maxY - minY, 1);
  const ox = (minX + maxX) / 2 - size / 2, oy = (minY + maxY) / 2 - size / 2;
  const out: Feat = [];
  for (const s of strokes)
    for (const [x, y] of [s[0], halfPoint(s), s[s.length - 1]])
      out.push(((x - ox) / size) * 15, ((y - oy) / size) * 15);
  return out;
}

function strokeCost(a: Feat, i: number, b: Feat, j: number) {
  let c = 0;
  for (let k = 0; k < 6; k += 2) c += Math.hypot(a[i * 6 + k] - b[j * 6 + k], a[i * 6 + k + 1] - b[j * 6 + k + 1]);
  // direction matters more than position
  const dax = a[i * 6 + 4] - a[i * 6], day = a[i * 6 + 5] - a[i * 6 + 1];
  const dbx = b[j * 6 + 4] - b[j * 6], dby = b[j * 6 + 5] - b[j * 6 + 1];
  return c + 1.5 * Math.hypot(dax - dbx, day - dby);
}

const SKIP = 22; // cost of an extra or missing stroke

export function distance(a: Feat, b: Feat): number {
  const n = a.length / 6, m = b.length / 6;
  if (Math.abs(n - m) > 1) return Infinity;
  if (n === m) {
    let c = 0;
    for (let i = 0; i < n; i++) c += strokeCost(a, i, b, i);
    return c / n;
  }
  // one skip allowed: try every skip position in the longer sequence
  const [L, S, ln, sn] = n > m ? [a, b, n, m] : [b, a, m, n];
  let best = Infinity;
  for (let skip = 0; skip < ln; skip++) {
    let c = SKIP;
    for (let i = 0; i < sn && c < best; i++) c += strokeCost(L, i < skip ? i : i + 1, S, i);
    if (c < best) best = c;
  }
  return best / ln;
}

export async function recognize(strokes: Pt[][], limit = 12): Promise<string[]> {
  if (!strokes.length) return [];
  const idx = await loadHw();
  const f = features(strokes);
  const res: [number, string][] = [];
  for (const [ch, g] of idx) {
    const d = distance(f, g);
    if (d < Infinity) res.push([d, ch]);
  }
  return res.sort((x, y) => x[0] - y[0]).slice(0, limit).map((x) => x[1]);
}
