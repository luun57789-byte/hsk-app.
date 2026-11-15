"use client";
import { useEffect, useState } from "react";
import { hanViet, loadHanViet } from "@/lib/hanviet";
import type { Entry } from "@/lib/dict";

/** Hán Việt reading of a word ("" until the table has loaded or when unknown). */
export function useHanViet(e: Pick<Entry, "t" | "p"> | null): string {
  const [table, setTable] = useState<Record<string, string> | null>(null);
  useEffect(() => { let live = true; loadHanViet().then((t) => live && setTable(t)); return () => { live = false; }; }, []);
  return e && table ? hanViet(e, table) : "";
}
