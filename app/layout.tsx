import type { Metadata, Viewport } from "next";
import "./globals.css";
import Tabs from "@/components/Tabs";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const metadata: Metadata = {
  title: "Học tiếng Trung HSK",
  description: "Từ điển, thứ tự nét, lộ trình HSK 3.0 và flashcard",
  manifest: `${base}/manifest.webmanifest`,
  icons: { icon: `${base}/icon.svg`, apple: `${base}/icon.svg` },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#5b4bc4" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <main>{children}</main>
        <Tabs />
      </body>
    </html>
  );
}
