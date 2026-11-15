"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { BASE } from "@/lib/dict";
import Icon from "./Icon";
import Background from "./Background";

const tabs = [
  ["/", "Tra từ", "search"],
  ["/hsk/", "Lộ trình", "path"],
  ["/learn/", "Học", "book"],
  ["/flashcards/", "Bộ thẻ", "cards"],
  ["/practice/", "Luyện tập", "practice"],
];
/** Icon sidebar on wide screens, bottom bar on phones. */
export default function Tabs() {
  const path = usePathname();
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      navigator.serviceWorker.register(`${BASE}/sw.js`).catch(() => {});
  }, []);
  return (
    <nav className="tabs" aria-label="Điều hướng chính">
      <Link href="/" className="logo" aria-label="Trang chủ"><span className="han">学</span></Link>
      {tabs.map(([href, label, icon]) => {
        const on = href === "/" ? path === "/" || path.startsWith("/word") : path.startsWith(href.slice(0, -1)) || (href === "/learn/" && path.startsWith("/songs"));
        return (
          <Link key={href} href={href} className={on ? "on" : ""} title={label}>
            <Icon name={icon} />
            <span>{label}</span>
          </Link>
        );
      })}
      <Background />
    </nav>
  );
}
