import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "./globals.css";

export const metadata: Metadata = {
  title: "Medical Agent - 医疗智能助手",
  description: "基于 RAG 的医疗健康问答助手",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full">
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
