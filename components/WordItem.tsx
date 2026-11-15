import Link from "next/link";
import { gloss, type Entry } from "@/lib/dict";

export default function WordItem({ e }: { e: Entry }) {
  return (
    <Link href={`/word/?w=${encodeURIComponent(e.s)}`} className="card item">
      <span className="han">{e.s}</span>
      <span style={{ minWidth: 0 }}>
        <span className="pin">{e.p}</span>{" "}
        {e.h3 > 0 && <span className="badge">HSK {e.h3 === 7 ? "7-9" : e.h3}</span>}
        <span className="mean">{gloss(e)}</span>
      </span>
    </Link>
  );
}
