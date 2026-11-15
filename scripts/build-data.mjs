// Builds public/data/dict.json and public/data/hw.json from open data.
// Sources:
//  - complete-hsk-vocabulary (MIT; meanings from CC-CEDICT, CC BY-SA 4.0)
//    https://github.com/drkameleon/complete-hsk-vocabulary
//  - hanzi-writer-data (Make Me a Hanzi; Arphic Public License)
import fs from "node:fs";
import path from "node:path";

const SRC =
  "https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.json";
const cache = "scripts/.cache/complete.json";
fs.mkdirSync("scripts/.cache", { recursive: true });
fs.mkdirSync("public/data", { recursive: true });
if (!fs.existsSync(cache)) {
  const r = await fetch(SRC);
  if (!r.ok) throw new Error("download failed " + r.status);
  fs.writeFileSync(cache, Buffer.from(await r.arrayBuffer()));
}
const raw = JSON.parse(fs.readFileSync(cache, "utf8"));
// CVDICT: Chinese-Vietnamese dictionary translated from CC-CEDICT (CC BY-SA 4.0)
// https://github.com/ph0ngp/CVDICT
const CV_SRC = "https://raw.githubusercontent.com/ph0ngp/CVDICT/main/CVDICT.u8";
const cvCache = "scripts/.cache/CVDICT.u8";
if (!fs.existsSync(cvCache)) {
  const r = await fetch(CV_SRC);
  if (!r.ok) throw new Error("download failed " + r.status);
  fs.writeFileSync(cvCache, Buffer.from(await r.arrayBuffer()));
}
const hanOnly = /^[\u3400-\u9fff]+$/;
const skipVi = /^(họ |biến thể|dạng cũ|dạng cổ|xem |dùng trong |được dùng trong |biến âm|dị thể)/i;
const cv = new Map(); // simplified -> [{t, numeric, meanings, bad}]
const readings = {};
for (const line of fs.readFileSync(cvCache, "utf8").split("\n")) {
  const m = /^(\S+) (\S+) \[([^\]]+)\] \/(.*)\/\s*$/.exec(line);
  if (!m || !hanOnly.test(m[2])) continue;
  const [, t, s2, numeric, defs] = m;
  if ([...s2].length === 1) {
    const r = numeric.toLowerCase().replace("u:", "v");
    if (/^[a-z]+[1-5]$/.test(r)) (readings[s2] ??= new Set()).add(r);
  }
  const meanings = defs.split("/").filter((d) => d && !/^LT:/.test(d));
  if (!meanings.length) continue;
  const bad = skipVi.test(meanings[0]) || /^[A-Z]/.test(numeric);
  (cv.get(s2) ?? cv.set(s2, []).get(s2)).push({ t, numeric, meanings, bad });
}
const norm = (n) => n.toLowerCase().replace(/[\s:]/g, "").replace(/5/g, "");
const pickCv = (s2, numeric) => {
  const list = cv.get(s2);
  if (!list) return null;
  return (
    (numeric && list.find((x) => norm(x.numeric) === norm(numeric))) ||
    list.reduce((a, b) => ((b.bad ? -100 : 0) + b.meanings.length > (a.bad ? -100 : 0) + a.meanings.length ? b : a))
  );
};

const lvl = (levels, prefix) => {
  const l = levels.find((x) => x.startsWith(prefix + "-"));
  return l ? Number(l.split("-")[1]) : 0;
};
// entry: [simplified, traditional, pinyin, Vietnamese meanings[], hsk3 level (7 = 7-9), hsk2 level, frequency, English meanings[], part-of-speech code]
const dict = raw
  .map((e) => {
    const f = bestForm(e.forms);
    const v = pickCv(e.simplified, f.transcriptions.numeric);
    return [
      e.simplified,
      f.traditional,
      f.transcriptions.pinyin,
      v ? v.meanings.slice(0, 6) : [],
      lvl(e.level, "new"),
      lvl(e.level, "old"),
      e.frequency,
      f.meanings.slice(0, 3),
      e.pos.filter((x) => !["g", "k", "h"].includes(x))[0] || "",
    ];
  })
  .sort((a, b) => a[6] - b[6]);
