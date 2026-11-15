"use client";
import { useEffect, useRef, useState } from "react";
import { recognize, loadHw, type Pt } from "@/lib/hw";

export default function HandwritingPad({ onPick }: { onPick: (ch: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Pt[][]>([]);
  const drawing = useRef(false);
  const [cands, setCands] = useState<string[]>([]);

  useEffect(() => {
    loadHw();
    const c = ref.current!;
    const dpr = window.devicePixelRatio || 1;
    c.width = c.clientWidth * dpr;
    c.height = c.clientHeight * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    redraw();
  }, []);

  function redraw() {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const w = c.clientWidth, h = c.clientHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(128,128,128,0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = getComputedStyle(c).color;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of strokes.current) {
      ctx.beginPath();
      s.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
  }
  const pos = (e: React.PointerEvent): Pt => {
    const r = ref.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  async function update() {
    redraw();
    setCands(await recognize(strokes.current));
  }
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="muted" style={{ marginBottom: 8 }}>
        Viết một chữ Hán theo đúng thứ tự nét, rồi chọn chữ ở bên dưới.
      </div>
      <canvas
        ref={ref}
        className="pad"
        aria-label="Ô viết tay"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          strokes.current.push([pos(e)]);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          strokes.current[strokes.current.length - 1].push(pos(e));
          redraw();
        }}
        onPointerUp={() => {
          if (!drawing.current) return;
          drawing.current = false;
          update();
        }}
        onPointerCancel={() => { drawing.current = false; }}
      />
      <div className="row" style={{ marginTop: 8 }}>
        <button onClick={() => { strokes.current.pop(); update(); }}>Xóa nét cuối</button>
        <button onClick={() => { strokes.current = []; update(); }}>Xóa hết</button>
      </div>
      {cands.length > 0 && (
        <div className="row cands" style={{ marginTop: 10 }}>
          {cands.map((ch) => (
            <button key={ch} className="han" onClick={() => { onPick(ch); strokes.current = []; update(); }}>
              {ch}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
