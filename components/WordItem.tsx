"use client";
import Link from "next/link";
import { gloss, speak, type Entry } from "@/lib/dict";
import Pinyin from "./Pinyin";
import Icon from "./Icon";

/** One word row: characters, tone-coloured pinyin, meaning, word type, HSK level, listen button. */
export default function WordItem({ e, actions }: { e: Entry; actions?: React.ReactNode }) {
  return (
    <div className="word-row">
      <Link href={`/word/?w=${encodeURIComponent(e.s)}`} className="word-main">
        <span className="han word-han">{e.s}</span>
        <span className="word-text">
          <Pinyin text={e.p} />
          <span className="mean">
            {gloss(e)}
            {e.pos && <span className={`tag tag-${e.pos === "động từ" ? "v" : e.pos === "danh từ" ? "n" : "o"}`}>{e.pos}</span>}
            {e.h3 > 0 && <span className="lvl">· HSK {e.h3 === 7 ? "7-9" : e.h3}</span>}
          </span>
        </span>
      </Link>
      <span className="word-actions">
        <button className="icon-btn" onClick={() => speak(e.s)} aria-label={`Nghe ${e.s}`}><Icon name="sound" size={18} /></button>
        {actions}
      </span>
    </div>
  );
}
