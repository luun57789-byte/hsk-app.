"use client";
import { useEffect, useMemo, useState } from "react";
import { loadDict, search, type Entry } from "@/lib/dict";
import WordItem from "@/components/WordItem";
import HandwritingPad from "@/components/HandwritingPad";

export default function Home() {
  const [list, setList] = useState<Entry[] | null>(null);
  const [q, setQ] = useState("");
  const [pad, setPad] = useState(false);
  useEffect(() => {
    setQ(sessionStorage.getItem("q") || "");
    loadDict().then(setList);
  }, []);
  useEffect(() => { try { sessionStorage.setItem("q", q); } catch {} }, [q]);
  const results = useMemo(() => (list ? search(list, q) : []), [list, q]);

  return (
    <>
      <h1>Tra từ tiếng Trung</h1>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Gõ chữ Hán, pinyin, tiếng Việt hoặc tiếng Anh"
        aria-label="Ô tra từ"
        autoComplete="off"
      />
      <div className="row" style={{ marginTop: 8 }}>
        <button onClick={() => setPad(!pad)}>{pad ? "Ẩn ô viết tay" : "✍ Viết tay"}</button>
        {q && <button onClick={() => setQ("")}>Xóa</button>}
      </div>
      {pad && <HandwritingPad onPick={(ch) => setQ(q + ch)} />}
      {!list && <p className="muted">Đang tải từ điển…</p>}
      {list && !q && (
        <p className="muted">
          Từ điển có {list.length.toLocaleString("vi-VN")} từ thuộc HSK 2.0 và HSK 3.0. Ví dụ: 你好, nihao, xin chào, hello.
        </p>
      )}
      {list && q && results.length === 0 && <p className="muted">Không tìm thấy từ nào.</p>}
      <div className="list">{results.map((e) => <WordItem key={e.s} e={e} />)}</div>
    </>
  );
}
