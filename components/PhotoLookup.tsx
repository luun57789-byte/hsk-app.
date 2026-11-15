"use client";
import { useRef, useState } from "react";
import { BASE } from "@/lib/dict";

/** Reads Chinese text from a photo, entirely in the browser. */
export default function PhotoLookup({ onText }: { onText: (text: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(file: File) {
    setBusy(true);
    setStatus("Đang tải bộ nhận dạng chữ…");
    try {
      const { createWorker } = await import("tesseract.js");
      const root = `${location.origin}${BASE}/ocr`;
      const worker = await createWorker("chi_sim", 1, {
        workerPath: `${root}/worker.min.js`,
        corePath: root,
        langPath: root,
        gzip: true,
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") setStatus(`Đang đọc chữ trong ảnh… ${Math.round(m.progress * 100)}%`);
        },
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const text = (data.text.match(/[㐀-鿿]+/g) || []).join("");
      if (text) {
        setStatus(`Đã đọc được: ${text.slice(0, 60)}`);
        onText(text.slice(0, 60));
      } else setStatus("Không tìm thấy chữ Hán trong ảnh. Hãy chụp gần và rõ hơn.");
    } catch {
      setStatus("Không đọc được ảnh này, hãy thử lại.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) run(f); }}
      />
      <button onClick={() => input.current?.click()} disabled={busy}>📷 Tra bằng ảnh</button>
      {status && <div className="muted" style={{ flexBasis: "100%" }}>{status}</div>}
    </>
  );
}
