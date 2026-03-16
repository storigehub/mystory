'use client';

import React, { useRef, useState, useCallback, forwardRef } from 'react';
import dynamic from 'next/dynamic';
import type { Chapter } from '@/lib/book-context';
import { TOKENS } from '@/lib/design-tokens';

/* ─────────────────────────────────────────────────────────────
   react-pageflip은 document/window를 사용하므로 SSR 비활성화
───────────────────────────────────────────────────────────────── */
const HTMLFlipBook = dynamic(
  () => import('react-pageflip').then((mod) => mod.default as any),
  { ssr: false }
) as any;

/* ─── 타입 ─── */
interface CoverTemplate {
  gradient: string;
  textColor: string;
  accentOpacity: number;
}

interface FlipBookProps {
  title: string;
  author: string;
  chapters: Chapter[];
  coverTemplate: CoverTemplate;
  fontPreset: { book: string | number; lineHeight: number };
  onCoverChange: () => void;
}

/* ─── 페이지 유틸 ─── */
export function getChapterText(chapter: Chapter): string {
  if (chapter.prose?.length > 0) return chapter.prose;
  return chapter.messages
    .filter((m) => m.type === 'user')
    .map((m) => m.text)
    .join('\n\n');
}

export function getChapterPhotos(chapter: Chapter) {
  const chatPhotos = chapter.messages
    .filter((m) => m.type === 'photo' && m.text)
    .map((m) => ({ data: m.text, caption: '' }));
  const directPhotos = (chapter.photos || []).map((p) => ({
    data: p.data,
    caption: p.caption || '',
  }));
  return [...chatPhotos, ...directPhotos];
}

/* ─────────────────────────────────────────────────────────────
   ForwardRef 페이지 컴포넌트
   react-pageflip은 자식에 ref를 전달받아야 함
───────────────────────────────────────────────────────────────── */
const FlipPage = forwardRef<HTMLDivElement, { children?: React.ReactNode; className?: string }>(
  ({ children, className = '' }, ref) => (
    <div
      ref={ref}
      className={className}
      style={{
        background: '#fffdf7',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
        position: 'relative',
        fontFamily: "'Noto Serif KR', Georgia, serif",
      }}
    >
      {children}
    </div>
  )
);
FlipPage.displayName = 'FlipPage';

/* ─────────────────────────────────────────────────────────────
   페이지 콘텐츠 컴포넌트들
───────────────────────────────────────────────────────────────── */

/** 표지 페이지 */
const CoverContent = forwardRef<HTMLDivElement, {
  title: string;
  author: string;
  template: CoverTemplate;
  onCoverChange: () => void;
}>(({ title, author, template, onCoverChange }, ref) => (
  <div
    ref={ref}
    style={{
      width: '100%',
      height: '100%',
      background: template.gradient,
      color: template.textColor,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 28px',
      boxSizing: 'border-box',
      position: 'relative',
      fontFamily: "'Noto Serif KR', Georgia, serif",
    }}
  >
    <div
      style={{
        width: 32,
        height: 1,
        background: template.textColor,
        opacity: template.accentOpacity,
        marginBottom: 24,
      }}
    />
    <h1
      style={{
        fontSize: 22,
        fontWeight: 300,
        letterSpacing: '-0.02em',
        textAlign: 'center',
        lineHeight: 1.4,
        marginBottom: 12,
      }}
    >
      {title || '나의 이야기'}
    </h1>
    <p style={{ fontSize: 13, opacity: 0.65, fontWeight: 300 }}>
      {author || '저자'}
    </p>
    <p
      style={{
        fontSize: 10,
        opacity: 0.3,
        marginTop: 24,
        letterSpacing: 3,
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
    >
      나의이야기 · {new Date().getFullYear()}
    </p>

    {/* 표지 색상 변경 버튼 */}
    <button
      onClick={(e) => { e.stopPropagation(); onCoverChange(); }}
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        background: 'rgba(255,255,255,0.15)',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: 20,
        padding: '6px 12px',
        fontSize: 11,
        color: template.textColor,
        cursor: 'pointer',
        fontFamily: "'Noto Sans KR', sans-serif",
        opacity: 0.8,
      }}
      title="표지 색상 변경"
    >
      🎨 표지
    </button>
  </div>
));
CoverContent.displayName = 'CoverContent';

/** 속표지 (공백) */
const BlankContent = forwardRef<HTMLDivElement, Record<string, never>>(
  (_, ref) => (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: '100%',
        background: '#faf8f4',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: 20,
        boxSizing: 'border-box',
      }}
    >
      <span style={{ fontSize: 10, color: '#c8b8a0', letterSpacing: 2 }}>나의이야기</span>
    </div>
  )
);
BlankContent.displayName = 'BlankContent';

