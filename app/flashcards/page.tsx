"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { gloss, loadDict, loadExtra, plain, speak, type Entry } from "@/lib/dict";
import { dueWords, loadDeck, removeCard, review, Rating, type Deck } from "@/lib/store";
import WordItem from "@/components/WordItem";
import Pinyin from "@/components/Pinyin";
import Icon from "@/components/Icon";

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;

export default function Flashcards() {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [dict, setDict] = useState<Map<string, Entry>>(new Map());
  const [show, setShow] = useState(false);
  const [filter, setFilter] = useState("");
  useEffect(() => {
    setDeck(loadDeck());
    loadDict().then((l) => {
      setDict(new Map(l.map((e) => [e.s, e])));
      const d = loadDeck();
      if (Object.keys(d).some((w) => !l.some((e) => e.s === w)))
        loadExtra().then((x) => setDict(new Map([...l, ...x].map((e) => [e.s, e])))).catch(() => {});
    });
  }, []);
  const words = useMemo(
    () => (deck ? Object.keys(deck).map((w) => dict.get(w)).filter((e): e is Entry => !!e) : []),
    [deck, dict],
  );
  const shown = useMemo(() => {
    const f = plain(filter.trim());
    if (!f) return words;
    const key = f.replace(/[^a-z]/g, "");
    return words.filter((e) => e.s.includes(filter.trim()) || (key && e.key.includes(key)) || e.pm.includes(f));
  }, [words, filter]);
  if (!deck) return <p className="muted">Đang tải…</p>;
  const total = Object.keys(deck).length;
  const learned = Object.values(deck).filter((c) => c.reps > 0).length;
  const pct = total ? Math.round((learned / total) * 100) : 0;
  const due = dueWords(deck);
  const w = due[0];
  const e = w ? dict.get(w) : undefined;
  const grade = (g: Rating.Again | Rating.Hard | Rating.Good | Rating.Easy) => {
    setDeck(review(w, g));
    setShow(false);
  };
  const rows = () => words.map((x) => [x.s, x.p, gloss(x), x.pos, x.h3 ? `HSK ${x.h3 === 7 ? "7-9" : x.h3}` : ""]);
  return (
    <>
      <div className="card spread" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Bộ thẻ của tôi</h1>
          <div className="muted">{total} từ · cần ôn bây giờ {due.length}</div>
        </div>
        {total > 0 && (
          <div className="row">
            <button className="dl" onClick={() => download("bo-the-hsk.txt", rows().map((r) => r.slice(0, 3).join("\t")).join("\n"), "text/plain;charset=utf-8")}>
              <Icon name="download" size={16} /> Xuất TXT
            </button>
            <button
              className="dl"
              onClick={() =>
                download(
                  "bo-the-hsk.csv",
                  "﻿" + [["Chữ Hán", "Pinyin", "Nghĩa", "Từ loại", "Cấp"], ...rows()].map((r) => r.map(csvCell).join(",")).join("\r\n"),
                  "text/csv;charset=utf-8",
                )
              }
            >
              <Icon name="download" size={16} /> Excel
            </button>
          </div>
        )}
      </div>
      {total === 0 && (
        <div className="card">
          Bạn chưa có thẻ nào. Vào <Link href="/hsk/">Lộ trình</Link> để thêm từ theo cấp HSK, hoặc lưu từ khi tra từ điển.
        </div>
      )}
      {total > 0 && (
        <div className="card flash">
          {!w ? (
            <p>Bạn đã ôn xong hết thẻ đến hạn. Hẹn gặp lại sau!</p>
          ) : (
            <>
              <div className="muted">Ôn tập</div>
              <div className="han big">{w}</div>
              {!show ? (
                <p><button className="primary" onClick={() => { setShow(true); speak(w); }}>Xem đáp án</button></p>
              ) : (
                <>
                  {e && <Pinyin text={e.p} className="pin-lg" />}
                  <p>{e ? gloss(e) : ""}</p>
                  <p><Link href={`/word/?w=${encodeURIComponent(w)}`}>Xem chi tiết và thứ tự nét</Link></p>
                  <div className="grades">
                    <button onClick={() => grade(Rating.Again)}>Quên</button>
                    <button onClick={() => grade(Rating.Hard)}>Khó</button>
                    <button onClick={() => grade(Rating.Good)}>Nhớ</button>
                    <button onClick={() => grade(Rating.Easy)}>Dễ</button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
      {total > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="spread">
            <strong>Từ trong bộ thẻ</strong>
            <span className="muted">Đã học <strong>{pct}%</strong></span>
          </div>
          <div className="bar" style={{ margin: "10px 0 14px" }}><i style={{ width: `${pct}%` }} /></div>
          <div className="row">
            <input
              type="text"
              value={filter}
              onChange={(ev) => setFilter(ev.target.value)}
              placeholder="Lọc theo chữ Hán / pinyin / nghĩa"
              aria-label="Lọc từ trong bộ thẻ"
              style={{ maxWidth: 320, padding: "9px 16px", fontSize: "0.95rem" }}
            />
            <span className="muted">{shown.length}/{words.length} từ</span>
          </div>
          <div className="list">
            {shown.map((x) => (
              <WordItem
                key={x.s}
                e={x}
                actions={<button className="ghost" onClick={() => setDeck(removeCard(x.s))} aria-label={`Xóa ${x.s} khỏi bộ thẻ`}>Xóa</button>}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
