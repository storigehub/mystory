'use client';

/**
 * PrintBook — 관리자 PDF 출력 전용 레이아웃
 *
 * - 화면에서는 display:none (CSS: .print-book)
 * - @media print 시 표시
 * - 각 챕터는 page-break-before: always 로 새 페이지 시작
 * - 판형은 부모에서 동적으로 <style> 태그를 주입해 @page size를 설정
 */

import type { Chapter } from '@/lib/book-context';
import { getChapterText, getChapterPhotos } from './FlipBook';

interface PrintBookProps {
  title: string;
  author: string;
  chapters: Chapter[];
  coverGradient: string;
  coverTextColor: string;
}

export default function PrintBook({
  title,
  author,
  chapters,
  coverGradient,
  coverTextColor,
}: PrintBookProps) {
  const writtenChapters = chapters.filter(
    (c) => getChapterText(c).length > 0 || getChapterPhotos(c).length > 0
  );

  return (
    <div className="print-book">
      {/* ── 전역 프린트 스타일 ── */}
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

          /* 기본 페이지 여백 (판형 @page size는 JS로 주입) */
          @page {
            margin: 2cm 2.5cm;
          }

          /* 표지: 1페이지 전체 */
          .print-cover {
            page-break-after: always;
            height: 100vh;
            display: flex !important;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          }

          /* 목차: 1페이지 전체 */
          .print-toc {
            page-break-after: always;
            min-height: 60vh;
          }

          /* 챕터: 각각 새 페이지 */
          .print-chapter {
            page-break-before: always;
          }

          /* 이미지 */
          .print-photo {
            width: 100%;
            max-height: 45vh;
            object-fit: cover;
            display: block;
            margin-bottom: 1.5em;
          }

          /* 사진 캡션 */
          .print-caption {
            font-size: 9pt;
            color: #8c7a6a;
            text-align: center;
            margin-top: -1em;
            margin-bottom: 1.5em;
            font-style: italic;
          }

          /* 챕터 헤더 */
          .print-chapter-num {
            font-size: 9pt;
            letter-spacing: 4px;
            color: #b0986a;
            margin-bottom: 6pt;
          }
          .print-chapter-title {
            font-size: 16pt;
            font-weight: 400;
            line-height: 1.4;
            margin-bottom: 12pt;
          }
          .print-divider {
            width: 32pt;
            height: 0.5pt;
            background: #b0986a;
            margin: 0 auto 20pt;
          }

          /* 본문 */
          .print-paragraph {
            font-size: 11pt;
            line-height: 1.9;
            margin-bottom: 10pt;
            text-align: justify;
            font-weight: 300;
          }

          /* 목차 항목 */
          .print-toc-item {
            display: flex;
            align-items: baseline;
            gap: 8pt;
            padding: 7pt 0;
            border-bottom: 0.5pt solid #f0e8da;
          }
          .print-toc-num {
            font-size: 9pt;
            color: #b0986a;
            min-width: 22pt;
          }
          .print-toc-title {
            font-size: 12pt;
            flex: 1;
          }
        }
      `}</style>

      {/* ─── 표지 ─── */}
      <div
        className="print-cover"
        style={{ background: coverGradient, color: coverTextColor }}
      >
        <div
          style={{
            width: 32,
            height: 1,
            background: coverTextColor,
            opacity: 0.25,
            margin: '0 auto 24px',
          }}
        />
        <h1
          style={{
            fontSize: 28,
            fontWeight: 300,
            letterSpacing: '-0.02em',
            marginBottom: 12,
            lineHeight: 1.3,
          }}
        >
          {title || '나의 이야기'}
        </h1>
        <p style={{ fontSize: 14, opacity: 0.65, fontWeight: 300 }}>
          {author || '저자'}
        </p>
        <p
          style={{
            fontSize: 10,
            opacity: 0.3,
            marginTop: 24,
            letterSpacing: 4,
            fontFamily: 'sans-serif',
          }}
        >
          나의이야기 · {new Date().getFullYear()}
        </p>
      </div>

      {/* ─── 목차 ─── */}
      <div className="print-toc" style={{ paddingTop: 48 }}>
        <p
          className="print-chapter-num"
          style={{ textAlign: 'center', marginBottom: 24, display: 'block' }}
        >
          목차
        </p>
        {chapters.map((ch, i) => (
          <div key={ch.id} className="print-toc-item">
            <span className="print-toc-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="print-toc-title">{ch.title}</span>
          </div>
        ))}
      </div>

      {/* ─── 챕터 본문 ─── */}
      {writtenChapters.map((ch, i) => {
        const text = getChapterText(ch);
        const photos = getChapterPhotos(ch);

        return (
          <div key={ch.id} className="print-chapter">
            {/* 챕터 헤더 */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <p className="print-chapter-num">제 {String(i + 1).padStart(2, '0')} 장</p>
              <h2 className="print-chapter-title">{ch.title}</h2>
              <div className="print-divider" />
            </div>

            {/* 사진 */}
            {photos.map((photo, j) => (
              <div key={j}>
                <img
                  src={photo.data}
                  alt={photo.caption || ''}
                  className="print-photo"
                />
                {photo.caption && (
                  <p className="print-caption">{photo.caption}</p>
                )}
              </div>
            ))}

            {/* 본문 */}
            {text
              .split('\n\n')
              .filter(Boolean)
              .map((para, j) => (
                <p key={j} className="print-paragraph">
                  {para}
                </p>
              ))}
          </div>
        );
      })}
    </div>
  );
}
