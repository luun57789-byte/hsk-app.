"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { loadDict, levelLabel, speak, type Entry } from "@/lib/dict";
import { addCards, loadDeck, removeCard } from "@/lib/store";
import StrokeOrder from "@/components/StrokeOrder";
import WordItem from "@/components/WordItem";

function Word() {
  const w = useSearchParams().get("w") || "";
  const [e, setE] = useState<Entry | null | undefined>(undefined);
  const [related, setRelated] = useState<Entry[]>([]);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    loadDict().then((list) => {
      setE(list.find((x) => x.s === w) ?? null);
      setRelated(list.filter((x) => x.s !== w && x.s.includes(w)).slice(0, 12));
    });
    setSaved(!!loadDeck()[w]);
  }, [w]);
  if (e === undefined) return <p className="muted">Đang tải…</p>;
  const chars = [...w].filter((c) => /[㐀-鿿]/.test(c));
  return (
    <>
      <p><Link href="/">← Tra từ</Link></p>
      <div className="card">
        <div className="han big">{w}</div>
        {e ? (
          <>
            {e.t !== e.s && <div className="muted han">Phồn thể: {e.t}</div>}
            <div className="row" style={{ margin: "6px 0" }}>
              <span style={{ fontSize: "1.2rem", color: "var(--accent)" }}>{e.p}</span>
              <button onClick={() => speak(w)} aria-label="Nghe phát âm">🔊 Nghe</button>
            </div>
            <div>{levelLabel(e).map((l) => <span key={l} className="badge">{l}</span>)}</div>
            {e.vi && <p style={{ fontSize: "1.1rem", margin: "10px 0 4px" }}>{e.vi}</p>}
            <ol style={{ margin: "8px 0", paddingLeft: 20 }} className={e.vi ? "muted" : ""}>
              {e.m.map((m, i) => <li key={i}>{m}</li>)}
            </ol>
            {!e.vi && <div className="muted">Nghĩa tiếng Việt cho từ này đang được biên soạn.</div>}
            <div className="row" style={{ marginTop: 10 }}>
              {saved ? (
                <button onClick={() => { removeCard(w); setSaved(false); }}>✓ Đã lưu vào flashcard (bỏ lưu)</button>
              ) : (
                <button className="primary" onClick={() => { addCards([w]); setSaved(true); }}>+ Lưu vào flashcard</button>
              )}
            </div>
          </>
        ) : (
          <p className="muted">Từ này chưa có trong từ điển. Bạn vẫn xem được thứ tự nét bên dưới.</p>
        )}
      </div>
      {chars.length > 0 && (
        <>
          <h2>Thứ tự nét</h2>
          <div className="strokes">{chars.map((c, i) => <div key={c + i}><StrokeOrder ch={c} /></div>)}</div>
        </>
      )}
      {related.length > 0 && (
        <>
          <h2>Từ có chứa “{w}”</h2>
          <div className="list">{related.map((r) => <WordItem key={r.s} e={r} />)}</div>
        </>
      )}
    </>
  );
}
export default function Page() {
  return <Suspense fallback={<p className="muted">Đang tải…</p>}><Word /></Suspense>;
}
