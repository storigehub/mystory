'use client';

/**
 * PrintBook — PDF/인쇄 전용 레이아웃
 *
 * - 화면에서는 display:none (.print-book)
 * - @media print 시 표시
 * - prose 내 [PHOTO:id] 마커를 파싱해 인라인 배치
 * - 대표사진(isFeatured) 챕터 상단 풀폭 렌더
 * - CSS counter로 페이지 번호 자동 삽입
 */

import type { Chapter, Photo } from '@/lib/book-context';

interface PrintBookProps {
  title: string;
  author: string;
  chapters: Chapter[];
  coverGradient: string;
  coverTextColor: string;
}

const PHOTO_SPLIT = /(\[PHOTO:[a-z0-9]+\])/;
const PHOTO_MATCH = /\[PHOTO:([a-z0-9]+)\]/;

type TextSegment = { type: 'text'; content: string };
type PhotoSegment = { type: 'photo'; photo: Photo };
type Segment = TextSegment | PhotoSegment;

/** prose를 텍스트/사진 세그먼트 배열로 변환 */
function parseProse(prose: string, photos: Photo[]): Segment[] {
  const photoMap: Record<string, Photo> = {};
  photos.forEach((p) => { photoMap[p.id] = p; });

  const parts = prose.split(PHOTO_SPLIT);
  const segments: Segment[] = [];

  for (const part of parts) {
    const m = part.match(PHOTO_MATCH);
    if (m) {
      const photo = photoMap[m[1]];
      if (photo) segments.push({ type: 'photo', photo });
    } else if (part) {
      segments.push({ type: 'text', content: part });
    }
  }
  return segments;
}

/** 챕터 텍스트 추출 (chat 메시지 fallback) */
function getChapterBody(ch: Chapter): string {
  if (ch.prose?.length > 0) return ch.prose;
  return ch.messages.filter((m) => m.type === 'user').map((m) => m.text).join('\n\n');
}

