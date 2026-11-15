"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { gloss, speak } from "@/lib/dict";
import { makeAnnotator, parseLyrics, type Annotator, type Token } from "@/lib/annotate";
import Pinyin from "@/components/Pinyin";
import Icon from "@/components/Icon";

type Song = { id: string; title: string; text: string };
const KEY = "hsk-songs-v1";
const load = (): Song[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const save = (s: Song[]) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };

export default function Songs() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [form, setForm] = useState<Song | null>(null);
  const [annotate, setAnnotate] = useState<Annotator | null>(null);
  useEffect(() => { setSongs(load()); makeAnnotator().then((a) => setAnnotate(() => a)); }, []);
  const song = songs.find((s) => s.id === current);

  function submit() {
    if (!form || !form.text.trim()) return;
    const item = { ...form, title: form.title.trim() || "Bài hát chưa đặt tên" };
    const next = songs.some((s) => s.id === item.id) ? songs.map((s) => (s.id === item.id ? item : s)) : [...songs, item];
    save(next); setSongs(next); setForm(null); setCurrent(item.id);
  }
  if (form)
    return (
      <>
        <h1>{songs.some((s) => s.id === form.id) ? "Sửa bài hát" : "Thêm bài hát"}</h1>
        <form className="card" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Tên bài hát, ví dụ: 冬眠 (Đông Miên)" aria-label="Tên bài hát" style={{ borderRadius: 14 }} />
          <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} rows={12}
            placeholder={"Dán lời bài hát tiếng Trung vào đây, mỗi câu một dòng.\n\nNếu lời có mốc thời gian dạng [00:12.50] (tệp .lrc), chữ sẽ chạy khớp với nhạc."}
            aria-label="Lời bài hát" />
          <div className="muted" style={{ margin: "8px 0" }}>
            Lời bài hát chỉ lưu trên máy này của bạn. Web sẽ tự thêm pinyin và cho bạn bấm vào từng từ để xem nghĩa.
          </div>
          <div className="row">
            <button className="primary" type="submit" disabled={!form.text.trim()}>Lưu</button>
            <button type="button" className="ghost" onClick={() => setForm(null)}>Hủy</button>
          </div>
        </form>
      </>
    );
  if (song)
    return (
      <>
        <p><button className="plain row" style={{ gap: 4, color: "var(--accent)" }} onClick={() => setCurrent(null)}><Icon name="back" size={16} /> Danh sách bài hát</button></p>
        <div className="card spread" style={{ marginBottom: 16 }}>
          <h1 style={{ margin: 0 }} className="han">{song.title}</h1>
          <div className="row">
            <button onClick={() => setForm(song)}>Sửa lời</button>
            <button className="ghost" onClick={() => { const next = songs.filter((s) => s.id !== song.id); save(next); setSongs(next); setCurrent(null); }}>Xóa</button>
          </div>
        </div>
        {annotate ? <Karaoke key={song.id + song.text.length} song={song} annotate={annotate} /> : <p className="muted">Đang tải từ điển để thêm pinyin…</p>}
      </>
    );
  return (
    <>
      <p><Link href="/learn/" className="row" style={{ gap: 4 }}><Icon name="back" size={16} /> Học</Link></p>
      <h1>Học qua bài hát</h1>
      <div className="card">
        <p style={{ marginTop: 0 }}>
          Dán lời bài hát tiếng Trung bạn thích. Web tự thêm pinyin, cho bạn bấm vào từng từ để xem nghĩa tiếng Việt, và chạy chữ kiểu karaoke.
        </p>
        <button className="primary" onClick={() => setForm({ id: "s" + Date.now().toString(36), title: "", text: "" })}>+ Thêm bài hát</button>
      </div>
      {songs.length > 0 && (
        <div className="list card">
          {songs.map((s) => (
            <div key={s.id} className="word-row">
              <button className="plain word-main" onClick={() => setCurrent(s.id)}>
                <span className="han" style={{ fontSize: "1.15rem" }}>{s.title}</span>
                <span className="muted">{parseLyrics(s.text).length} dòng</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Karaoke({ song, annotate }: { song: Song; annotate: Annotator }) {
  const lines = useMemo(() => parseLyrics(song.text).map((l) => ({ ...l, tokens: annotate(l.text) })), [song.text, annotate]);
  const timed = lines.length > 0 && lines[0].time !== null;
  const [showPinyin, setShowPinyin] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<"auto" | "voice">("auto");
  const [secs, setSecs] = useState(4);
  const [pos, setPos] = useState(0); // seconds since start (timed) or line index + fraction (untimed)
  const [audio, setAudio] = useState<string | null>(null);
  const [picked, setPicked] = useState<Token | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const posRef = useRef(0);
  posRef.current = pos;

  // which line is active, and how far through it we are (0..1)
  let active = -1, frac = 0;
  if (timed) {
    for (let i = 0; i < lines.length; i++) if (lines[i].time! <= pos) active = i;
    if (active >= 0) {
      const end = active + 1 < lines.length ? lines[active + 1].time! : lines[active].time! + 5;
      frac = Math.min(1, (pos - lines[active].time!) / Math.max(0.5, end - lines[active].time!));
    }
  } else if (playing || pos > 0) {
    active = Math.min(lines.length - 1, Math.floor(pos));
    frac = mode === "voice" ? 1 : pos - Math.floor(pos);
  }

  useEffect(() => {
    if (!playing) return;
    if (!timed && mode === "voice") return; // driven by speech, below
    const started = performance.now(), from = posRef.current;
    const id = setInterval(() => {
      const el = audioRef.current;
      if (timed && audio && el) { setPos(el.currentTime); if (el.ended) setPlaying(false); return; }
      const dt = (performance.now() - started) / 1000;
      const next = timed ? from + dt : from + dt / secs;
      const limit = timed ? lines[lines.length - 1].time! + 6 : lines.length;
      if (next >= limit) { setPos(timed ? limit : lines.length - 0.001); setPlaying(false); } else setPos(next);
    }, 100);
    return () => clearInterval(id);
  }, [playing, timed, mode, secs, audio, lines]);

  // voice mode: the device reads each line aloud, then moves on
  useEffect(() => {
    if (!playing || timed || mode !== "voice" || !("speechSynthesis" in window)) return;
    let stop = false;
    const say = (i: number) => {
      if (stop) return;
      if (i >= lines.length) { setPlaying(false); return; }
      setPos(i);
      const u = new SpeechSynthesisUtterance(lines[i].text);
      u.lang = "zh-CN"; u.rate = 0.8;
      u.onend = () => say(i + 1);
      u.onerror = () => { if (!stop) setPlaying(false); };
      window.speechSynthesis.speak(u);
    };
    window.speechSynthesis.cancel();
    say(Math.floor(posRef.current));
    return () => { stop = true; window.speechSynthesis.cancel(); };
  }, [playing, timed, mode, lines]);

  useEffect(() => { rowRefs.current[active]?.scrollIntoView({ block: "center", behavior: "smooth" }); }, [active]);
  useEffect(() => () => { if (audio) URL.revokeObjectURL(audio); }, [audio]);

  function toggle() {
    const el = audioRef.current;
    if (timed && audio && el) { if (playing) el.pause(); else el.play(); }
    if (!playing && !timed && pos >= lines.length - 0.01) setPos(0);
    setPlaying(!playing);
  }
  function jump(i: number) {
    const to = timed ? lines[i].time! : i;
    setPos(to);
    if (timed && audio && audioRef.current) audioRef.current.currentTime = to;
  }
  function reset() {
    setPlaying(false); setPos(0);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
  }
  const hanCount = (t: Token[]) => t.reduce((n, x) => n + (x.pinyin ? [...x.text].length : 0), 0);

  return (
    <>
      <div className="card player">
        <div className="row">
          <button className="primary" onClick={toggle}>{playing ? "⏸ Tạm dừng" : "▶ Chạy karaoke"}</button>
          <button onClick={reset}>Về đầu</button>
          <label className="row" style={{ gap: 4 }}>
            <input type="checkbox" checked={showPinyin} onChange={(e) => setShowPinyin(e.target.checked)} /> Hiện pinyin
          </label>
          {!timed && (
            <>
              <select value={mode} onChange={(e) => { setPlaying(false); setMode(e.target.value as "auto" | "voice"); }} aria-label="Kiểu chạy chữ">
                <option value="auto">Tự chạy theo thời gian</option>
                <option value="voice">Máy đọc từng câu</option>
              </select>
              {mode === "auto" && (
                <select value={secs} onChange={(e) => setSecs(Number(e.target.value))} aria-label="Tốc độ">
                  {[2, 3, 4, 5, 6, 8].map((s) => <option key={s} value={s}>{s} giây mỗi câu</option>)}
                </select>
              )}
            </>
          )}
        </div>
        {timed ? (
          <div style={{ marginTop: 10 }}>
            <label className="muted">
              Lời có mốc thời gian. Chọn tệp nhạc trong máy để chữ chạy khớp với nhạc (không bắt buộc):{" "}
              <input type="file" accept="audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { reset(); setAudio(URL.createObjectURL(f)); } }} />
            </label>
            {audio && <audio ref={audioRef} src={audio} controls style={{ width: "100%", marginTop: 8 }}
              onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onSeeked={(e) => setPos(e.currentTarget.currentTime)} />}
          </div>
        ) : (
          <div className="muted" style={{ marginTop: 8 }}>
            Bật bài hát ở ứng dụng nghe nhạc của bạn rồi bấm "Chạy karaoke", hoặc bấm vào một câu để nhảy tới câu đó.
          </div>
        )}
      </div>
      {picked && (
        <div className="card popover word-pop" role="dialog" aria-label="Nghĩa của từ">
          <div className="spread">
            <span><span className="han" style={{ fontSize: "1.5rem" }}>{picked.text}</span> <Pinyin text={picked.pinyin} /></span>
            <button className="ghost" onClick={() => setPicked(null)}>Đóng</button>
          </div>
          <div>{picked.entry ? gloss(picked.entry) : "Chưa có nghĩa trong từ điển."}</div>
          <div className="row" style={{ marginTop: 8 }}>
            <button onClick={() => speak(picked.text)}><Icon name="sound" size={16} /> Nghe</button>
            {picked.entry && <Link href={`/word/?w=${encodeURIComponent(picked.entry.s)}`}>Xem chi tiết</Link>}
          </div>
        </div>
      )}
      <div className="card lyrics">
        {lines.map((l, i) => {
          const total = hanCount(l.tokens) || 1;
          let seen = 0;
          return (
            <div key={i} ref={(el) => { rowRefs.current[i] = el; }} className={`lyric ${i === active ? "now" : i < active ? "past" : ""}`} onClick={() => jump(i)}>
              {l.tokens.map((t, k) => {
                if (!t.pinyin) return <span key={k} className="han">{t.text}</span>;
                const sung = i < active || (i === active && seen / total < frac);
                seen += [...t.text].length;
                return (
                  <ruby key={k} className={`han ${sung ? "sung" : ""}`} onClick={(e) => { e.stopPropagation(); setPicked(t); }}>
                    {t.text}
                    <rt>{showPinyin ? t.pinyin.replace(/\s+/g, "") : ""}</rt>
                  </ruby>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}
