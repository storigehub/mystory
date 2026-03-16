'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBook, Chapter } from '@/lib/book-context';
import { TOKENS, FONT_SIZE_PRESETS } from '@/lib/design-tokens';
import UserNav from '@/components/ui/UserNav';

/* ── 표지 템플릿 ── */
const COVER_TEMPLATES = [
  {
    id: 'classic',
    label: '클래식',
    gradient: `linear-gradient(180deg, #3D3530, #2C2824)`,
    textColor: '#FAFAF9',
    accentOpacity: 0.25,
  },
  {
    id: 'dawn',
    label: '새벽',
    gradient: `linear-gradient(180deg, #1a2a4a, #0d1b2e)`,
    textColor: '#FAFAF9',
    accentOpacity: 0.3,
  },
  {
    id: 'sunset',
    label: '황혼',
    gradient: `linear-gradient(160deg, #704214, #9B6A2F)`,
    textColor: '#FAFAF9',
    accentOpacity: 0.3,
  },
  {
    id: 'spring',
    label: '봄날',
    gradient: `linear-gradient(180deg, #F0EBE3, #E5DDD5)`,
    textColor: '#3D3530',
    accentOpacity: 0.2,
  },
] as const;

type CoverTemplateId = typeof COVER_TEMPLATES[number]['id'];

function getChapterText(chapter: Chapter): string {
  if (chapter.prose?.length > 0) return chapter.prose;
  return chapter.messages
    .filter((m) => m.type === 'user')
    .map((m) => m.text)
    .join('\n\n');
}

function getChapterPhotos(chapter: Chapter) {
  const chatPhotos = chapter.messages
    .filter((m) => m.type === 'photo' && m.text)
    .map((m) => ({ data: m.text, caption: '' }));
  const directPhotos = (chapter.photos || []).map((p) => ({ data: p.data, caption: p.caption || '' }));
  return [...chatPhotos, ...directPhotos];
}

