"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

const KEY = "hsk-bg-v1";

/** Lets each person pick their own background picture. It is stored only in their browser. */
export default function Background() {
  const input = useRef<HTMLInputElement>(null);
  const [bg, setBg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => { try { setBg(localStorage.getItem(KEY)); } catch {} }, []);
  useEffect(() => {
    const b = document.body;
    if (bg) {
      b.style.backgroundImage = `linear-gradient(var(--veil), var(--veil)), url("${bg}")`;
      b.style.backgroundSize = "cover";
      b.style.backgroundPosition = "center";
    } else {
      b.style.backgroundImage = "";
      b.style.backgroundSize = "";
      b.style.backgroundPosition = "";
    }
  }, [bg]);

  async function pick(file: File) {
    setMsg("");
    try {
      // shrink the picture so it fits in browser storage
      const img = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      const data = c.toDataURL("image/jpeg", 0.8);
      localStorage.setItem(KEY, data);
      setBg(data);
      setOpen(false);
    } catch {
      setMsg("Không dùng được ảnh này, hãy thử ảnh khác.");
    } finally {
      if (input.current) input.current.value = "";
    }
  }
  return (
    <>
      <button className="nav-btn" onClick={() => setOpen(!open)} title="Ảnh nền" aria-expanded={open}>
        <Icon name="image" />
        <span>Ảnh nền</span>
      </button>
      {open && (
        <div className="card popover" role="dialog" aria-label="Ảnh nền">
          <strong>Ảnh nền của bạn</strong>
          <div className="muted" style={{ margin: "4px 0 10px" }}>
            Chọn một ảnh trong máy để làm nền. Ảnh chỉ lưu trên máy này của bạn.
          </div>
          <input ref={input} type="file" accept="image/*" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }} />
          <div className="row">
            <button className="primary" onClick={() => input.current?.click()}>Chọn ảnh</button>
            {bg && (
              <button onClick={() => { try { localStorage.removeItem(KEY); } catch {} setBg(null); setOpen(false); }}>
                Dùng nền mặc định
              </button>
            )}
            <button className="ghost" onClick={() => setOpen(false)}>Đóng</button>
          </div>
          {msg && <div className="muted" style={{ marginTop: 6 }}>{msg}</div>}
        </div>
      )}
    </>
  );
}
