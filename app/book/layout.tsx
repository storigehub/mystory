import type { Metadata } from "next";

const BASE_URL = process.env.NEXTAUTH_URL || 'https://mystory-khaki.vercel.app';

export const metadata: Metadata = {
  title: "책 미리보기 — 나의이야기",
  description: "완성된 자서전을 책처럼 넘겨보고, 가족과 공유하세요.",
  openGraph: {
    title: "책 미리보기 — 나의이야기",
    description: "완성된 자서전을 책처럼 넘겨보고, 가족과 공유하세요.",
    url: `${BASE_URL}/book`,
    siteName: "나의이야기",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "https://images.pexels.com/photos/7363991/pexels-photo-7363991.jpeg?auto=compress&cs=tinysrgb&w=1200",
        width: 1200,
        height: 800,
        alt: "나의이야기 — 책 미리보기",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "책 미리보기 — 나의이야기",
    description: "완성된 자서전을 책처럼 넘겨보고, 가족과 공유하세요.",
    images: ["https://images.pexels.com/photos/7363991/pexels-photo-7363991.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  },
};

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
