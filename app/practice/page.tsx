"use client";
import { useEffect, useMemo, useState } from "react";
import { gloss, loadDict, speak, type Entry } from "@/lib/dict";
import { loadDeck } from "@/lib/store";
import Pronounce from "@/components/Pronounce";

type Mode = "listen" | "speak";
type Q = { e: Entry; kind: "meaning" | "word"; options: Entry[] };
const ROUND = 10;
const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

export default function Practice() {
  const [list, setList] = useState<Entry[] | null>(null);
  const [source, setSource] = useState("h1");
  const [mode, setMode] = useState<Mode | null>(null);
  const [qs, setQs] = useState<Q[]>([]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [points, setPoints] = useState<number[]>([]);
  const [voice, setVoice] = useState(true);
  useEffect(() => {
    loadDict().then(setList);
    if ("speechSynthesis" in window) {
      const check = () => {
        const v = window.speechSynthesis.getVoices();
        if (v.length) setVoice(v.some((x) => x.lang.toLowerCase().replace("_", "-").startsWith("zh")));
      };
      check();
      window.speechSynthesis.addEventListener("voiceschanged", check);
      return () => window.speechSynthesis.removeEventListener("voiceschanged", check);
    } else setVoice(false);
  }, []);
  const pool = useMemo(() => {
    if (!list) return [];
    if (source === "deck") {
      const d = loadDeck();
      return list.filter((e) => d[e.s]); // words from every deck
    }
    const lv = Number(source.slice(1));
    return list.filter((e) => e.h3 === lv);
  }, [list, source]);

  function start(m: Mode) {
    const chosen = shuffle(pool).slice(0, ROUND);
    setQs(
      chosen.map((e) => ({
        e,
        kind: Math.random() < 0.5 ? "meaning" : "word",
        options: shuffle([e, ...shuffle(pool.filter((x) => x.s !== e.s && gloss(x) !== gloss(e))).slice(0, 3)]),
      })),
    );
    setI(0); setPicked(null); setPoints([]); setMode(m);
    if (m === "listen" && chosen[0]) speak(chosen[0].s);
  }
  function next() {
    setPicked(null);
    setI(i + 1);
    if (mode === "listen" && qs[i + 1]) speak(qs[i + 1].e.s);
  }
  const q = qs[i];
  const done = mode && i >= qs.length;

  if (!list) return <p className="muted">Đang tải…</p>;
  if (!mode || done) {
    const total = points.reduce((a, b) => a + b, 0);
    return (
      <>
        <h1>Luyện tập</h1>
        {done && (
          <div className="card" style={{ marginBottom: 16 }}>
            <strong>Kết quả: </strong>
            {mode === "listen"
              ? `đúng ${total}/${qs.length} câu`
              : `điểm phát âm trung bình ${points.length ? Math.round(total / points.length) : 0}/100`}
          </div>
        )}
        <div className="card">
          <label>
            Chọn bộ từ:{" "}
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              {[1, 2, 3, 4, 5, 6, 7].map((l) => (
                <option key={l} value={`h${l}`}>HSK 3.0 cấp {l === 7 ? "7-9" : l}</option>
              ))}
              <option value="deck">Tất cả bộ thẻ của tôi</option>
            </select>
          </label>
          <div className="muted" style={{ margin: "6px 0 12px" }}>{pool.length} từ, mỗi lượt {ROUND} câu.</div>
          {pool.length < 4 ? (
            <div className="muted">Cần ít nhất 4 từ để luyện. Hãy thêm từ vào bộ thẻ hoặc chọn một cấp HSK.</div>
          ) : (
            <div className="row">
              <button className="primary" onClick={() => start("listen")}>🎧 Luyện nghe</button>
              <button className="primary" onClick={() => start("speak")}>🎤 Luyện phát âm</button>
            </div>
          )}
          {!voice && (
            <div className="muted" style={{ marginTop: 10 }}>
              Máy này chưa có giọng đọc tiếng Trung nên phần nghe có thể không phát ra tiếng. Hãy cài giọng tiếng Trung trong phần cài đặt của máy.
            </div>
          )}
        </div>
      </>
    );
  }
  return (
    <>
      <h1>{mode === "listen" ? "Luyện nghe" : "Luyện phát âm"}</h1>
      <div className="muted">Câu {i + 1}/{qs.length}</div>
      <div className="bar" style={{ margin: "6px 0 14px" }}><i style={{ width: `${(i / qs.length) * 100}%` }} /></div>
      {mode === "listen" ? (
        <div className="card">
          <div className="row">
            <button className="primary" onClick={() => speak(q.e.s)}>🔊 Nghe lại</button>
            <span className="muted">{q.kind === "meaning" ? "Chọn nghĩa của từ bạn nghe được" : "Chọn từ bạn nghe được"}</span>
          </div>
          <div className="opts">
            {q.options.map((o) => {
              const cls = picked ? (o.s === q.e.s ? "right" : o.s === picked ? "wrong" : "") : "";
              return (
                <button
                  key={o.s}
                  className={cls}
                  disabled={!!picked}
                  onClick={() => { setPicked(o.s); setPoints([...points, o.s === q.e.s ? 1 : 0]); }}
                >
                  {q.kind === "meaning" ? gloss(o) : <span className="han" style={{ fontSize: "1.4rem" }}>{o.s}</span>}
                </button>
              );
            })}
          </div>
          {picked && (
            <div style={{ marginTop: 12 }}>
              <div>
                {picked === q.e.s ? "✓ Đúng rồi! " : "✗ Chưa đúng. "}
                <span className="han" style={{ fontSize: "1.3rem" }}>{q.e.s}</span> {q.e.p} · {gloss(q.e)}
              </div>
              <p><button className="primary" onClick={next}>{i + 1 < qs.length ? "Câu tiếp" : "Xem kết quả"}</button></p>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center" }}>
          <div className="han big">{q.e.s}</div>
          <div style={{ color: "var(--accent)", fontSize: "1.2rem" }}>{q.e.p}</div>
          <p>{gloss(q.e)}</p>
          <p><button onClick={() => speak(q.e.s)}>🔊 Nghe mẫu</button></p>
          <Pronounce
            key={q.e.s}
            word={q.e.s}
            onScore={(s) => { const p = [...points]; p[i] = Math.max(p[i] || 0, s); setPoints(p); }}
          />
          <p>
            <button onClick={() => { if (points[i] === undefined) { const p = [...points]; p[i] = 0; setPoints(p); } next(); }}>
              {i + 1 < qs.length ? "Câu tiếp" : "Xem kết quả"}
            </button>
          </p>
        </div>
      )}
      <p><button onClick={() => setMode(null)}>Thoát</button></p>
    </>
  );
}
