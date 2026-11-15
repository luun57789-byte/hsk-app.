// Splits Chinese text into dictionary words and gives each its pinyin.
import { getWord, loadDict, loadExtra, type Entry } from "./dict";
import { loadReadings } from "./pron";

export type Token = { text: string; pinyin: string; entry?: Entry };
const HAN = /[㐀-鿿]/;

const MARKS: Record<string, string> = { a: "āáǎàa", e: "ēéěèe", i: "īíǐìi", o: "ōóǒòo", u: "ūúǔùu", v: "ǖǘǚǜü" };
/** "hao3" -> "hǎo" */
export function toneMark(numeric: string): string {
  const m = /^([a-z]+)([1-5])$/.exec(numeric);
  if (!m) return numeric;
  const s = m[1], tone = Number(m[2]) - 1;
  let idx = s.search(/[ae]/);
  if (idx < 0) idx = s.indexOf("ou");
  if (idx < 0) for (let i = s.length - 1; i >= 0; i--) if ("iouv".includes(s[i])) { idx = i; break; }
  if (idx < 0) return s;
  return (s.slice(0, idx) + MARKS[s[idx]][tone] + s.slice(idx + 1)).replace(/v/g, "ü");
}

export type Annotator = (line: string) => Token[];

/** Loads the whole dictionary once and returns a function that annotates a line. */
export async function makeAnnotator(): Promise<Annotator> {
  const [main, extra, readings] = await Promise.all([loadDict(), loadExtra().catch(() => [] as Entry[]), loadReadings()]);
  const words = new Map<string, Entry>();
  for (const e of extra) words.set(e.s, e);
  for (const e of main) words.set(e.s, e); // HSK entries win
  for (const e of [...extra, ...main]) if (e.t !== e.s && !words.has(e.t)) words.set(e.t, e);
  void getWord;
  return (line: string) => {
    const chars = [...line];
    const out: Token[] = [];
    let i = 0;
    while (i < chars.length) {
      if (!HAN.test(chars[i])) {
        // keep runs of other characters (spaces, punctuation, Latin) together
        let j = i;
        while (j < chars.length && !HAN.test(chars[j])) j++;
        out.push({ text: chars.slice(i, j).join(""), pinyin: "" });
        i = j;
        continue;
      }
      let hit: Entry | undefined, len = 0;
      for (let n = Math.min(5, chars.length - i); n >= 1; n--) {
        const e = words.get(chars.slice(i, i + n).join(""));
        if (e) { hit = e; len = n; break; }
      }
      if (hit) {
        out.push({ text: chars.slice(i, i + len).join(""), pinyin: hit.p, entry: hit });
        i += len;
      } else {
        const r = (readings[chars[i]] || "").split(" ")[0];
        out.push({ text: chars[i], pinyin: r ? toneMark(r) : "" });
        i++;
      }
    }
    return out;
  };
}

export type LyricLine = { time: number | null; text: string };
/** Plain lyrics, or LRC lines like "[01:23.45]歌词". */
export function parseLyrics(raw: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const row of raw.split(/\r?\n/)) {
    const stamps = [...row.matchAll(/\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g)];
    const text = row.replace(/\[[^\]]*\]/g, "").trim();
    if (!text) continue;
    if (!stamps.length) lines.push({ time: null, text });
    for (const s of stamps) lines.push({ time: Number(s[1]) * 60 + Number(s[2].replace(":", ".")), text });
  }
  const timed = lines.filter((l) => l.time !== null);
  // use the timing only when (nearly) every line has one
  if (timed.length >= lines.length * 0.8 && timed.length > 1) return timed.sort((a, b) => a.time! - b.time!);
  return lines.map((l) => ({ time: null, text: l.text }));
}
