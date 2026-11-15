"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { examplesFor, type Example, getWord, loadDict, loadExtra, levelLabel, speak, type Entry } from "@/lib/dict";
import { addCards, loadDeck, removeCard } from "@/lib/store";
import StrokeOrder from "@/components/StrokeOrder";
import WordItem from "@/components/WordItem";
import Pronounce from "@/components/Pronounce";
import Pinyin from "@/components/Pinyin";
import Icon from "@/components/Icon";

function Word() {
  const w = useSearchParams().get("w") || "";
  const [e, setE] = useState<Entry | null | undefined>(undefined);
  const [related, setRelated] = useState<Entry[]>([]);
  const [saved, setSaved] = useState(false);
  const [examples, setExamples] = useState<Example[]>([]);
  useEffect(() => {
    let live = true;
    setE(undefined);
    getWord(w).then((x) => live && setE(x ?? null));
    setExamples([]);
    examplesFor(w).then((x) => live && setExamples(x));
    Promise.all([loadDict(), loadExtra().catch(() => [] as Entry[])]).then(([a, b]) => {
      if (!live) return;
      const rel = a.filter((x) => x.s !== w && x.s.includes(w)).slice(0, 12);
      setRelated(rel.length >= 12 ? rel : [...rel, ...b.filter((x) => x.s !== w && x.s.includes(w)).slice(0, 12 - rel.length)]);
    });
    setSaved(!!loadDeck()[w]);
    return () => { live = false; };
  }, [w]);
  if (e === undefined) return <p className="muted">Đang tải…</p>;
  const chars = [...w].filter((c) => /[㐀-鿿]/.test(c));
  return (
    <>
      <p><Link href="/" className="row" style={{ gap: 4 }}><Icon name="back" size={16} /> Tra từ</Link></p>
      <div className="card">
        <div className="han big">{w}</div>
        {e ? (
          <>
            {e.t !== e.s && <div className="muted han">Phồn thể: {e.t}</div>}
            <div className="row" style={{ margin: "6px 0" }}>
              <Pinyin text={e.p} className="pin-lg" />
              <button onClick={() => speak(w)} aria-label="Nghe phát âm"><Icon name="sound" size={16} /> Nghe</button>
            </div>
            <div>{levelLabel(e).map((l) => <span key={l} className="badge">{l}</span>)}{e.pos && <span className="badge">{e.pos}</span>}</div>
            {e.vi && <p style={{ fontSize: "1.1rem", margin: "10px 0 4px" }}>{e.vi}</p>}
            <ol style={{ margin: "8px 0", paddingLeft: 20 }}>
              {e.m.map((m, i) => <li key={i}>{m}</li>)}
            </ol>
            {e.en.length > 0 && <div className="muted">Tiếng Anh: {e.en.join("; ")}</div>}
            <div className="row" style={{ marginTop: 10 }}>
              {saved ? (
                <button onClick={() => { removeCard(w); setSaved(false); }}>✓ Đã lưu vào bộ thẻ (bỏ lưu)</button>
              ) : (
                <button className="primary" onClick={() => { addCards([w]); setSaved(true); }}>+ Lưu vào bộ thẻ</button>
              )}
            </div>
          </>
        ) : (
          <p className="muted">Từ này chưa có trong từ điển. Bạn vẫn xem được thứ tự nét bên dưới.</p>
        )}
      </div>
      {examples.length > 0 && (
        <>
          <h2>Câu ví dụ</h2>
          <div className="list">
            {examples.map((x) => (
              <div key={x[0]} className="card">
                <div className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
                  <span className="han" style={{ fontSize: "1.2rem" }}>{x[0]}</span>
                  <button className="icon-btn" onClick={() => speak(x[0])} aria-label="Nghe câu ví dụ"><Icon name="sound" size={18} /></button>
                </div>
                <Pinyin text={x[1]} />
                <div className="muted">{x[2]}</div>
              </div>
            ))}
          </div>
        </>
      )}
      {chars.length > 0 && (
        <>
          <h2>Luyện phát âm</h2>
          <div className="card"><Pronounce word={w} /></div>
          <h2>Thứ tự nét</h2>
          <div className="strokes">{chars.map((c, i) => <div key={c + i}><StrokeOrder ch={c} /></div>)}</div>
        </>
      )}
      {related.length > 0 && (
        <>
          <h2>Từ có chứa “{w}”</h2>
          <div className="list card">{related.map((r) => <WordItem key={r.s} e={r} />)}</div>
        </>
      )}
    </>
  );
}
export default function Page() {
  return <Suspense fallback={<p className="muted">Đang tải…</p>}><Word /></Suspense>;
}
