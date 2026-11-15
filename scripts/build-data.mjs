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
const lvl = (levels, prefix) => {
  const l = levels.find((x) => x.startsWith(prefix + "-"));
  return l ? Number(l.split("-")[1]) : 0;
};
// entry: [simplified, traditional, pinyin, meanings[], hsk3 level (7 = 7-9), hsk2 level, frequency]
const dict = raw
  .map((e) => {
    const f = bestForm(e.forms);
    return [
      e.simplified,
      f.traditional,
      f.transcriptions.pinyin,
      f.meanings.slice(0, 5),
      lvl(e.level, "new"),
      lvl(e.level, "old"),
      e.frequency,
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
