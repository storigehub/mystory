'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { TOKENS, FONT_SIZE_PRESETS } from '@/lib/design-tokens';

const COVER_TEMPLATES = [
  { id: 'classic', gradient: `linear-gradient(180deg, #3D3530, #2C2824)`, textColor: '#FAFAF9', accentOpacity: 0.25 },
  { id: 'dawn',    gradient: `linear-gradient(180deg, #1a2a4a, #0d1b2e)`, textColor: '#FAFAF9', accentOpacity: 0.3 },
  { id: 'sunset',  gradient: `linear-gradient(160deg, #704214, #9B6A2F)`, textColor: '#FAFAF9', accentOpacity: 0.3 },
  { id: 'spring',  gradient: `linear-gradient(180deg, #F0EBE3, #E5DDD5)`, textColor: '#3D3530', accentOpacity: 0.2 },
] as const;

interface Photo { id: string; url: string; caption?: string; is_featured?: boolean; }
interface Message { id: string; type: string; text: string; }
interface Chapter {
  id: string; title: string; sort_order: number; prose: string;
  messages: Message[]; photos: Photo[];
}
interface Book {
  id: string; title: string; author: string; cover_template: string; is_public: boolean;
}

function cleanProse(prose: string) {
  return prose.replace(/\[PHOTO:[a-z0-9]+\]/g, '').trim();
}
function getChapterText(ch: Chapter) {
  if (ch.prose?.length > 0) return ch.prose;
  return ch.messages.filter((m) => m.type === 'user').map((m) => m.text).join('\n\n');
}
function getChapterPhotos(ch: Chapter) {
  const chat = ch.messages
    .filter((m) => m.type === 'photo' && m.text)
    .map((m) => ({ data: m.text, caption: '', isFeatured: false }));
  const direct = (ch.photos || []).map((p) => ({
    data: p.url, caption: p.caption || '', isFeatured: p.is_featured ?? false,
  }));
  return [...chat, ...direct];
}

