// Copies the text-recognition engine (tesseract.js, Apache-2.0) and the
// Simplified Chinese model into public/ocr so photo lookup works without a CDN.
import fs from "node:fs";
fs.mkdirSync("public/ocr", { recursive: true });
const files = [
  ["node_modules/tesseract.js/dist/worker.min.js", "worker.min.js"],
  ["node_modules/@tesseract.js-data/chi_sim/4.0.0_best_int/chi_sim.traineddata.gz", "chi_sim.traineddata.gz"],
];
for (const f of fs.readdirSync("node_modules/tesseract.js-core"))
  if (/-lstm\.wasm\.js$/.test(f)) files.push([`node_modules/tesseract.js-core/${f}`, f]);
for (const [from, to] of files) fs.copyFileSync(from, `public/ocr/${to}`);
console.log("ocr files:", files.length);
