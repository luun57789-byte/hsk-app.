"use client";
import { useEffect, useMemo, useState } from "react";
import { loadDict, type Entry } from "@/lib/dict";
import { addCards, loadDeck, type Deck } from "@/lib/store";
import WordItem from "@/components/WordItem";

const L3 = [1, 2, 3, 4, 5, 6, 7];
const L2 = [1, 2, 3, 4, 5, 6];

export default function Hsk() {
  const [list, setList] = useState<Entry[] | null>(null);
  const [std, setStd] = useState<3 | 2>(3);
  const [lv, setLv] = useState(1);
  const [deck, setDeck] = useState<Deck>({});
  const [shown, setShown] = useState(60);
  useEffect(() => { loadDict().then(setList); setDeck(loadDeck()); }, []);
  const words = useMemo(
    () => (list ? list.filter((e) => (std === 3 ? e.h3 : e.h2) === lv) : []),
    [list, std, lv],
  );
  const inDeck = words.filter((e) => deck[e.s]).length;
  const learned = words.filter((e) => deck[e.s] && deck[e.s].reps > 0).length;
  const pick = (s: 3 | 2, l: number) => { setStd(s); setLv(l); setShown(60); };

  return (
    <>
      <h1>Lộ trình HSK</h1>
      <div className="muted">HSK 3.0 (chuẩn mới, 9 cấp)</div>
      <div className="levels" style={{ margin: "6px 0 12px" }}>
        {L3.map((l) => (
          <button key={l} className={std === 3 && lv === l ? "on" : ""} onClick={() => pick(3, l)}>
            Cấp {l === 7 ? "7-9" : l}
          </button>
        ))}
      </div>
      <div className="muted">HSK 2.0 (chuẩn cũ, 6 cấp)</div>
      <div className="levels" style={{ margin: "6px 0 16px" }}>
        {L2.map((l) => (
          <button key={l} className={std === 2 && lv === l ? "on" : ""} onClick={() => pick(2, l)}>
            Cấp {l}
          </button>
        ))}
      </div>
      {!list ? (
        <p className="muted">Đang tải…</p>
      ) : (
        <>
          <div className="card">
            <strong>{words.length.toLocaleString("vi-VN")} từ</strong>
            <span className="muted"> · đã học {learned} · trong flashcard {inDeck}</span>
            <div className="bar" style={{ margin: "8px 0" }}>
              <i style={{ width: `${words.length ? (learned / words.length) * 100 : 0}%` }} />
            </div>
            <div className="row">
              <button
                className="primary"
                disabled={inDeck === words.length}
                onClick={() => {
                  const next = words.filter((e) => !deck[e.s]).slice(0, 20).map((e) => e.s);
                  setDeck(addCards(next));
                }}
              >
                + Thêm 20 từ tiếp theo vào flashcard
              </button>
            </div>
          </div>
          <div className="list">{words.slice(0, shown).map((e) => <WordItem key={e.s} e={e} />)}</div>
          {shown < words.length && (
            <p><button onClick={() => setShown(shown + 100)}>Xem thêm</button></p>
          )}
        </>
      )}
    </>
  );
}
