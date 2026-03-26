import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

const BASE_URL = process.env.NEXTAUTH_URL || 'https://mystory-khaki.vercel.app';

export const metadata: Metadata = {
  title: "나의이야기 — 당신의 인생을 한 권의 책으로",
  description: "AI 인터뷰를 통해 어르신의 인생 이야기를 자서전으로 완성하는 서비스",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: "나의이야기 — 당신의 인생을 한 권의 책으로",
    description: "AI와 대화하듯 말하면, AI가 당신의 이야기를 아름다운 한 권의 책으로 완성합니다.",
    url: BASE_URL,
    siteName: "나의이야기",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "https://images.pexels.com/photos/7363991/pexels-photo-7363991.jpeg?auto=compress&cs=tinysrgb&w=1200",
        width: 1200,
        height: 800,
        alt: "나의이야기 — AI 자서전 제작 서비스",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "나의이야기 — 당신의 인생을 한 권의 책으로",
    description: "AI와 대화하듯 말하면, AI가 당신의 이야기를 아름다운 한 권의 책으로 완성합니다.",
    images: ["https://images.pexels.com/photos/7363991/pexels-photo-7363991.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
