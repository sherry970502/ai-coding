import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "造物工坊 · 把想法直接变成产品",
  description: "不懂技术也能做产品：与 AI 产品经理对话，确认方案与视觉，坐等成品，点选即改。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
