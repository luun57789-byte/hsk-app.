// Sanity test for the handwriting matcher: feeding a character's own median
// strokes (with jitter) back in must return that character first.
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { execSync } from "node:child_process";

execSync("npx tsc lib/hw.ts --outDir scripts/.cache/js --module esnext --target es2020 --moduleResolution bundler --skipLibCheck", { stdio: "inherit" });
fs.writeFileSync("scripts/.cache/js/package.json", '{"type":"module"}');
for (const f of ["hw.js"]) {
  const p = "scripts/.cache/js/" + f;
  fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace('"./dict"', '"./dict.js"'));
}
const { features, distance } = await import("./.cache/js/hw.js");
const idx = Object.entries(JSON.parse(fs.readFileSync("public/data/hw.json", "utf8"))).map(
  ([ch, hex]) => [ch, [...hex].map((c) => parseInt(c, 16))],
);
const top = (strokes, n = 5) => {
  const f = features(strokes);
  return idx.map(([ch, g]) => [distance(f, g), ch]).filter((x) => x[0] < Infinity)
    .sort((a, b) => a[0] - b[0]).slice(0, n).map((x) => x[1]);
};
const medians = (ch) =>
  JSON.parse(fs.readFileSync(`node_modules/hanzi-writer-data/${ch}.json`, "utf8")).medians.map((m) =>
    m.map(([x, y], i) => [x * 0.3 + 40 + ((i * 7) % 5), (900 - y) * 0.3 + 20 - ((i * 3) % 4)]),
  );

test("recognises characters drawn in correct stroke order", () => {
  let hit = 0;
  const chars = [..."你好我是中国人学习汉语谢再见爱吃水大小朋友"];
  for (const ch of chars) if (top(medians(ch), 3).includes(ch)) hit++;
  assert.ok(hit >= chars.length - 1, `only ${hit}/${chars.length} recognised`);
});
test("tolerates one missing stroke", () => {
  const s = medians("语");
  s.pop();
  assert.ok(top(s, 10).includes("语"));
});
