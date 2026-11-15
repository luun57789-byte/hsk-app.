// Pronunciation scoring: the browser's speech recognition turns the learner's
// voice into Chinese text, which is compared with the target syllable by syllable.
import { BASE } from "./dict";

export type Readings = Record<string, string>; // char -> "hao3 hao4"
export type Mark = { ch: string; level: "ok" | "tone" | "no" };

let cache: Promise<Readings> | null = null;
export function loadReadings(): Promise<Readings> {
  if (!cache) cache = fetch(`${BASE}/data/chars.json`).then((r) => r.json());
  return cache;
}

const HAN = /[㐀-鿿]/;
const han = (s: string) => [...s].filter((c) => HAN.test(c));

/** 1 = same sound, 0.6 = same syllable with a different tone, 0 = different. */
export function similarity(a: string, b: string, r: Readings): number {
  if (a === b) return 1;
  const ra = (r[a] || "").split(" ").filter(Boolean);
  const rb = (r[b] || "").split(" ").filter(Boolean);
  let best = 0;
  for (const x of ra)
    for (const y of rb) {
      if (x === y) return 1;
      // neutral tone (5) counts as a match with any tone of the same syllable
      const bx = x.slice(0, -1), by = y.slice(0, -1);
      if (bx === by) best = Math.max(best, x.endsWith("5") || y.endsWith("5") ? 1 : 0.6);
    }
  return best;
}

/** Score 0..100 plus a mark per target character. */
export function scorePronunciation(target: string, heard: string, r: Readings): { score: number; marks: Mark[] } {
  const T = han(target), H = han(heard);
  const n = T.length, m = H.length;
  if (!n) return { score: 0, marks: [] };
  // best in-order alignment of target and heard characters
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1] + similarity(T[i - 1], H[j - 1], r));
  const marks: Mark[] = T.map((ch) => ({ ch, level: "no" }));
  let i = n, j = m;
  while (i > 0 && j > 0) {
    const s = similarity(T[i - 1], H[j - 1], r);
    if (dp[i][j] === dp[i - 1][j - 1] + s && s > 0) {
      marks[i - 1].level = s === 1 ? "ok" : "tone";
      i--; j--;
    } else if (dp[i][j] === dp[i - 1][j]) i--;
    else j--;
  }
  // extra syllables that were not in the target cost a little
  const extra = Math.max(0, m - n);
  const score = Math.max(0, Math.round((dp[n][m] / n) * 100 - extra * 10));
  return { score, marks };
}

export function recognitionSupported(): boolean {
  return typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

/** Listen once and return the candidate transcripts (best first). */
export function listenOnce(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return reject(new Error("unsupported"));
    const rec = new SR();
    rec.lang = "zh-CN";
    rec.maxAlternatives = 5;
    rec.interimResults = false;
    let done = false;
    // give up if the browser never answers
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      try { rec.abort(); } catch {}
      reject(new Error("no-speech"));
    }, 12000);
    const finish = () => { done = true; clearTimeout(timer); };
    rec.onresult = (ev: any) => {
      finish();
      resolve(Array.from(ev.results[0] as ArrayLike<{ transcript: string }>).map((a) => a.transcript));
    };
    rec.onerror = (ev: any) => { if (!done) { finish(); reject(new Error(ev.error || "error")); } };
    rec.onend = () => { if (!done) { finish(); reject(new Error("no-speech")); } };
    rec.start();
  });
}