/** 목차 페이지 */
const TocContent = forwardRef<HTMLDivElement, {
  chapters: Chapter[];
  pageNum: number;
}>(({ chapters, pageNum }, ref) => (
  <div
    ref={ref}
    style={{
      width: '100%',
      height: '100%',
      background: '#fffdf7',
      padding: '32px 24px 24px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Noto Serif KR', Georgia, serif",
    }}
  >
    <p
      style={{
        fontSize: 10,
        color: '#b0986a',
        letterSpacing: 4,
        textAlign: 'center',
        fontFamily: "'Noto Sans KR', sans-serif",
        marginBottom: 20,
      }}
    >
      목차
    </p>
    <div style={{ flex: 1, overflowY: 'hidden' }}>
      {chapters.map((ch, i) => (
        <div
          key={ch.id}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            padding: '7px 0',
            borderBottom: '1px solid #f0e8da',
          }}
        >
          <span
            style={{
              fontSize: 9,
              color: '#b0986a',
              fontFamily: "'Noto Sans KR', sans-serif",
              minWidth: 22,
            }}
          >
            {String(i + 1).padStart(2, '0')}
          </span>
          <span style={{ flex: 1, fontSize: 12, color: '#3a2a1a', lineHeight: 1.4 }}>
            {ch.title}
          </span>
          {ch.done && (
            <span style={{ fontSize: 9, color: '#7c9a6a' }}>✓</span>
          )}
        </div>
      ))}
    </div>
    <PageFooter pageNum={pageNum} />
  </div>
));
TocContent.displayName = 'TocContent';

/** 챕터 페이지 */
const ChapterContent = forwardRef<HTMLDivElement, {
  chapter: Chapter;
  chapterNum: number;
  pageNum: number;
  fontSize: string | number;
  lineHeight: number;
}>(({ chapter, chapterNum, pageNum, fontSize, lineHeight }, ref) => {
  const text = getChapterText(chapter);
  const photos = getChapterPhotos(chapter);
  const firstPhoto = photos[0];

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: '100%',
        background: '#fffdf7',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        fontFamily: "'Noto Serif KR', Georgia, serif",
        overflow: 'hidden',
      }}
    >
      {/* 사진 있는 경우: 상단 40% */}
      {firstPhoto && (
        <div style={{ height: '40%', flexShrink: 0, overflow: 'hidden' }}>
          <img
            src={firstPhoto.data}
            alt={firstPhoto.caption || ''}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
      )}

      {/* 텍스트 영역 */}
      <div
        style={{
          flex: 1,
          padding: firstPhoto ? '16px 20px 20px' : '28px 20px 20px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 챕터 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: firstPhoto ? 10 : 16, flexShrink: 0 }}>
          <p
            style={{
              fontSize: 9,
              color: '#b0986a',
              letterSpacing: 3,
              fontFamily: "'Noto Sans KR', sans-serif",
              marginBottom: 4,
            }}
          >
            제 {String(chapterNum).padStart(2, '0')} 장
          </p>
          <h2
            style={{
              fontSize: firstPhoto ? 13 : 15,
              fontWeight: 400,
              color: '#3a2a1a',
              lineHeight: 1.4,
            }}
          >
            {chapter.title}
          </h2>
          <div
            style={{
              width: 24,
              height: 1,
              background: '#b0986a',
              margin: '8px auto 0',
              opacity: 0.5,
            }}
          />
        </div>

        {/* 본문 텍스트 (말줄임표 처리) */}
        {text && (
          <div
            style={{
              flex: 1,
              overflow: 'hidden',
              maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
            }}
          >
            {text
              .split('\n\n')
              .filter(Boolean)
              .slice(0, 8)
              .map((para, j) => (
                <p
                  key={j}
                  style={{
                    fontSize: typeof fontSize === 'number' ? fontSize * 0.85 : 11,
                    lineHeight,
                    color: '#3a2a1a',
                    marginBottom: 8,
                    fontWeight: 300,
                  }}
                >
                  {para}
                </p>
              ))}
          </div>
        )}

        {!text && !firstPhoto && (
          <p style={{ fontSize: 11, color: '#b0986a', textAlign: 'center', marginTop: 20 }}>
            아직 작성된 내용이 없습니다
          </p>
        )}

        <PageFooter pageNum={pageNum} />
      </div>
    </div>
  );
});
ChapterContent.displayName = 'ChapterContent';