// Vietnamese meanings written for this project: data/vi-*.tsv
// columns: word, Vietnamese meaning, optional pinyin override
const vi = {};
const known = new Map(dict.map((r) => [r[0], r]));
for (const file of fs.readdirSync("data").filter((f) => /^vi-.*\.tsv$/.test(f))) {
  for (const line of fs.readFileSync(path.join("data", file), "utf8").split("\n")) {
    const [w, meaning, pinyin] = line.split("\t");
    if (!w || !meaning) continue;
    if (!known.has(w)) throw new Error(`${file}: unknown word ${w}`);
    vi[w] = meaning.trim();
    if (pinyin) known.get(w)[2] = pinyin.trim();
  }
}
fs.writeFileSync("public/data/vi.json", JSON.stringify(vi));
console.log("vi:", Object.keys(vi).length, "words");
fs.writeFileSync("public/data/dict.json", JSON.stringify(dict));
console.log("dict:", dict.length, "entries");

// The source lists several readings per word; pick the everyday one:
// skip surnames, variants and cross-references, then take the richest entry.
function bestForm(forms) {
  const bad = /^(surname|old variant|variant of|used in|abbr\.|see |erhua variant)/i;
  const score = (f) =>
    (bad.test(f.meanings[0] || "") ? -100 : 0) +
    (/^[A-ZĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙ]/.test(f.transcriptions.pinyin) ? -50 : 0) +
    f.meanings.length;
  return forms.reduce((a, b) => (score(b) > score(a) ? b : a));
}

// Handwriting index: per character, per stroke: start, middle, end points
// normalised to a 0..15 grid (aspect preserved, centred). 6 hex digits per stroke.
const dir = "node_modules/hanzi-writer-data";
const hw = {};
for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith(".json") || file === "package.json" || file === "all.json") continue;
  const ch = path.basename(file, ".json");
  if ([...ch].length !== 1) continue;
  const { medians } = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  if (!medians?.length) continue;
  const strokes = medians.map((m) => m.map(([x, y]) => [x, 900 - y]));
  hw[ch] = encode(strokes);
}
fs.writeFileSync("public/data/hw.json", JSON.stringify(hw));
console.log("hw:", Object.keys(hw).length, "characters");

function encode(strokes) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of strokes) for (const [x, y] of s) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const size = Math.max(maxX - minX, maxY - minY, 1);
  const ox = (minX + maxX) / 2 - size / 2, oy = (minY + maxY) / 2 - size / 2;
  const q = (v, o) => Math.max(0, Math.min(15, Math.round(((v - o) / size) * 15))).toString(16);
  return strokes
    .map((s) => {
      const pts = [s[0], pointAtHalf(s), s[s.length - 1]];
      return pts.map(([x, y]) => q(x, ox) + q(y, oy)).join("");
    })
    .join("");
}
function pointAtHalf(s) {
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

// Stroke-order data for every character used in the dictionary, self-hosted
// so stroke animations work offline (other characters fall back to the CDN).
fs.rmSync("public/hanzi", { recursive: true, force: true });
fs.mkdirSync("public/hanzi", { recursive: true });
const used = new Set(dict.flatMap((r) => [...r[0], ...r[1]]));
let copied = 0;
for (const ch of used) {
  const src = path.join(dir, ch + ".json");
  if (fs.existsSync(src)) { fs.copyFileSync(src, `public/hanzi/${ch}.json`); copied++; }
}
console.log("stroke files:", copied);

// Hán Việt readings per traditional character and pinyin (MIT)
// https://github.com/ph0ngp/hanviet-pinyin-wordlist
const HV_SRC = "https://raw.githubusercontent.com/ph0ngp/hanviet-pinyin-wordlist/main/hanviet.csv";
const hvCache = "scripts/.cache/hanviet.csv";
if (!fs.existsSync(hvCache)) {
  const r = await fetch(HV_SRC);
  if (!r.ok) throw new Error("download failed " + r.status);
  fs.writeFileSync(hvCache, Buffer.from(await r.arrayBuffer()));
}
const hv = {}; // char -> "zhong1=trung;zhong4=trúng" ("*" = any pinyin)
for (const line of fs.readFileSync(hvCache, "utf8").split("\n").slice(1)) {
  const m = /^(.),"?\[(.*)\]"?,(.+)$/.exec(line.trim());
  if (!m) continue;
  const first = /'([^']+)'/.exec(m[2]);
  if (!first) continue;
  const key = m[3].toLowerCase().replace("u:", "v").replace("ü", "v");
  hv[m[1]] = (hv[m[1]] ? hv[m[1]] + ";" : "") + key + "=" + first[1];
}
fs.writeFileSync("public/data/hanviet.json", JSON.stringify(hv));
console.log("hanviet:", Object.keys(hv).length, "characters");