export default function BookPage() {
  const router = useRouter();
  const { state } = useBook();
  const chapterRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [coverTemplateId, setCoverTemplateId] = useState<CoverTemplateId>('classic');
  const [isPrinting, setIsPrinting] = useState(false);

  const fontPreset = FONT_SIZE_PRESETS[state.fontSize];
  const coverTemplate = COVER_TEMPLATES.find((t) => t.id === coverTemplateId) || COVER_TEMPLATES[0];

  const writtenChapters = state.chapters.filter(
    (c) => getChapterText(c).length > 0 || getChapterPhotos(c).length > 0
  );

  const scrollToChapter = (id: string) => {
    chapterRefs.current[id]?.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  return (
    <div style={{ minHeight: '100dvh', background: TOKENS.bg }}>
      {/* 공통 사용자 네비게이션 */}
      <UserNav loginCallbackUrl="/book" />

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .book-cover {
            page-break-after: always;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .book-toc { page-break-after: always; }
          .book-chapter { page-break-before: auto; }
          img { max-width: 100%; break-inside: avoid; }
        }
      `}</style>

      {/* Sticky header */}
      <div
        className="no-print"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(250,250,248,.95)',
          backdropFilter: 'blur(12px)',
          padding: '10px 16px',
          borderBottom: `1px solid ${TOKENS.borderLight}`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 48,
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: `1px solid ${TOKENS.border}`,
            borderRadius: TOKENS.radiusSm,
            fontSize: 13,
            color: TOKENS.subtext,
            cursor: 'pointer',
            fontFamily: TOKENS.sans,
            minHeight: 40,
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          ← 편집으로
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 500 }}>
          {state.title}
        </span>
        <span style={{ fontSize: 12, color: TOKENS.muted, fontFamily: TOKENS.sans }}>
          {writtenChapters.length}장
        </span>
        <button
          onClick={handlePrint}
          disabled={isPrinting}
          style={{
            background: TOKENS.dark,
            color: '#FAFAF9',
            border: 'none',
            borderRadius: TOKENS.radiusSm,
            fontSize: 12,
            fontFamily: TOKENS.sans,
            cursor: isPrinting ? 'wait' : 'pointer',
            padding: '8px 14px',
            minHeight: 40,
          }}
        >
          {isPrinting ? '준비 중…' : '🖨 PDF'}
        </button>
      </div>

      {/* Book cover */}
      <div
        className="book-cover"
        style={{
          padding: 'clamp(48px, 12vw, 80px) 20px',
          textAlign: 'center',
          background: coverTemplate.gradient,
          color: coverTemplate.textColor,
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 48,
            height: 1,
            background: coverTemplate.textColor,
            margin: '0 auto 28px',
            opacity: coverTemplate.accentOpacity,
          }}
        />
        <h1
          style={{
            fontSize: 'clamp(1.6rem, 6vw, 2.2rem)',
            fontWeight: 300,
            letterSpacing: '-0.02em',
            marginBottom: 10,
          }}
        >
          {state.title || '나의 이야기'}
        </h1>
        <p style={{ fontSize: 15, opacity: 0.6, fontWeight: 300 }}>
          {state.author || '저자'}
        </p>
        <p
          style={{
            fontSize: 11,
            opacity: 0.3,
            marginTop: 20,
            fontFamily: TOKENS.sans,
            letterSpacing: 3,
          }}
        >
          나의이야기 · {new Date().getFullYear()}
        </p>

        {/* Template selector */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            marginTop: 32,
          }}
        >
          {COVER_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => setCoverTemplateId(tpl.id)}
              title={tpl.label}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: tpl.gradient,
                border: coverTemplateId === tpl.id
                  ? `2px solid ${coverTemplate.textColor}`
                  : '2px solid transparent',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: coverTemplateId === tpl.id ? '0 0 0 2px rgba(0,0,0,0.3)' : 'none',
                transition: 'transform 0.15s',
                transform: coverTemplateId === tpl.id ? 'scale(1.2)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Table of contents */}
      <div className="book-toc" style={{ maxWidth: 600, margin: '0 auto', padding: '36px 20px 20px' }}>
        <p
          style={{
            fontSize: 11,
            color: TOKENS.muted,
            letterSpacing: 4,
            textAlign: 'center',
            fontFamily: TOKENS.sans,
            marginBottom: 24,
          }}
        >
          목차
        </p>
        {state.chapters.map((ch, i) => (
          <button
            key={ch.id}
            onClick={() => scrollToChapter(ch.id)}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              padding: '10px 0',
              width: '100%',
              background: 'none',
              border: 'none',
              borderBottom: `1px solid ${TOKENS.borderLight}`,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 12, color: TOKENS.muted, fontFamily: TOKENS.sans, minWidth: 26 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span style={{ flex: 1, fontSize: 15, color: TOKENS.text, fontFamily: TOKENS.serif }}>
              {ch.title}
            </span>
          </button>
        ))}
        <div style={{ width: 32, height: 1, background: TOKENS.border, margin: '32px auto' }} />
      </div>

      {/* Chapters content */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 20px 80px' }}>
        {writtenChapters.length === 0 ? (
          <p style={{ textAlign: 'center', color: TOKENS.muted, marginTop: 60, fontFamily: TOKENS.sans }}>
            아직 작성된 이야기가 없습니다
          </p>
        ) : (
          writtenChapters.map((ch, i) => {
            const text = getChapterText(ch);
            const photos = getChapterPhotos(ch);
            return (
              <div
                key={ch.id}
                className="book-chapter"
                ref={(el) => { chapterRefs.current[ch.id] = el; }}
                style={{ marginBottom: 56 }}
              >
                {/* Chapter header */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <p style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, letterSpacing: 3 }}>
                    제 {String(i + 1).padStart(2, '0')} 장
                  </p>
                  <h2 style={{ fontSize: 'clamp(1.2rem, 5vw, 1.5rem)', fontWeight: 400, marginTop: 8 }}>
                    {ch.title}
                  </h2>
                  <div
                    style={{
                      width: 32,
                      height: 1,
                      background: TOKENS.accent,
                      margin: '14px auto 0',
                      opacity: 0.5,
                    }}
                  />
                </div>

                {/* Photos */}
                {photos.map((photo, j) => (
                  <div key={j} style={{ margin: '24px 0', textAlign: 'center' }}>
                    <img
                      src={photo.data}
                      alt=""
                      style={{ maxWidth: '100%', borderRadius: TOKENS.radiusSm, boxShadow: TOKENS.shadowLg }}
                    />
                    {photo.caption && (
                      <p style={{ fontSize: 12, color: TOKENS.muted, marginTop: 8, fontFamily: TOKENS.sans }}>
                        {photo.caption}
                      </p>
                    )}
                  </div>
                ))}

                {/* Text content */}
                {text
                  .split('\n\n')
                  .filter(Boolean)
                  .map((paragraph, j) => (
                    <p
                      key={j}
                      style={{
                        fontSize: fontPreset.book,
                        lineHeight: fontPreset.lineHeight,
                        color: TOKENS.text,
                        marginBottom: 14,
                        fontWeight: 300,
                      }}
                    >
                      {paragraph}
                    </p>
                  ))}

                {/* Chapter separator */}
                {i < writtenChapters.length - 1 && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '28px 0',
                      color: TOKENS.light,
                      letterSpacing: 12,
                      fontSize: 12,
                    }}
                  >
                    · · ·
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
