import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { execSync } from "node:child_process";

execSync("npx tsc lib/hanviet.ts --outDir scripts/.cache/js --module esnext --target es2020 --moduleResolution bundler --skipLibCheck", { stdio: "inherit" });
fs.writeFileSync("scripts/.cache/js/package.json", '{"type":"module"}');
const p = "scripts/.cache/js/hanviet.js";
fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace('"./dict"', '"./dict.js"'));
const { hanViet, numeric } = await import("./.cache/js/hanviet.js");
const t = JSON.parse(fs.readFileSync("public/data/hanviet.json", "utf8"));

test("numeric pinyin", () => {
  assert.equal(numeric("zhōng"), "zhong1");
  assert.equal(numeric("nǚ"), "nv3");
  assert.equal(numeric("de"), "de5");
});
test("reading follows the pinyin of each character", () => {
  assert.equal(hanViet({ t: "中國", p: "zhōng guó" }, t), "trung quốc");
  assert.equal(hanViet({ t: "中", p: "zhòng" }, t), "trúng");
  assert.equal(hanViet({ t: "回來", p: "huí lai" }, t), "hồi lai");
  assert.equal(hanViet({ t: "喜歡", p: "xǐ huan" }, t), "hỷ hoan");
});
test("unaligned pinyin still gives a reading", () => {
  assert.equal(hanViet({ t: "中國", p: "Zhōngguó" }, t), "trung quốc");
});