// Example sentences written for this project: data/examples.tsv
// columns: sentence, pinyin, Vietnamese translation
const examples = fs.readFileSync("data/examples.tsv", "utf8").split("\n").filter(Boolean).map((l) => {
  const cols = l.split("\t");
  if (cols.length !== 3) throw new Error("examples.tsv: bad line " + l);
  return cols;
});
fs.writeFileSync("public/data/examples.json", JSON.stringify(examples));
console.log("examples:", examples.length);

// Lessons written for this project: grammar (data/grammar.txt) and
// colloquial / everyday phrases (data/phrases.tsv).
const grammar = fs.readFileSync("data/grammar.txt", "utf8").split(/\n\s*\n/).filter((b) => b.trim()).map((block) => {
  const lines = block.trim().split("\n");
  const [title, pattern] = lines[0].replace(/^#\s*/, "").split(" | ");
  const examples = lines.slice(2).map((l) => l.split(" | "));
  if (!title || !pattern || !lines[1] || examples.some((x) => x.length !== 3)) throw new Error("grammar.txt: bad block " + lines[0]);
  return { title, pattern, note: lines[1], examples };
});
const phrases = fs.readFileSync("data/phrases.tsv", "utf8").split("\n").filter(Boolean).map((l) => {
  const c = l.split("\t");
  if (c.length < 4) throw new Error("phrases.tsv: bad line " + l);
  return c;
});
const spoken = phrases.filter((c) => c[0] === "khau-ngu").map((c) => c.slice(1));
const topics = [];
for (const c of phrases.filter((x) => x[0].startsWith("giao-tiep:"))) {
  const name = c[0].split(":")[1];
  (topics.find((t) => t.name === name) ?? topics[topics.push({ name, items: [] }) - 1]).items.push(c.slice(1));
}
fs.writeFileSync("public/data/learn.json", JSON.stringify({ grammar, spoken, topics }));
console.log("learn:", grammar.length, "grammar points,", spoken.length, "spoken phrases,", topics.reduce((n, t) => n + t.items.length, 0), "everyday sentences");

// Every other dictionary word (not in the HSK lists), Vietnamese meanings.
const extra = [];
for (const [s2, list] of cv) {
  if (known.has(s2)) continue;
  const v = pickCv(s2);
  extra.push([s2, v.t, toneMarks(v.numeric), v.meanings.slice(0, 4)]);
}
fs.writeFileSync("public/data/cedict.json", JSON.stringify(extra));
fs.writeFileSync(
  "public/data/chars.json",
  JSON.stringify(Object.fromEntries(Object.entries(readings).map(([c, r]) => [c, [...r].join(" ")]))),
);
console.log("extra:", extra.length, "words; readings for", Object.keys(readings).length, "characters");
console.log("HSK words without Vietnamese:", dict.filter((r) => !r[3].length).length);

// "ni3 hao3" -> "nǐ hǎo"
function toneMarks(numeric) {
  const marks = { a: "āáǎàa", e: "ēéěèe", i: "īíǐìi", o: "ōóǒòo", u: "ūúǔùu", ü: "ǖǘǚǜü" };
  return numeric
    .split(" ")
    .map((syl) => {
      const m = /^([A-Za-z:]+)([1-5])$/.exec(syl);
      if (!m) return syl;
      let s = m[1].replace(/u:/g, "ü").replace(/U:/g, "Ü");
      const tone = Number(m[2]) - 1;
      const lower = s.toLowerCase();
      let idx = lower.search(/[ae]/);
      if (idx < 0) idx = lower.indexOf("ou");
      if (idx < 0) for (let i = lower.length - 1; i >= 0; i--) if ("iouü".includes(lower[i])) { idx = i; break; }
      if (idx < 0) return s;
      const v = marks[lower[idx]][tone];
      return s.slice(0, idx) + (s[idx] === lower[idx] ? v : v.toUpperCase()) + s.slice(idx + 1);
    })
    .join(" ");
}
