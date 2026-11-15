"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { applyNotes, getWord, gloss, loadDict, loadExtra, plain, speak, type Entry } from "@/lib/dict";
import {
  activeId, addCards, createList, deleteList, dueWords, loadDeck, loadLists, loadNotes, removeCard, renameList,
  review, saveNote, setActive, Rating, type Deck, type WordList,
} from "@/lib/store";
import { hanViet, loadHanViet } from "@/lib/hanviet";
import WordItem from "@/components/WordItem";
import Pinyin from "@/components/Pinyin";
import Icon from "@/components/Icon";

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;

export default function Decks() {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [lists, setLists] = useState<WordList[]>([]);
  const [current, setCurrent] = useState("");
  const [dict, setDict] = useState<Map<string, Entry>>(new Map());
  const [hv, setHv] = useState<Record<string, string>>({});
  const [show, setShow] = useState(false);
  const [filter, setFilter] = useState("");
  const [naming, setNaming] = useState<"new" | "rename" | null>(null);
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [adding, setAdding] = useState("");
  const [addMsg, setAddMsg] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ p: "", vi: "" });
  const [, bump] = useState(0);

  useEffect(() => {
    setDeck(loadDeck());
    setLists(loadLists());
    setCurrent(activeId());
    loadHanViet().then(setHv);
    loadDict().then((l) => {
      setDict(new Map(l.map((e) => [e.s, e])));
      const all = loadLists().flatMap((x) => x.words);
      if (all.some((w) => !l.some((e) => e.s === w)))
        loadExtra().then((x) => setDict(new Map([...l, ...x].map((e) => [e.s, e])))).catch(() => {});
    });
  }, []);
  const list = lists.find((l) => l.id === current) ?? lists[0];
  const words = useMemo(
    () => (list ? list.words.map((w) => dict.get(w)).filter((e): e is Entry => !!e) : []),
    [list, dict],
  );
  const shown = useMemo(() => {
    const f = plain(filter.trim());
    if (!f) return words;
    const key = f.replace(/[^a-z]/g, "");
    return words.filter((e) => e.s.includes(filter.trim()) || (key && e.key.includes(key)) || plain(gloss(e)).includes(f) || e.pm.includes(f));
  }, [words, filter]);
  if (!deck || !list) return <p className="muted">Đang tải…</p>;

  const total = list.words.length;
  const learned = list.words.filter((w) => deck[w]?.reps > 0).length;
  const pct = total ? Math.round((learned / total) * 100) : 0;
  const due = dueWords(deck, list.words);
  const w = due[0];
  const e = w ? dict.get(w) : undefined;
  const choose = (id: string) => { setActive(id); setCurrent(id); setShow(false); setFilter(""); setConfirmDelete(false); setNaming(null); };
  const grade = (g: Rating.Again | Rating.Hard | Rating.Good | Rating.Easy) => { setDeck(review(w, g)); setShow(false); };
  const rows = () =>
    words.map((x) => [x.s, x.p, gloss(x), x.pos, hanViet(x, hv), x.h3 ? `HSK ${x.h3 === 7 ? "7-9" : x.h3}` : ""]);
  const fileName = list.name.replace(/[\\/:*?"<>|]/g, "").trim() || "bo-the";

  function submitName() {
    if (naming === "new") { const next = createList(name); setLists(next); setCurrent(next[next.length - 1].id); }
    else if (naming === "rename") setLists(renameList(list.id, name));
    setNaming(null); setName("");
  }
  async function addWord() {
    const text = adding.trim();
    if (!text) return;
    const found = await getWord(text);
    if (!found) { setAddMsg(`Không tìm thấy “${text}” trong từ điển. Hãy gõ đúng chữ Hán của từ.`); return; }
    setDeck(addCards([found.s], list.id));
    setLists(loadLists());
    setDict((d) => new Map(d).set(found.s, found));
    setAdding(""); setAddMsg("");
  }
  function saveEdit(word: string) {
    applyNotes(saveNote(word, draft));
    setEditing(null);
    bump((n) => n + 1);
  }

  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <div className="levels">
          {lists.map((l) => (
            <button key={l.id} className={l.id === list.id ? "on" : ""} onClick={() => choose(l.id)}>
              {l.name} <span className="muted">{l.words.length}</span>
            </button>
          ))}
          <button onClick={() => { setNaming("new"); setName(""); }}>+ Bộ thẻ mới</button>
        </div>
      </div>
      {naming && (
        <form className="card row" style={{ marginBottom: 12 }} onSubmit={(ev) => { ev.preventDefault(); submitName(); }}>
          <input type="text" autoFocus value={name} onChange={(ev) => setName(ev.target.value)}
            placeholder={naming === "new" ? "Tên bộ thẻ mới, ví dụ: Bài 3 đi du lịch" : "Tên mới của bộ thẻ"}
            aria-label="Tên bộ thẻ" style={{ maxWidth: 360, padding: "9px 16px", fontSize: "0.95rem" }} />
          <button className="primary" type="submit">Lưu</button>
          <button type="button" className="ghost" onClick={() => setNaming(null)}>Hủy</button>
        </form>
      )}
      <div className="card spread" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>
            {list.name}{" "}
            <button className="icon-btn" onClick={() => { setNaming("rename"); setName(list.name); }} aria-label="Đổi tên bộ thẻ">
              <Icon name="edit" size={18} />
            </button>
          </h1>
          <div className="muted">{total} từ · cần ôn bây giờ {due.length}</div>
        </div>
        <div className="row">
          {total > 0 && (
            <>
              <button className="dl" onClick={() => download(`${fileName}.txt`, rows().map((r) => r.slice(0, 3).join("\t")).join("\n"), "text/plain;charset=utf-8")}>
                <Icon name="download" size={16} /> Xuất TXT
              </button>
              <button className="dl" onClick={() => download(`${fileName}.csv`,
                "﻿" + [["Chữ Hán", "Pinyin", "Nghĩa", "Từ loại", "Hán Việt", "Cấp"], ...rows()].map((r) => r.map(csvCell).join(",")).join("\r\n"),
                "text/csv;charset=utf-8")}>
                <Icon name="download" size={16} /> Excel
              </button>
            </>
          )}
          {confirmDelete ? (
            <>
              <button className="ghost" style={{ color: "var(--bad)" }} onClick={() => { const next = deleteList(list.id); setLists(next); setDeck(loadDeck()); choose(next[0].id); }}>
                Xóa thật
              </button>
              <button className="ghost" onClick={() => setConfirmDelete(false)}>Hủy</button>
            </>
          ) : (
            <button className="ghost" onClick={() => setConfirmDelete(true)}>Xóa bộ thẻ</button>
          )}
        </div>
      </div>
      {total > 0 && (
        <div className="card flash">
          {!w ? (
            <p>Bạn đã ôn xong hết thẻ đến hạn của bộ này. Hẹn gặp lại sau!</p>
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
      <div className="card" style={{ marginTop: 16 }}>
        <div className="spread">
          <strong>Từ trong bộ thẻ</strong>
          <span className="muted">Đã học <strong>{pct}%</strong></span>
        </div>
        <div className="bar" style={{ margin: "10px 0 14px" }}><i style={{ width: `${pct}%` }} /></div>
        <form className="row" onSubmit={(ev) => { ev.preventDefault(); addWord(); }}>
          <input type="text" value={adding} onChange={(ev) => { setAdding(ev.target.value); setAddMsg(""); }}
            placeholder="Thêm từ: gõ chữ Hán, ví dụ 旅游" aria-label="Thêm từ vào bộ thẻ"
            style={{ maxWidth: 280, padding: "9px 16px", fontSize: "0.95rem" }} />
          <button className="primary" type="submit" disabled={!adding.trim()}>+ Thêm</button>
          {total > 0 && (
            <>
              <input type="text" value={filter} onChange={(ev) => setFilter(ev.target.value)}
                placeholder="Lọc theo chữ Hán / pinyin / nghĩa" aria-label="Lọc từ trong bộ thẻ"
                style={{ maxWidth: 280, padding: "9px 16px", fontSize: "0.95rem" }} />
              <span className="muted">{shown.length}/{words.length} từ</span>
            </>
          )}
        </form>
        {addMsg && <div className="muted" style={{ marginTop: 6 }}>{addMsg}</div>}
        {total === 0 && (
          <p className="muted">
            Bộ thẻ này chưa có từ nào. Thêm từ ở ô trên, vào <Link href="/hsk/">Lộ trình</Link> để thêm theo cấp HSK, hoặc lưu từ khi tra từ điển.
          </p>
        )}
        <div className="list">
          {shown.map((x) =>
            editing === x.s ? (
              <form key={x.s} className="word-row" style={{ flexWrap: "wrap" }} onSubmit={(ev) => { ev.preventDefault(); saveEdit(x.s); }}>
                <span className="han word-han">{x.s}</span>
                <input type="text" value={draft.p} onChange={(ev) => setDraft({ ...draft, p: ev.target.value })}
                  placeholder={x.o?.p || x.p} aria-label="Pinyin" style={{ maxWidth: 160, padding: "8px 14px", fontSize: "0.95rem" }} />
                <input type="text" value={draft.vi} onChange={(ev) => setDraft({ ...draft, vi: ev.target.value })}
                  placeholder="Nghĩa của riêng bạn" aria-label="Nghĩa" style={{ flex: 1, minWidth: 180, padding: "8px 14px", fontSize: "0.95rem" }} />
                <button className="primary" type="submit">Lưu</button>
                <button type="button" className="ghost" onClick={() => setEditing(null)}>Hủy</button>
                <div className="muted" style={{ flexBasis: "100%" }}>Để trống rồi bấm Lưu để dùng lại pinyin và nghĩa của từ điển.</div>
              </form>
            ) : (
              <WordItem
                key={x.s}
                e={x}
                actions={
                  <>
                    <button className="ghost edit" onClick={() => { setEditing(x.s); setDraft({ p: x.o ? x.p : "", vi: x.o && x.vi !== x.o.vi ? x.vi || "" : "" }); }}>Sửa</button>
                    <button className="ghost" onClick={() => { setDeck(removeCard(x.s, list.id)); setLists(loadLists()); }} aria-label={`Xóa ${x.s} khỏi bộ thẻ`}>Xóa</button>
                  </>
                }
              />
            ),
          )}
        </div>
      </div>
    </>
  );
}
