"use client";
import { useEffect, useRef, useState } from "react";
import HanziWriter from "hanzi-writer";
import { BASE } from "@/lib/dict";

export default function StrokeOrder({ ch }: { ch: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const writer = useRef<HanziWriter | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  const [quiz, setQuiz] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const el = ref.current!;
    el.innerHTML = "";
    setState("loading");
    setQuiz(false);
    setMsg("");
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    writer.current = HanziWriter.create(el, ch, {
      width: 150, height: 150, padding: 8, showOutline: true,
      strokeColor: dark ? "#e8eef0" : "#1e2a2f",
      outlineColor: dark ? "#3a474d" : "#d9d5cc",
      radicalColor: dark ? "#2dd4bf" : "#0f766e",
      drawingColor: dark ? "#fbbf24" : "#b45309",
      strokeAnimationSpeed: 1, delayBetweenStrokes: 250,
      charDataLoader: (c, done, fail) => {
        const get = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
        get(`${BASE}/hanzi/${encodeURIComponent(c)}.json`)
          .catch(() => get(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(c)}.json`))
          .then(done, fail);
      },
      onLoadCharDataSuccess: () => setState("ok"),
      onLoadCharDataError: () => setState("missing"),
    });
    return () => { el.innerHTML = ""; };
  }, [ch]);

  return (
    <div style={{ padding: 8, textAlign: "center" }}>
      <div ref={ref} style={{ width: 150, height: 150, touchAction: "none" }} />
      {state === "missing" && <div className="muted">Chưa có dữ liệu nét</div>}
      {state === "ok" && (
        <div className="row" style={{ justifyContent: "center", marginTop: 4 }}>
          <button onClick={() => { setQuiz(false); setMsg(""); writer.current?.cancelQuiz(); writer.current?.animateCharacter(); }}>
            Xem nét
          </button>
          <button
            onClick={() => {
              setQuiz(true);
              setMsg("");
              writer.current?.quiz({
                onComplete: (s) => { setQuiz(false); setMsg(s.totalMistakes ? `Xong, sai ${s.totalMistakes} nét` : "Chính xác!"); },
              });
            }}
          >
            {quiz ? "Viết lại" : "Tập viết"}
          </button>
        </div>
      )}
      <div className="muted" style={{ minHeight: "1.4em" }}>{msg}</div>
    </div>
  );
}
