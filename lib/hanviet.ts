// Hán Việt reading of a word, from its traditional characters and pinyin.
import { BASE, type Entry } from "./dict";

type Table = Record<string, string>; // char -> "zhong1=trung;zhong4=trúng"
let cache: Promise<Table> | null = null;
export function loadHanViet(): Promise<Table> {
  if (!cache) cache = fetch(`${BASE}/data/hanviet.json`).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  return cache;
}

const TONE: [RegExp, string][] = [[/[āēīōūǖ]/, "1"], [/[áéíóúǘ]/, "2"], [/[ǎěǐǒǔǚ]/, "3"], [/[àèìòùǜ]/, "4"]];
/** "zhōng" -> "zhong1" */
export function numeric(syllable: string): string {
  const s = syllable.toLowerCase();
  const tone = TONE.find(([re]) => re.test(s))?.[1] ?? "5";
  return s.normalize("NFD").replace(/ü/g, "v").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "") + tone;
}

export function hanViet(e: Pick<Entry, "t" | "p">, table: Table): string {
  const chars = [...e.t];
  const syl = e.p.split(/\s+/).filter(Boolean).map(numeric);
  const aligned = syl.length === chars.length;
  const out: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    const row = table[chars[i]];
    if (!row) return ""; // unknown character: show nothing rather than a partial reading
    const options = row.split(";").map((x) => x.split("=") as [string, string]);
    const want = aligned ? syl[i] : "";
    const hit =
      options.find(([k]) => k === want) ||
      options.find(([k]) => want && k.slice(0, -1) === want.slice(0, -1)) ||
      options.find(([k]) => k === "*") ||
      options[0];
    out.push(hit[1]);
  }
  return out.join(" ");
}
