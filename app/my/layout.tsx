import type { Metadata } from "next";

const BASE_URL = process.env.NEXTAUTH_URL || 'https://mystory-khaki.vercel.app';

export const metadata: Metadata = {
  title: "내 책 보관함 — 나의이야기",
  description: "내가 쓴 자서전을 한곳에서 확인하고 이어서 작성하세요.",
  openGraph: {
    title: "내 책 보관함 — 나의이야기",
    description: "내가 쓴 자서전을 한곳에서 확인하고 이어서 작성하세요.",
    url: `${BASE_URL}/my`,
    siteName: "나의이야기",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "https://images.pexels.com/photos/7363991/pexels-photo-7363991.jpeg?auto=compress&cs=tinysrgb&w=1200",
        width: 1200,
        height: 800,
        alt: "나의이야기 — 내 책 보관함",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "내 책 보관함 — 나의이야기",
    description: "내가 쓴 자서전을 한곳에서 확인하고 이어서 작성하세요.",
    images: ["https://images.pexels.com/photos/7363991/pexels-photo-7363991.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  },
};

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