export default function SharedBookPage() {
  const params = useParams();
  const bookId = params.id as string;

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);

  const chapterRefs = useRef<Record<string, HTMLElement | null>>({});
  const fontPreset = FONT_SIZE_PRESETS['normal'];

  useEffect(() => {
    fetch(`/api/shared/${bookId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setBook(data.book);
        setChapters((data.chapters || []).sort((a: Chapter, b: Chapter) => a.sort_order - b.sort_order));
      })
      .catch(() => setError('불러오는 중 오류가 발생했습니다'))
      .finally(() => setLoading(false));
  }, [bookId]);

  const writtenChapters = chapters.filter(
    (c) => getChapterText(c).length > 0 || getChapterPhotos(c).length > 0
  );

  const coverTemplate = COVER_TEMPLATES.find((t) => t.id === book?.cover_template) ?? COVER_TEMPLATES[0];

  /* IntersectionObserver */
  useEffect(() => {
    if (writtenChapters.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = writtenChapters.findIndex((c) => c.id === entry.target.id);
            if (idx >= 0) setActiveIdx(idx);
          }
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    );
    Object.values(chapterRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writtenChapters.length]);

  const scrollTo = (id: string, close = false) => {
    chapterRefs.current[id]?.scrollIntoView({ behavior: 'smooth' });
    if (close) setTocOpen(false);
  };

  const goToPrev = useCallback(() => {
    if (activeIdx > 0) scrollTo(writtenChapters[activeIdx - 1].id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, writtenChapters]);

  const goToNext = useCallback(() => {
    if (activeIdx < writtenChapters.length - 1) scrollTo(writtenChapters[activeIdx + 1].id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, writtenChapters]);

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TOKENS.sans, color: TOKENS.muted }}>
      불러오는 중…
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: TOKENS.sans }}>
      <p style={{ fontSize: 16, color: TOKENS.text }}>
        {error === '비공개 책입니다' ? '비공개 책입니다' : '책을 찾을 수 없습니다'}
      </p>
      <a href="/" style={{ fontSize: 13, color: TOKENS.muted, textDecoration: 'underline' }}>나의이야기 홈으로</a>
    </div>
  );

  return (
    <div style={{ minHeight: '100dvh', background: '#fff', fontFamily: TOKENS.serif }}>

      {/* ── 헤더 ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${TOKENS.borderLight}`,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 16px', height: 52,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: TOKENS.accent, fontFamily: TOKENS.sans }}>
          나의이야기
        </span>
        <div style={{ flex: 1 }} />
        <a
          href="/"
          style={{
            padding: '7px 14px', borderRadius: TOKENS.radiusSm,
            background: TOKENS.dark, color: '#FAFAF9',
            fontSize: 12, fontFamily: TOKENS.sans, fontWeight: 500,
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >
          나도 쓰기
        </a>
      </div>

      {/* ── 표지 히어로 ── */}
      <div style={{
        background: coverTemplate.gradient,
        color: coverTemplate.textColor,
        padding: 'clamp(60px, 15vw, 100px) clamp(20px, 6vw, 80px) clamp(40px, 8vw, 60px)',
        minHeight: '45vh',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}>
        <div style={{ maxWidth: 680, width: '100%' }}>
          <div style={{ width: 32, height: 1, background: coverTemplate.textColor, opacity: coverTemplate.accentOpacity * 2, marginBottom: 20 }} />
          <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', fontWeight: 300, letterSpacing: '-0.03em', marginBottom: 10, lineHeight: 1.25 }}>
            {book?.title || '나의 이야기'}
          </h1>
          <p style={{ fontSize: 'clamp(14px, 2.5vw, 16px)', opacity: 0.65, fontWeight: 300, margin: 0 }}>
            {book?.author || '저자'}
          </p>
          <p style={{ fontSize: 11, opacity: 0.3, marginTop: 16, fontFamily: TOKENS.sans, letterSpacing: 3 }}>
            나의이야기 · {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* ── 목차 ── */}
      {writtenChapters.length > 0 && (
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 24px' }}>
          <p style={{ fontSize: 11, color: TOKENS.muted, letterSpacing: 4, fontFamily: TOKENS.sans, textAlign: 'center', marginBottom: 24 }}>목 차</p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {writtenChapters.map((ch, i) => (
              <button key={ch.id} onClick={() => scrollTo(ch.id)} style={{
                display: 'flex', alignItems: 'baseline', gap: 12,
                padding: '11px 0', background: 'none', border: 'none',
                borderBottom: `1px solid ${TOKENS.borderLight}`,
                cursor: 'pointer', textAlign: 'left',
              }}>
                <span style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, minWidth: 24 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ flex: 1, fontSize: 15, color: TOKENS.text, fontFamily: TOKENS.serif, lineHeight: 1.4 }}>
                  {ch.title}
                </span>
              </button>
            ))}
          </div>
          <div style={{ width: 32, height: 1, background: TOKENS.border, margin: '32px auto 0', opacity: 0.5 }} />
        </div>
      )}

      {/* ── 챕터 본문 ── */}
      {writtenChapters.map((ch, i) => {
        const photos = getChapterPhotos(ch);
        const featured = photos.find((p) => p.isFeatured) ?? (photos.length > 0 ? photos[0] : null);
        const rest = photos.filter((p) => p !== featured);
        const bodyText = ch.prose ? cleanProse(ch.prose) : getChapterText(ch);

        return (
          <article key={ch.id} id={ch.id} ref={(el) => { chapterRefs.current[ch.id] = el; }} style={{ marginBottom: 0 }}>

            {/* 섹션 헤더 */}
            {featured ? (
              <div style={{ position: 'relative', height: 'clamp(280px, 50vw, 480px)', overflow: 'hidden' }}>
                <img src={featured.data} alt={featured.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 'clamp(20px, 4vw, 40px) clamp(20px, 6vw, 80px)', color: '#fff' }}>
                  <p style={{ fontSize: 12, letterSpacing: 3, opacity: 0.6, fontFamily: TOKENS.sans, marginBottom: 8 }}>제 {String(i + 1).padStart(2, '0')} 장</p>
                  <h2 style={{ fontSize: 'clamp(1.3rem, 4vw, 1.9rem)', fontWeight: 300, lineHeight: 1.3, margin: 0, letterSpacing: '-0.02em' }}>{ch.title}</h2>
                </div>
              </div>
            ) : (
              <div style={{ padding: 'clamp(48px, 8vw, 72px) clamp(20px, 6vw, 80px) 32px', borderTop: i > 0 ? `1px solid ${TOKENS.borderLight}` : undefined, textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: TOKENS.muted, letterSpacing: 4, fontFamily: TOKENS.sans, marginBottom: 12 }}>제 {String(i + 1).padStart(2, '0')} 장</p>
                <h2 style={{ fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', fontWeight: 300, lineHeight: 1.4, margin: '0 0 16px', letterSpacing: '-0.02em', color: TOKENS.text }}>{ch.title}</h2>
                <div style={{ width: 32, height: 1, background: TOKENS.accent, margin: '0 auto', opacity: 0.4 }} />
              </div>
            )}

            {/* 본문 */}
            <div style={{ maxWidth: 680, margin: '0 auto', padding: featured ? 'clamp(32px, 5vw, 56px) clamp(20px, 6vw, 80px)' : 'clamp(24px, 4vw, 40px) clamp(20px, 6vw, 80px)' }}>
              {featured?.caption && (
                <p style={{ fontSize: 12, color: TOKENS.muted, fontFamily: TOKENS.sans, textAlign: 'center', marginBottom: 28, fontStyle: 'italic' }}>{featured.caption}</p>
              )}
              {bodyText.split('\n\n').filter(Boolean).map((para, j) => (
                <p key={j} style={{ fontSize: fontPreset.book, lineHeight: fontPreset.lineHeight, color: TOKENS.text, marginBottom: '1.2em', fontWeight: 300, wordBreak: 'keep-all' }}>{para}</p>
              ))}
              {rest.map((photo, j) => (
                <figure key={j} style={{ margin: '2em 0' }}>
                  <img src={photo.data} alt={photo.caption || ''} style={{ width: '100%', borderRadius: 4, display: 'block', maxHeight: '60vh', objectFit: 'cover' }} />
                  {photo.caption && <figcaption style={{ fontSize: 12, color: TOKENS.muted, textAlign: 'center', marginTop: 10, fontFamily: TOKENS.sans, fontStyle: 'italic' }}>{photo.caption}</figcaption>}
                </figure>
              ))}

              {/* 이전/다음 챕터 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '40px 0 8px', gap: 12 }}>
                <button onClick={goToPrev} disabled={i === 0} style={{ padding: '10px 16px', border: `1px solid ${TOKENS.borderLight}`, borderRadius: 8, background: i === 0 ? 'transparent' : TOKENS.warm, color: i === 0 ? TOKENS.light : TOKENS.subtext, fontSize: 12, fontFamily: TOKENS.sans, cursor: i === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, minHeight: 40, opacity: i === 0 ? 0 : 1, pointerEvents: i === 0 ? 'none' : 'auto' }}>
                  ← {writtenChapters[i - 1]?.title}
                </button>
                <div style={{ color: TOKENS.light, letterSpacing: 10, fontSize: 13 }}>· · ·</div>
                <button onClick={goToNext} disabled={i === writtenChapters.length - 1} style={{ padding: '10px 16px', border: `1px solid ${TOKENS.borderLight}`, borderRadius: 8, background: i === writtenChapters.length - 1 ? 'transparent' : TOKENS.warm, color: i === writtenChapters.length - 1 ? TOKENS.light : TOKENS.subtext, fontSize: 12, fontFamily: TOKENS.sans, cursor: i === writtenChapters.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, minHeight: 40, opacity: i === writtenChapters.length - 1 ? 0 : 1, pointerEvents: i === writtenChapters.length - 1 ? 'none' : 'auto' }}>
                  {writtenChapters[i + 1]?.title} →
                </button>
              </div>
            </div>
          </article>
        );
      })}

      {/* ── 하단 CTA ── */}
      <div style={{ textAlign: 'center', padding: '60px 24px 80px', borderTop: `1px solid ${TOKENS.borderLight}` }}>
        <p style={{ fontSize: 13, color: TOKENS.muted, fontFamily: TOKENS.sans, marginBottom: 16 }}>나의 인생 이야기도 책으로 만들어보세요</p>
        <a href="/" style={{ display: 'inline-block', padding: '13px 28px', background: TOKENS.dark, color: '#FAFAF9', borderRadius: TOKENS.radiusSm, fontSize: 14, fontFamily: TOKENS.sans, fontWeight: 500, textDecoration: 'none' }}>
          나의이야기 시작하기
        </a>
      </div>

      {/* ── 플로팅 TOC ── */}
      {writtenChapters.length > 1 && (
        <>
          <button onClick={() => setTocOpen((v) => !v)} title="목차" style={{ position: 'fixed', right: 20, bottom: 80, zIndex: 50, width: 44, height: 44, borderRadius: '50%', background: tocOpen ? TOKENS.dark : TOKENS.card, color: tocOpen ? '#FAFAF9' : TOKENS.text, border: `1px solid ${TOKENS.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.12)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, transition: 'all 0.2s' }}>
            ≡
          </button>

          {tocOpen && (
            <>
              <div onClick={() => setTocOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
              <div style={{ position: 'fixed', right: 20, bottom: 132, zIndex: 50, background: TOKENS.card, borderRadius: 12, padding: '16px 0', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: `1px solid ${TOKENS.borderLight}`, minWidth: 220, maxWidth: 280, maxHeight: '60vh', overflowY: 'auto' }}>
                <p style={{ fontSize: 10, color: TOKENS.muted, letterSpacing: 3, fontFamily: TOKENS.sans, padding: '0 16px 10px', borderBottom: `1px solid ${TOKENS.borderLight}`, margin: 0 }}>목 차</p>
                {writtenChapters.map((ch, idx) => (
                  <button key={ch.id} onClick={() => scrollTo(ch.id, true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: activeIdx === idx ? TOKENS.warm : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderLeft: activeIdx === idx ? `2px solid ${TOKENS.accent}` : '2px solid transparent', transition: 'background 0.15s' }}>
                    <span style={{ fontSize: 10, color: TOKENS.muted, fontFamily: TOKENS.sans, minWidth: 18 }}>{String(idx + 1).padStart(2, '0')}</span>
                    <span style={{ fontSize: 13, fontFamily: TOKENS.serif, color: TOKENS.text, fontWeight: activeIdx === idx ? 500 : 400, lineHeight: 1.4 }}>{ch.title}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div style={{ height: 80 }} />
    </div>
  );
}
