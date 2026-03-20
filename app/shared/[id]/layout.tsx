import { Metadata } from 'next';

interface Props {
  params: { id: string };
  children: React.ReactNode;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://mystory-khaki.vercel.app';

  try {
    const res = await fetch(`${baseUrl}/api/shared/${params.id}`, { next: { revalidate: 60 } });
    const data = await res.json();

    if (data.error || !data.book) {
      return {
        title: '나의이야기',
        description: '당신의 삶이 한 권의 책이 됩니다',
      };
    }

    const { book, chapters = [] } = data;
    const written = (chapters as any[]).filter(
      (c) => (c.prose?.length > 0) || (c.messages?.some((m: any) => m.type === 'user'))
    );
    const chapterCount = written.length;
    const description = chapterCount > 0
      ? `${book.author}의 인생 이야기 · ${chapterCount}개의 챕터 · 나의이야기`
      : `${book.author}의 인생 이야기 · 나의이야기`;

    const ogUrl = `${baseUrl}/shared/${params.id}`;
    const defaultOgImage = `${baseUrl}/og-default.png`;

    // 대표사진이 있는 챕터의 첫 번째 사진을 OGP 이미지로 사용
    let ogImage = defaultOgImage;
    for (const ch of written) {
      const featuredPhoto = (ch.photos || []).find((p: any) => p.is_featured);
      const anyPhoto = (ch.photos || []).find((p: any) => p.url?.startsWith('http'));
      const photo = featuredPhoto || anyPhoto;
      if (photo?.url) {
        ogImage = photo.url;
        break;
      }
    }

    return {
      title: `${book.title} — ${book.author}`,
      description,
      openGraph: {
        title: book.title,
        description,
        type: 'book',
        url: ogUrl,
        siteName: '나의이야기',
        locale: 'ko_KR',
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: `${book.title} 표지`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: book.title,
        description,
        images: [ogImage],
      },
      alternates: {
        canonical: ogUrl,
      },
    };
  } catch {
    return {
      title: '나의이야기',
      description: '당신의 삶이 한 권의 책이 됩니다',
    };
  }
}

export default function SharedLayout({ children }: Props) {
  return <>{children}</>;
}
