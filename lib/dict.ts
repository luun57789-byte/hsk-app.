export type Entry = {
  s: string; // simplified
  t: string; // traditional
  p: string; // pinyin with tone marks
  m: string[]; // Vietnamese meanings (CVDICT)
  en: string[]; // English meanings (CC-CEDICT), HSK words only
  vi?: string; // short hand-written Vietnamese meaning when available
  h3: number; // HSK 3.0 level, 7 = 7-9, 0 = none
  h2: number; // HSK 2.0 level, 0 = none
  f: number; // frequency rank
  pos: string; // word type in Vietnamese, "" when unknown
  key: string; // pinyin without tones/spaces, for search
  pm: string; // meanings without diacritics, for search
  o?: { p: string; vi?: string }; // dictionary values, kept while the learner's own note replaces them
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
let extraCache: Promise<Entry[]> | null = null;
let byWord: Map<string, Entry> | null = null;

const POS: Record<string, string> = {
  v: "động từ", vn: "động từ", n: "danh từ", nr: "tên riêng", ns: "địa danh", nz: "tên riêng", nt: "danh từ",
  a: "tính từ", an: "tính từ", ad: "tính từ", z: "tính từ", b: "tính từ", d: "phó từ", r: "đại từ", p: "giới từ",
  c: "liên từ", cc: "liên từ", u: "trợ từ", y: "trợ từ", m: "số từ", q: "lượng từ", qv: "lượng từ", qt: "lượng từ",
  mq: "lượng từ", t: "từ chỉ thời gian", tg: "từ chỉ thời gian", f: "phương vị từ", s: "từ chỉ nơi chốn",
  e: "thán từ", o: "từ tượng thanh", l: "cụm từ",
};

const make = (r: any[], vi?: string): Entry => ({
  pos: POS[r[8]] || "",
  s: r[0], t: r[1], p: r[2], m: r[3], h3: r[4] || 0, h2: r[5] || 0, f: r[6] || 0, en: r[7] || [],
  vi,
  key: plain(r[2]).replace(/[^a-z]/g, ""),
  // "|meaning one|meaning two|", split on / and ;
  pm: "|" + plain((vi ? vi + ";" : "") + r[3].join(";")).split(/\s*[;/]\s*/).filter(Boolean).join("|") + "|",
});

/** HSK words (small, loaded first). */
export function loadDict(): Promise<Entry[]> {
  if (!cache) {
    cache = Promise.all([
      fetch(`${BASE}/data/dict.json`).then((r) => r.json()),
      fetch(`${BASE}/data/vi.json`)
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({})),
    ]).then(([rows, vi]: [any[], Record<string, string>]) => {
      const list = rows.map((r) => make(r, vi[r[0]]));
      byWord = new Map(list.map((e) => [e.s, e]));
      applyNotes(storedNotes());
      return list;
    });
  }
  return cache;
}

/** All other dictionary words (large, loaded in the background). */
export function loadExtra(): Promise<Entry[]> {
  if (!extraCache) {
    extraCache = loadDict().then(() =>
      fetch(`${BASE}/data/cedict.json`)
        .then((r) => r.json())
        .then((rows: any[]) => {
          const list = rows.map((r, i) => make([r[0], r[1], r[2], r[3], 0, 0, 100000 + i]));
          for (const e of list) byWord!.set(e.s, e);
          applyNotes(storedNotes());
          return list;
        }),
    );
  }
  return extraCache;
}

export async function getWord(w: string): Promise<Entry | undefined> {
  await loadDict();
  if (byWord!.has(w)) return byWord!.get(w);
  await loadExtra().catch(() => {});
  return byWord!.get(w);
}

/** Show the learner's own pinyin/meaning (see lib/store notes) in place of the dictionary's. */
export function applyNotes(notes: Record<string, { p?: string; vi?: string }>) {
  if (!byWord) return;
  for (const e of byWord.values()) {
    const n = notes[e.s];
    if (!n && !e.o) continue;
    if (!e.o) e.o = { p: e.p, vi: e.vi };
    e.p = n?.p || e.o.p;
    e.vi = n?.vi || e.o.vi;
    if (!n) delete e.o;
  }
}
const storedNotes = () => {
  try { return JSON.parse(localStorage.getItem("hsk-notes-v1") || "{}"); } catch { return {}; }
};

/** Short meaning for lists and quizzes. */
export const gloss = (e: Entry) => e.vi || e.m.slice(0, 3).join("; ") || e.en.slice(0, 3).join("; ");

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
      if (sc >= 0) scored.push([sc * 1e6 + e.f, e]);
      else if (q.length > 1) {
        // words inside a pasted or photographed sentence: by position, longer first
        const at = q.indexOf(e.s);
        if (at >= 0) scored.push([3e6 + at * 100 - [...e.s].length, e]);
      }
    }
  } else {
    const pq = plain(q);
    const pk = pq.replace(/[^a-z]/g, "");
    const word = new RegExp(`(^|[^a-z])${pq.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
    for (const e of list) {
      let sc = -1;
      if (e.pm.includes(`|${pq}|`)) sc = 0; // a meaning is exactly the query
      else if (pk && e.key === pk) sc = 1;
      else if (word.test(e.pm)) sc = 2;
      else if (pk && e.key.startsWith(pk)) sc = 3;
      else if (e.en.some((m) => word.test(m.toLowerCase()))) sc = 4;
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

export type Example = [zh: string, pinyin: string, vi: string];
let exCache: Promise<Example[]> | null = null;
/** Example sentences that contain the word, shortest first. */
export function examplesFor(w: string, limit = 3): Promise<Example[]> {
  if (!exCache)
    exCache = fetch(`${BASE}/data/examples.json`).then((r) => (r.ok ? r.json() : [])).catch(() => []);
  return exCache.then((all) =>
    all.filter((x) => x[0].includes(w)).sort((a, b) => a[0].length - b[0].length).slice(0, limit),
  );
}