/** 맺음말 페이지 */
const EndContent = forwardRef<HTMLDivElement, Record<string, never>>(
  (_, ref) => (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: '100%',
        background: '#3D3530',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#faf8f4',
        fontFamily: "'Noto Serif KR', Georgia, serif",
      }}
    >
      <div
        style={{
          width: 32,
          height: 1,
          background: '#faf8f4',
          opacity: 0.2,
          marginBottom: 20,
        }}
      />
      <p style={{ fontSize: 12, opacity: 0.5, letterSpacing: 2 }}>나의이야기</p>
      <p style={{ fontSize: 10, opacity: 0.3, marginTop: 8, letterSpacing: 1 }}>
        {new Date().getFullYear()}
      </p>
    </div>
  )
);
EndContent.displayName = 'EndContent';

/** 페이지 번호 */
function PageFooter({ pageNum }: { pageNum: number }) {
  return (
    <div
      style={{
        textAlign: 'center',
        paddingTop: 8,
        borderTop: '1px solid #f0e8da',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: 9,
          color: '#c8b8a0',
          fontFamily: "'Noto Sans KR', sans-serif",
        }}
      >
        {pageNum}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   메인 FlipBook 컴포넌트
───────────────────────────────────────────────────────────────── */
export default function FlipBook({
  title,
  author,
  chapters,
  coverTemplate,
  fontPreset,
  onCoverChange,
}: FlipBookProps) {
  const flipBookRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // 전체 페이지 수 계산: 표지(1) + 속표지(1) + 목차(1) + 챕터×N + 끝(1)
  const totalPages = 1 + 1 + 1 + chapters.length + 1;

  const handleFlip = useCallback((e: { data: number }) => {
    setCurrentPage(e.data);
  }, []);

  const goPrev = () => flipBookRef.current?.pageFlip()?.flipPrev();
  const goNext = () => flipBookRef.current?.pageFlip()?.flipNext();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: '20px 0',
        userSelect: 'none',
      }}
    >
      {/* 플립북 */}
      <div style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.2)', borderRadius: 2 }}>
        <HTMLFlipBook
          ref={flipBookRef}
          width={300}
          height={430}
          size="fixed"
          minWidth={180}
          maxWidth={400}
          minHeight={260}
          maxHeight={580}
          showCover={true}
          usePortrait={true}
          startZIndex={0}
          autoSize={false}
          drawShadow={true}
          flippingTime={700}
          useMouseEvents={true}
          swipeDistance={20}
          clickEventForward={true}
          onFlip={handleFlip}
          className="flip-book-inner"
          style={{}}
        >
          {/* 0: 표지 */}
          <CoverContent
            title={title}
            author={author}
            template={coverTemplate}
            onCoverChange={onCoverChange}
          />

          {/* 1: 속표지 (공백) */}
          <BlankContent />

          {/* 2: 목차 */}
          <TocContent chapters={chapters} pageNum={1} />

          {/* 3..N: 챕터 */}
          {chapters.map((ch, i) => (
            <ChapterContent
              key={ch.id}
              chapter={ch}
              chapterNum={i + 1}
              pageNum={i + 2}
              fontSize={fontPreset.book}
              lineHeight={fontPreset.lineHeight}
            />
          ))}

          {/* 마지막: 맺음말 */}
          <EndContent />
        </HTMLFlipBook>
      </div>

      {/* 네비게이션 컨트롤 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: 'rgba(255,255,255,0.9)',
          borderRadius: 24,
          padding: '8px 20px',
          boxShadow: TOKENS.shadow,
        }}
      >
        <button
          onClick={goPrev}
          disabled={currentPage === 0}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 18,
            cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 0 ? 0.3 : 1,
            color: TOKENS.text,
            padding: '4px 8px',
            minHeight: 40,
            minWidth: 40,
          }}
          aria-label="이전 페이지"
        >
          ◀
        </button>

        <span
          style={{
            fontSize: 12,
            color: TOKENS.muted,
            fontFamily: TOKENS.sans,
            minWidth: 60,
            textAlign: 'center',
          }}
        >
          {currentPage + 1} / {totalPages}
        </span>

        <button
          onClick={goNext}
          disabled={currentPage >= totalPages - 1}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 18,
            cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage >= totalPages - 1 ? 0.3 : 1,
            color: TOKENS.text,
            padding: '4px 8px',
            minHeight: 40,
            minWidth: 40,
          }}
          aria-label="다음 페이지"
        >
          ▶
        </button>
      </div>

      {/* 조작 안내 */}
      <p
        style={{
          fontSize: 11,
          color: TOKENS.muted,
          fontFamily: TOKENS.sans,
          textAlign: 'center',
        }}
      >
        페이지를 클릭하거나 드래그해서 넘길 수 있습니다
      </p>
    </div>
  );
}
