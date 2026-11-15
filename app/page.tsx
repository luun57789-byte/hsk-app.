"use client";
import { useEffect, useMemo, useState } from "react";
import { loadDict, loadExtra, search, type Entry } from "@/lib/dict";
import WordItem from "@/components/WordItem";
import HandwritingPad from "@/components/HandwritingPad";
import PhotoLookup from "@/components/PhotoLookup";

export default function Home() {
  const [list, setList] = useState<Entry[] | null>(null);
  const [q, setQ] = useState("");
  const [extra, setExtra] = useState<Entry[]>([]);
  const [pad, setPad] = useState(false);
  useEffect(() => {
    setQ(sessionStorage.getItem("q") || "");
    loadDict().then(setList);
    loadExtra().then(setExtra).catch(() => {});
  }, []);
  useEffect(() => { try { sessionStorage.setItem("q", q); } catch {} }, [q]);
  const all = useMemo(() => (list ? [...list, ...extra] : []), [list, extra]);
  const results = useMemo(() => search(all, q, 60), [all, q]);

  return (
    <>
      <h1>Tra từ tiếng Trung</h1>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Gõ chữ Hán, pinyin hoặc tiếng Việt"
        aria-label="Ô tra từ"
        autoComplete="off"
      />
      <div className="row" style={{ marginTop: 8 }}>
        <button onClick={() => setPad(!pad)}>{pad ? "Ẩn ô viết tay" : "✍ Viết tay"}</button>
        <PhotoLookup onText={setQ} />
        {q && <button onClick={() => setQ("")}>Xóa</button>}
      </div>
      {pad && <HandwritingPad onPick={(ch) => setQ(q + ch)} />}
      {!list && <p className="muted">Đang tải từ điển…</p>}
      {list && !q && (
        <p className="muted">
          Từ điển có {(list.length + extra.length).toLocaleString("vi-VN")} từ, nghĩa tiếng Việt. Ví dụ: 你好, nihao, xin chào.
        </p>
      )}
      {list && q && results.length === 0 && <p className="muted">Không tìm thấy từ nào.</p>}
      {results.length > 0 && <div className="list card">{results.map((e) => <WordItem key={e.s} e={e} />)}</div>}
    </>
  );
}
