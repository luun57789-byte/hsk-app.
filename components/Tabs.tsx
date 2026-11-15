"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { BASE } from "@/lib/dict";

const tabs = [
  ["/", "Tra từ"],
  ["/hsk/", "Lộ trình HSK"],
  ["/flashcards/", "Flashcard"],
];
export default function Tabs() {
  const path = usePathname();
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      navigator.serviceWorker.register(`${BASE}/sw.js`).catch(() => {});
  }, []);
  return (
    <nav className="tabs">
      {tabs.map(([href, label]) => {
        const on = href === "/" ? path === "/" || path.startsWith("/word") : path.startsWith(href.slice(0, -1));
        return (
          <Link key={href} href={href} className={on ? "on" : ""}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
