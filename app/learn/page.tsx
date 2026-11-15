"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BASE, speak } from "@/lib/dict";
import Pinyin from "@/components/Pinyin";
import Icon from "@/components/Icon";

type Line = [zh: string, pinyin: string, vi: string, note?: string];
type Data = {
  grammar: { title: string; pattern: string; note: string; examples: Line[] }[];
  spoken: Line[];
  topics: { name: string; items: Line[] }[];
};
const TABS = [["grammar", "Ngữ pháp"], ["spoken", "Khẩu ngữ"], ["daily", "Giao tiếp hàng ngày"]] as const;

function Sentence({ x }: { x: Line }) {
  return (
    <div className="word-row">
      <div className="word-text" style={{ flex: 1 }}>
        <span className="han" style={{ fontSize: "1.2rem" }}>{x[0]}</span>
        <Pinyin text={x[1]} />
        <span className="mean">{x[2]}</span>
        {x[3] && <span className="muted" style={{ fontSize: "0.82rem" }}>Ghi chú: {x[3]}</span>}
      </div>
      <button className="icon-btn" onClick={() => speak(x[0])} aria-label={`Nghe: ${x[0]}`}><Icon name="sound" size={18} /></button>
    </div>
  );
}

export default function Learn() {
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("grammar");
  const [open, setOpen] = useState<number | null>(0);
  useEffect(() => {
    fetch(`${BASE}/data/learn.json`).then((r) => r.json()).then(setData);
    const t = new URLSearchParams(location.search).get("tab");
    if (t === "spoken" || t === "daily") setTab(t);
  }, []);
  return (
    <>
      <h1>Học</h1>
      <div className="levels" style={{ marginBottom: 16 }}>
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>
        ))}
        <Link href="/songs/" className="chip-link">🎵 Học qua bài hát</Link>
      </div>
      {!data && <p className="muted">Đang tải…</p>}
      {data && tab === "grammar" && (
        <div className="list">
          {data.grammar.map((g, i) => (
            <div key={g.title} className="card">
              <button className="plain spread" style={{ width: "100%" }} onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <span><strong>{i + 1}. {g.title}</strong></span>
                <span className="badge han">{g.pattern}</span>
              </button>
              {open === i && (
                <>
                  <p style={{ margin: "10px 0 4px" }}>{g.note}</p>
                  {g.examples.map((x) => <Sentence key={x[0]} x={x} />)}
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {data && tab === "spoken" && (
        <>
          <p className="muted">Những câu người Trung Quốc hay nói hằng ngày, ngắn và tự nhiên hơn sách giáo khoa.</p>
          <div className="list card">{data.spoken.map((x) => <Sentence key={x[0]} x={x} />)}</div>
        </>
      )}
      {data && tab === "daily" &&
        data.topics.map((t) => (
          <div key={t.name}>
            <h2>{t.name}</h2>
            <div className="list card">{t.items.map((x) => <Sentence key={x[0]} x={x} />)}</div>
          </div>
        ))}
    </>
  );
}
