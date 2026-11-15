export type Entry = {
  s: string; // simplified
  t: string; // traditional
  p: string; // pinyin with tone marks
  m: string[]; // meanings (English, CC-CEDICT)
  vi?: string; // Vietnamese meaning when available
  h3: number; // HSK 3.0 level, 7 = 7-9, 0 = none
  h2: number; // HSK 2.0 level, 0 = none
  f: number; // frequency rank
  key: string; // pinyin without tones/spaces, for search
};

export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const plain = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/ü/g, "v")
    .toLowerCase();

let cache: Promise<Entry[]> | null = null;
let byWord: Map<string, Entry> | null = null;

export function loadDict(): Promise<Entry[]> {
  if (!cache) {
    cache = Promise.all([
      fetch(`${BASE}/data/dict.json`).then((r) => r.json()),
      fetch(`${BASE}/data/vi.json`)
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({})),
    ]).then(([rows, vi]: [any[], Record<string, string>]) => {
      const list: Entry[] = rows.map((r) => ({
        s: r[0], t: r[1], p: r[2], m: r[3], h3: r[4], h2: r[5], f: r[6],
        vi: vi[r[0]],
        key: plain(r[2]).replace(/[^a-z]/g, ""),
      }));
      byWord = new Map(list.map((e) => [e.s, e]));
      return list;
    });
  }
  return cache;
}

export async function getWord(w: string): Promise<Entry | undefined> {
  await loadDict();
  return byWord!.get(w);
}

const HAN = /[㐀-鿿]/;

export function search(list: Entry[], query: string, limit = 50): Entry[] {
  const q = query.trim();
  if (!q) return [];
  const scored: [number, Entry][] = [];
  if (HAN.test(q)) {
    for (const e of list) {
      let sc = -1;
      if (e.s === q || e.t === q) sc = 0;
      else if (e.s.startsWith(q) || e.t.startsWith(q)) sc = 1;
      else if (e.s.includes(q) || e.t.includes(q)) sc = 2;
      else if (q.length > 1 && q.includes(e.s)) sc = 3; // words inside a pasted sentence
      if (sc >= 0) scored.push([sc * 1e6 + e.f, e]);
    }
  } else {
    const pq = plain(q);
    const pk = pq.replace(/[^a-z]/g, "");
    const word = new RegExp(`(^|[^a-z])${pq.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
    for (const e of list) {
      let sc = -1;
      if (pk && e.key === pk) sc = 0;
      else if (e.vi && word.test(plain(e.vi))) sc = 1;
      else if (pk && e.key.startsWith(pk)) sc = 2;
      else if (e.m.some((m) => word.test(m.toLowerCase()))) sc = 3;
      if (sc >= 0) scored.push([sc * 1e6 + e.f, e]);
    }
  }
  return scored.sort((a, b) => a[0] - b[0]).slice(0, limit).map((x) => x[1]);
}

export const levelLabel = (e: Entry) =>
  [
    e.h3 ? `HSK 3.0: ${e.h3 === 7 ? "7-9" : e.h3}` : "",
    e.h2 ? `HSK 2.0: ${e.h2}` : "",
  ].filter(Boolean);

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  u.rate = 0.8;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
