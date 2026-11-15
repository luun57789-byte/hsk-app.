import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { execSync } from "node:child_process";

execSync("npx tsc lib/pron.ts --outDir scripts/.cache/js --module esnext --target es2020 --moduleResolution bundler --skipLibCheck", { stdio: "inherit" });
fs.writeFileSync("scripts/.cache/js/package.json", '{"type":"module"}');
const p = "scripts/.cache/js/pron.js";
fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace('"./dict"', '"./dict.js"'));
const { scorePronunciation } = await import("./.cache/js/pron.js");
const r = JSON.parse(fs.readFileSync("public/data/chars.json", "utf8"));

test("exact match scores 100", () => {
  assert.equal(scorePronunciation("你好", "你好", r).score, 100);
});
test("homophones count as correct", () => {
  // 他 and 她 are both ta1
  assert.equal(scorePronunciation("他们", "她们", r).score, 100);
});
test("wrong tone gets partial credit", () => {
  // 买 mai3 vs 卖 mai4
  const res = scorePronunciation("买", "卖", r);
  assert.equal(res.score, 60);
  assert.equal(res.marks[0].level, "tone");
});
test("missing syllable lowers the score", () => {
  const res = scorePronunciation("谢谢你", "谢谢", r);
  assert.equal(res.score, 67);
  assert.deepEqual(res.marks.map((m) => m.level), ["ok", "ok", "no"]);
});
test("different word scores 0", () => {
  assert.equal(scorePronunciation("朋友", "吃饭", r).score, 0);
});