export default function PrintBook({ title, author, chapters, coverGradient, coverTextColor }: PrintBookProps) {
  const writtenChapters = chapters.filter((c) => {
    const text = getChapterBody(c);
    const photos = c.photos || [];
    return text.trim().length > 0 || photos.length > 0;
  });

  return (
    <div className="print-book">
      <style>{`
        @media screen {
          .print-book { display: none !important; }
        }
        @media print {
          .flip-wrapper,
          .no-print { display: none !important; }
          .print-book { display: block !important; }

          body {
            font-family: 'Noto Serif KR', Georgia, serif;
            color: #3a2a1a;
            background: white;
          }

          @page {
            margin: 2.2cm 2.8cm 2.5cm;
            @bottom-center {
              content: counter(page);
              font-family: 'Noto Serif KR', Georgia, serif;
              font-size: 9pt;
              color: #b0986a;
              letter-spacing: 2px;
            }
          }
          /* 첫 페이지(표지)는 페이지 번호 숨김 */
          @page :first {
            @bottom-center { content: ''; }
          }

          /* 표지 */
          .print-cover {
            page-break-after: always;
            height: 100vh;
            display: flex !important;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          /* 목차 */
          .print-toc {
            page-break-after: always;
            padding-top: 48pt;
          }

          /* 챕터 */
          .print-chapter {
            page-break-before: always;
          }

          /* 대표사진 풀블리드 */
          .print-featured-photo {
            width: calc(100% + 5.6cm);
            margin-left: -2.8cm;
            max-height: 40vh;
            object-fit: cover;
            display: block;
            margin-bottom: 20pt;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          /* 인라인 사진 */
          .print-photo {
            width: 100%;
            max-height: 38vh;
            object-fit: cover;
            display: block;
            margin: 12pt 0 4pt;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .print-caption {
            font-size: 9pt;
            color: #8c7a6a;
            text-align: center;
            margin-bottom: 14pt;
            font-style: italic;
          }

          /* 챕터 헤더 */
          .print-chapter-num {
            font-size: 8pt;
            letter-spacing: 5px;
            color: #b0986a;
            margin-bottom: 6pt;
            text-align: center;
          }
          .print-chapter-title {
            font-size: 17pt;
            font-weight: 400;
            line-height: 1.4;
            margin-bottom: 12pt;
            text-align: center;
            letter-spacing: -0.02em;
          }
          .print-divider {
            width: 28pt;
            height: 0.5pt;
            background: #b0986a;
            margin: 0 auto 22pt;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          /* 본문 */
          .print-paragraph {
            font-size: 10.5pt;
            line-height: 2;
            margin-bottom: 0;
            text-align: justify;
            font-weight: 300;
            word-break: keep-all;
          }
          .print-paragraph + .print-paragraph {
            text-indent: 1em;
          }

          /* 목차 */
          .print-toc-label {
            font-size: 9pt;
            letter-spacing: 5px;
            color: #b0986a;
            text-align: center;
            display: block;
            margin-bottom: 20pt;
          }
          .print-toc-item {
            display: flex;
            align-items: baseline;
            gap: 8pt;
            padding: 6pt 0;
            border-bottom: 0.5pt solid #f0e8da;
          }
          .print-toc-num {
            font-size: 8pt;
            color: #b0986a;
            min-width: 22pt;
          }
          .print-toc-title {
            font-size: 11pt;
            flex: 1;
          }
        }
      `}</style>

      {/* ─── 표지 ─── */}
      <div className="print-cover" style={{ background: coverGradient, color: coverTextColor }}>
        <div style={{ width: 28, height: 1, background: coverTextColor, opacity: 0.3, margin: '0 auto 20px' }} />
        <h1 style={{ fontSize: 26, fontWeight: 300, letterSpacing: '-0.02em', marginBottom: 12, lineHeight: 1.3 }}>
          {title || '나의 이야기'}
        </h1>
        <p style={{ fontSize: 13, opacity: 0.65, fontWeight: 300 }}>{author || '저자'}</p>
        <p style={{ fontSize: 9, opacity: 0.3, marginTop: 24, letterSpacing: 4, fontFamily: 'sans-serif' }}>
          나의이야기 · {new Date().getFullYear()}
        </p>
      </div>

      {/* ─── 목차 ─── */}
      <div className="print-toc">
        <span className="print-toc-label">목  차</span>
        {writtenChapters.map((ch, i) => (
          <div key={ch.id} className="print-toc-item">
            <span className="print-toc-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="print-toc-title">{ch.title}</span>
          </div>
        ))}
      </div>

      {/* ─── 챕터 본문 ─── */}
      {writtenChapters.map((ch, i) => {
        const photos: Photo[] = ch.photos || [];
        const featured = photos.find((p) => p.isFeatured) ?? null;
        const bodyRaw = getChapterBody(ch);

        // prose가 있으면 [PHOTO:id] 마커 파싱해 인라인 배치
        // chat 모드 fallback이면 사진은 상단에 일괄 배치
        const hasProse = ch.prose?.length > 0;
        const segments: Segment[] = hasProse
          ? parseProse(bodyRaw, photos)
          : [{ type: 'text', content: bodyRaw }];

        // chat 모드: featured 제외한 나머지 사진을 본문 뒤에 배치
        const chatPhotos = hasProse ? [] : photos.filter((p) => p !== featured);

        return (
          <div key={ch.id} className="print-chapter">
            {/* 대표사진 */}
            {featured && (
              <>
                <img src={featured.data} alt={featured.caption || ''} className="print-featured-photo" />
                {featured.caption && <p className="print-caption">{featured.caption}</p>}
              </>
            )}

            {/* 챕터 헤더 */}
            <div style={{ textAlign: 'center', marginBottom: 20, marginTop: featured ? 8 : 0 }}>
              <p className="print-chapter-num">제 {String(i + 1).padStart(2, '0')} 장</p>
              <h2 className="print-chapter-title">{ch.title}</h2>
              <div className="print-divider" />
            </div>

            {/* 세그먼트 (텍스트 + 인라인 사진) */}
            {segments.map((seg, j) => {
              if (seg.type === 'photo') {
                // featured는 이미 상단에 표시했으므로 건너뜀
                if (seg.photo.id === featured?.id) return null;
                return (
                  <div key={j}>
                    <img src={seg.photo.data} alt={seg.photo.caption || ''} className="print-photo" />
                    {seg.photo.caption && <p className="print-caption">{seg.photo.caption}</p>}
                  </div>
                );
              }
              return seg.content
                .split('\n\n')
                .filter(Boolean)
                .map((para, k) => (
                  <p key={`${j}-${k}`} className="print-paragraph">{para}</p>
                ));
            })}

            {/* chat 모드: 추가 사진 (featured 제외) */}
            {chatPhotos.map((photo, j) => (
              <div key={`cp-${j}`}>
                <img src={photo.data} alt={photo.caption || ''} className="print-photo" />
                {photo.caption && <p className="print-caption">{photo.caption}</p>}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
