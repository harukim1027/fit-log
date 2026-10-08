import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "하루일지",
  description: "설정 항목부터 내가 만드는 운동 기록",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
