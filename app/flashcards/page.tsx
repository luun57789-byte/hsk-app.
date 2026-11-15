"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { loadDict, speak, type Entry } from "@/lib/dict";
import { dueWords, loadDeck, review, Rating, type Deck } from "@/lib/store";

export default function Flashcards() {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [dict, setDict] = useState<Map<string, Entry>>(new Map());
  const [show, setShow] = useState(false);
  useEffect(() => {
    setDeck(loadDeck());
    loadDict().then((l) => setDict(new Map(l.map((e) => [e.s, e]))));
  }, []);
  if (!deck) return <p className="muted">Đang tải…</p>;
  const total = Object.keys(deck).length;
  const due = dueWords(deck);
  const w = due[0];
  const e = w ? dict.get(w) : undefined;
  const grade = (g: Rating.Again | Rating.Hard | Rating.Good | Rating.Easy) => {
    setDeck(review(w, g));
    setShow(false);
  };
  return (
    <>
      <h1>Flashcard</h1>
      <p className="muted">Tổng {total} thẻ · cần ôn bây giờ {due.length}</p>
      {total === 0 && (
        <div className="card">
          Bạn chưa có thẻ nào. Vào <Link href="/hsk/">Lộ trình HSK</Link> để thêm từ theo cấp, hoặc lưu từ khi tra từ điển.
        </div>
      )}
      {total > 0 && !w && <div className="card">Bạn đã ôn xong hết thẻ đến hạn. Hẹn gặp lại sau!</div>}
      {w && (
        <div className="card flash">
          <div className="han big">{w}</div>
          {!show ? (
            <p><button className="primary" onClick={() => { setShow(true); speak(w); }}>Xem đáp án</button></p>
          ) : (
            <>
              <div style={{ fontSize: "1.2rem", color: "var(--accent)" }}>{e?.p}</div>
              <p>{e?.vi || e?.m.slice(0, 3).join("; ")}</p>
              <p><Link href={`/word/?w=${encodeURIComponent(w)}`}>Xem chi tiết và thứ tự nét</Link></p>
              <div className="grades">
                <button onClick={() => grade(Rating.Again)}>Quên</button>
                <button onClick={() => grade(Rating.Hard)}>Khó</button>
                <button onClick={() => grade(Rating.Good)}>Nhớ</button>
                <button onClick={() => grade(Rating.Easy)}>Dễ</button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
