import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { execSync } from "node:child_process";

execSync("npx tsc lib/annotate.ts --outDir scripts/.cache/js --module esnext --target es2020 --moduleResolution bundler --skipLibCheck", { stdio: "inherit" });
fs.writeFileSync("scripts/.cache/js/package.json", '{"type":"module"}');
for (const f of ["annotate", "pron", "dict"]) {
  const p = `scripts/.cache/js/${f}.js`;
  fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(/from "\.\/(dict|pron)"/g, 'from "./$1.js"'));
}
const { parseLyrics, toneMark } = await import("./.cache/js/annotate.js");

test("tone marks", () => {
  assert.equal(toneMark("hao3"), "hǎo");
  assert.equal(toneMark("nv3"), "nǚ");
  assert.equal(toneMark("liu2"), "liú");
  assert.equal(toneMark("de5"), "de");
});
test("plain lyrics keep their order and drop empty lines", () => {
  assert.deepEqual(parseLyrics("第一行\n\n第二行"), [{ time: null, text: "第一行" }, { time: null, text: "第二行" }]);
});
test("LRC timestamps are read and sorted", () => {
  const l = parseLyrics("[ti:x]\n[00:12.50]第二行\n[00:05.00]第一行\n[01:02.00]第三行");
  assert.deepEqual(l.map((x) => x.time), [5, 12.5, 62]);
  assert.equal(l[0].text, "第一行");
});
