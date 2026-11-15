"use client";
import { useEffect, useState } from "react";
import { listenOnce, loadReadings, recognitionSupported, scorePronunciation, type Mark } from "@/lib/pron";

type Result = { score: number; marks: Mark[]; heard: string };

export default function Pronounce({ word, onScore }: { word: string; onScore?: (score: number) => void }) {
  const [supported, setSupported] = useState(true);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { setSupported(recognitionSupported()); loadReadings(); }, []);
  useEffect(() => { setRes(null); setErr(""); }, [word]);

  async function go() {
    setBusy(true); setErr(""); setRes(null);
    try {
      const [alts, readings] = await Promise.all([listenOnce(), loadReadings()]);
      // keep the alternative that matches the target best
      let best: Result | null = null;
      for (const heard of alts) {
        const r = scorePronunciation(word, heard, readings);
        if (!best || r.score > best.score) best = { ...r, heard };
      }
      setRes(best);
      if (best) onScore?.(best.score);
    } catch (e: any) {
      const code = String(e?.message || "");
      setErr(
        code === "not-allowed" || code === "service-not-allowed"
          ? "Bạn cần cho phép trang web dùng micro."
          : code === "no-speech" || code === "aborted"
            ? "Chưa nghe thấy gì. Hãy bấm lại và đọc to, rõ."
            : code === "network"
              ? "Cần có mạng để chấm phát âm."
              : "Không chấm được lần này, hãy thử lại.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!supported)
    return <div className="muted">Trình duyệt này chưa hỗ trợ chấm phát âm. Hãy dùng Chrome, Edge hoặc Safari.</div>;
  const verdict = (s: number) => (s >= 90 ? "Rất tốt!" : s >= 70 ? "Khá tốt" : s >= 40 ? "Cần luyện thêm" : "Chưa đúng, thử lại nhé");
  return (
    <div>
      <button className="primary" onClick={go} disabled={busy}>
        {busy ? "Đang nghe… hãy đọc to" : "🎤 Chấm phát âm"}
      </button>
      {err && <div className="muted" style={{ marginTop: 6 }}>{err}</div>}
      {res && (
        <div style={{ marginTop: 8 }}>
          <div>
            <strong style={{ fontSize: "1.4rem" }}>{res.score}</strong>/100 · {verdict(res.score)}
          </div>
          <div className="han" style={{ fontSize: "1.6rem" }}>
            {res.marks.map((m, i) => (
              <span key={i} className={`mark-${m.level}`}>{m.ch}</span>
            ))}
          </div>
          <div className="muted">
            Máy nghe được: <span className="han">{res.heard || "(không rõ)"}</span>
            {res.marks.some((m) => m.level === "tone") && " · chữ màu cam: sai thanh điệu"}
            {res.marks.some((m) => m.level === "no") && " · chữ màu đỏ: chưa đúng"}
          </div>
        </div>
      )}
    </div>
  );
}
