'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { TOKENS, FONT_SIZE_PRESETS } from '@/lib/design-tokens';

const ACCENT = '#A0522D';
const GOLD = '#C9A96E';
const ACCENT_BG = '#FBF6F1';

const COVER_TEMPLATES = [
  { id: 'classic', gradient: 'linear-gradient(160deg, #3D3530 0%, #1C1A18 100%)', textColor: '#FAFAF9' },
  { id: 'dawn',    gradient: 'linear-gradient(160deg, #1a2a4a 0%, #0d1b2e 100%)', textColor: '#FAFAF9' },
  { id: 'sunset',  gradient: 'linear-gradient(160deg, #7a4820 0%, #4a2c10 100%)', textColor: '#FAFAF9' },
  { id: 'spring',  gradient: 'linear-gradient(160deg, #E8E0D5 0%, #D4C9BA 100%)', textColor: '#3D3530' },
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

/* 첫 글자 드롭캡을 위한 처리 */
function renderParagraphs(text: string, fontSize: number, lineHeight: number) {
  const paras = text.split('\n\n').filter(Boolean);
  return paras.map((para, j) => {
    if (j === 0 && para.length > 1) {
      const first = para[0];
      const rest = para.slice(1);
      return (
        <p key={j} style={{ fontSize, lineHeight, color: TOKENS.text, marginBottom: '1.4em', fontWeight: 300, wordBreak: 'keep-all' }}>
          <span style={{
            float: 'left',
            fontSize: fontSize * 3.2,
            lineHeight: 0.82,
            fontFamily: TOKENS.serif,
            color: ACCENT,
            marginRight: 6,
            marginTop: 4,
            fontWeight: 400,
          }}>
            {first}
          </span>
          {rest}
        </p>
      );
    }
    return (
      <p key={j} style={{ fontSize, lineHeight, color: TOKENS.text, marginBottom: '1.4em', fontWeight: 300, wordBreak: 'keep-all' }}>{para}</p>
    );
  });
}

export default function SharedBookPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const bookId = params.id as string;
  const token = searchParams.get('token');

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const [readPct, setReadPct] = useState(0);
  const [copied, setCopied] = useState(false);

  const chapterRefs = useRef<Record<string, HTMLElement | null>>({});
  const fontPreset = FONT_SIZE_PRESETS['normal'];

  /* 데이터 로드 */
  useEffect(() => {
    const url = token ? `/api/shared/${bookId}?token=${token}` : `/api/shared/${bookId}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setBook(data.book);
        setChapters((data.chapters || []).sort((a: Chapter, b: Chapter) => a.sort_order - b.sort_order));
      })
      .catch(() => setError('불러오는 중 오류가 발생했습니다'))
      .finally(() => setLoading(false));
  }, [bookId, token]);

  /* 읽기 진행률 */
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setReadPct(total > 0 ? Math.min(100, (scrolled / total) * 100) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = () => {
    if (navigator.share && book) {
      navigator.share({
        title: book.title,
        text: `${book.author}의 인생 이야기 — 나의이야기`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  /* ── 로딩 ── */
  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: TOKENS.bg }}>
      <div style={{ width: 40, height: 40, border: `2px solid ${TOKENS.borderLight}`, borderTopColor: ACCENT, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: 13, color: TOKENS.muted, fontFamily: TOKENS.sans }}>책을 불러오는 중…</p>
    </div>
  );

  /* ── 에러 ── */
  if (error) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, background: TOKENS.bg, padding: 24 }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: ACCENT_BG, border: `1px solid #E8D0BC`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 18, fontFamily: TOKENS.serif, color: TOKENS.text, marginBottom: 8 }}>
          {error === '비공개 책입니다' ? '비공개 책입니다' : '책을 찾을 수 없습니다'}
        </p>
        <p style={{ fontSize: 13, color: TOKENS.muted, fontFamily: TOKENS.sans }}>
          {error === '비공개 책입니다' ? '저자가 공개하지 않은 책입니다' : '링크가 만료되었거나 존재하지 않는 책입니다'}
        </p>
      </div>
      <a href="/" style={{ padding: '11px 28px', background: TOKENS.dark, color: '#FAFAF9', borderRadius: 40, fontSize: 14, fontFamily: TOKENS.sans, fontWeight: 500, textDecoration: 'none' }}>
        나의이야기 홈으로
      </a>
    </div>
  );

  return (
    <div style={{ minHeight: '100dvh', background: '#fff', fontFamily: TOKENS.serif }}>

      {/* ── 읽기 진행률 바 ── */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: `${readPct}%`,
          height: 2,
          background: `linear-gradient(90deg, ${ACCENT}, ${GOLD})`,
          zIndex: 200,
          transition: 'width 0.1s linear',
        }}
      />

      {/* ── 헤더 ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${TOKENS.borderLight}`,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 20px', height: 52,
      }}>
        {/* 브랜드 */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6,
            background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: TOKENS.text, fontFamily: TOKENS.sans }}>나의이야기</span>
        </a>

        {/* 제목 (중앙, 모바일에서 숨김) */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {book && (
            <p style={{
              fontSize: 12, color: TOKENS.muted, fontFamily: TOKENS.sans,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              textAlign: 'center', margin: 0,
            }}>
              {book.title}
            </p>
          )}
        </div>

        {/* 우측 액션 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* 공유 버튼 */}
          <button
            onClick={handleNativeShare}
            title="공유하기"
            style={{
              width: 36, height: 36, borderRadius: 8,
              border: `1px solid ${TOKENS.border}`,
              background: copied ? ACCENT_BG : TOKENS.card,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TOKENS.subtext} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            )}
          </button>

          {/* 나도 쓰기 */}
          <a
            href="/"
            style={{
              padding: '7px 14px', borderRadius: 40,
              background: TOKENS.dark, color: '#FAFAF9',
              fontSize: 12, fontFamily: TOKENS.sans, fontWeight: 600,
              textDecoration: 'none', whiteSpace: 'nowrap',
              letterSpacing: 0.2,
            }}
          >
            나도 쓰기
          </a>
        </div>
      </header>

      {/* ── 표지 히어로 ── */}
      <div style={{
        position: 'relative',
        background: coverTemplate.gradient,
        color: coverTemplate.textColor,
        minHeight: '62vh',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        overflow: 'hidden',
      }}>
        {/* 장식 요소 */}
        <div style={{
          position: 'absolute', top: '15%', right: '8%',
          width: 'clamp(140px, 22vw, 200px)', height: 'clamp(140px, 22vw, 200px)',
          borderRadius: '50%',
          border: `1px solid rgba(255,255,255,0.06)`,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '8%', right: '14%',
          width: 'clamp(60px, 10vw, 90px)', height: 'clamp(60px, 10vw, 90px)',
          borderRadius: '50%',
          border: `1px solid rgba(255,255,255,0.04)`,
          pointerEvents: 'none',
        }} />

        {/* 저자 이니셜 아바타 */}
        {book?.author && (
          <div style={{
            position: 'absolute', top: 'clamp(32px, 7vw, 60px)', left: 'clamp(24px, 6vw, 80px)',
            width: 44, height: 44, borderRadius: '50%',
            background: `rgba(255,255,255,0.12)`,
            border: `1px solid rgba(255,255,255,0.2)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontSize: 16, fontFamily: TOKENS.serif,
              color: coverTemplate.textColor,
              opacity: 0.8,
            }}>
              {book.author[0]}
            </span>
          </div>
        )}

        {/* 텍스트 블록 */}
        <div style={{ maxWidth: 720, padding: 'clamp(60px, 12vw, 100px) clamp(24px, 6vw, 80px) clamp(48px, 8vw, 72px)' }}>
          {/* 브랜드 라인 */}
          <p style={{
            fontSize: 10, letterSpacing: 4,
            opacity: 0.4, fontFamily: TOKENS.sans,
            marginBottom: 20, textTransform: 'uppercase',
            color: coverTemplate.textColor,
          }}>
            나의이야기 · My Story
          </p>

          {/* 구분선 */}
          <div style={{ width: 40, height: 1, background: coverTemplate.textColor, opacity: 0.3, marginBottom: 20 }} />

          {/* 책 제목 */}
          <h1 style={{
            fontSize: 'clamp(1.9rem, 6vw, 3rem)',
            fontWeight: 300,
            letterSpacing: '-0.03em',
            marginBottom: 14,
            lineHeight: 1.2,
            color: coverTemplate.textColor,
            fontFamily: TOKENS.serif,
          }}>
            {book?.title || '나의 이야기'}
          </h1>

          {/* 저자 */}
          <p style={{
            fontSize: 'clamp(14px, 2.5vw, 17px)',
            opacity: 0.6, fontWeight: 300,
            color: coverTemplate.textColor,
            margin: '0 0 24px',
            fontFamily: TOKENS.serif,
          }}>
            {book?.author || '저자'}
          </p>

          {/* 챕터 수 뱃지 */}
          {writtenChapters.length > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: 'rgba(255,255,255,0.1)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.15)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={coverTemplate.textColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
              <span style={{ fontSize: 11, color: coverTemplate.textColor, opacity: 0.7, fontFamily: TOKENS.sans, letterSpacing: 1 }}>
                {writtenChapters.length}개의 이야기
              </span>
            </div>
          )}
        </div>

        {/* 스크롤 힌트 */}
        <div style={{
          position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0.35,
        }}>
          <span style={{ fontSize: 10, letterSpacing: 3, fontFamily: TOKENS.sans, color: coverTemplate.textColor, textTransform: 'uppercase' }}>scroll</span>
          <div style={{ width: 1, height: 24, background: coverTemplate.textColor }} />
        </div>
      </div>

      {/* ── 목차 ── */}
      {writtenChapters.length > 0 && (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(48px, 8vw, 72px) clamp(24px, 6vw, 80px)' }}>
          {/* 섹션 라벨 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
            <p style={{ fontSize: 10, color: TOKENS.muted, letterSpacing: 4, fontFamily: TOKENS.sans, textTransform: 'uppercase', margin: 0 }}>
              목 차
            </p>
            <div style={{ flex: 1, height: 1, background: TOKENS.borderLight }} />
            <p style={{ fontSize: 10, color: TOKENS.muted, letterSpacing: 2, fontFamily: TOKENS.sans, margin: 0 }}>
              {writtenChapters.length} Chapters
            </p>
          </div>

          {/* 목차 리스트 */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {writtenChapters.map((ch, i) => (
              <button
                key={ch.id}
                onClick={() => scrollTo(ch.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '14px 0', background: 'none', border: 'none',
                  borderBottom: `1px solid ${TOKENS.borderLight}`,
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.6')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                {/* 번호 */}
                <span style={{ fontSize: 11, color: TOKENS.light, fontFamily: TOKENS.sans, fontWeight: 600, minWidth: 28, letterSpacing: 1 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {/* 점선 */}
                <div style={{ flex: 1, borderBottom: `1px dashed ${TOKENS.borderLight}`, marginBottom: 2 }} />
                {/* 제목 */}
                <span style={{ fontSize: 15, color: TOKENS.text, fontFamily: TOKENS.serif, lineHeight: 1.4, textAlign: 'right', maxWidth: '70%' }}>
                  {ch.title}
                </span>
                {/* 화살표 */}
                <span style={{ color: TOKENS.light, fontSize: 12 }}>↓</span>
              </button>
            ))}
          </div>

          {/* 구분선 */}
          <div style={{ width: 48, height: 1, background: `linear-gradient(90deg, ${ACCENT}, ${GOLD})`, margin: '40px auto 0', opacity: 0.5 }} />
        </div>
      )}

      {/* ── 챕터 본문 ── */}
      {writtenChapters.map((ch, i) => {
        const photos = getChapterPhotos(ch);
        const featured = photos.find((p) => p.isFeatured) ?? (photos.length > 0 ? photos[0] : null);
        const rest = photos.filter((p) => p !== featured);
        const bodyText = ch.prose ? cleanProse(ch.prose) : getChapterText(ch);

        return (
          <article
            key={ch.id}
            id={ch.id}
            ref={(el) => { chapterRefs.current[ch.id] = el; }}
            style={{ marginBottom: 0 }}
          >
            {/* 챕터 헤더 */}
            {featured ? (
              /* 대표사진 있는 경우 — 풀블리드 이미지 */
              <div style={{ position: 'relative', height: 'clamp(300px, 55vw, 520px)', overflow: 'hidden' }}>
                <img
                  src={featured.data}
                  alt={featured.caption || ''}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.6s ease' }}
                />
                {/* 그라디언트 오버레이 */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }} />
                {/* 텍스트 */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 'clamp(24px, 5vw, 44px) clamp(24px, 6vw, 80px)', color: '#fff' }}>
                  <p style={{ fontSize: 10, letterSpacing: 4, opacity: 0.5, fontFamily: TOKENS.sans, marginBottom: 10, textTransform: 'uppercase' }}>
                    Chapter {String(i + 1).padStart(2, '0')}
                  </p>
                  <h2 style={{ fontSize: 'clamp(1.4rem, 4.5vw, 2rem)', fontWeight: 300, lineHeight: 1.3, margin: 0, letterSpacing: '-0.02em', fontFamily: TOKENS.serif }}>
                    {ch.title}
                  </h2>
                </div>
              </div>
            ) : (
              /* 사진 없는 경우 — 텍스트 헤더 */
              <div style={{
                padding: 'clamp(52px, 9vw, 80px) clamp(24px, 6vw, 80px) 32px',
                borderTop: i > 0 ? `1px solid ${TOKENS.borderLight}` : undefined,
                textAlign: 'center',
                maxWidth: 720, margin: '0 auto',
              }}>
                {/* 장 번호 */}
                <p style={{ fontSize: 11, color: TOKENS.muted, letterSpacing: 4, fontFamily: TOKENS.sans, marginBottom: 14, textTransform: 'uppercase' }}>
                  Chapter {String(i + 1).padStart(2, '0')}
                </p>
                {/* 제목 */}
                <h2 style={{ fontSize: 'clamp(1.4rem, 4.5vw, 1.9rem)', fontWeight: 300, lineHeight: 1.4, margin: '0 0 20px', letterSpacing: '-0.02em', color: TOKENS.text, fontFamily: TOKENS.serif }}>
                  {ch.title}
                </h2>
                {/* 구분선 */}
                <div style={{ width: 32, height: 1, background: `linear-gradient(90deg, ${ACCENT}, ${GOLD})`, margin: '0 auto', opacity: 0.5 }} />
              </div>
            )}

            {/* 본문 영역 */}
            <div style={{ maxWidth: 680, margin: '0 auto', padding: `clamp(32px, 5vw, 52px) clamp(24px, 6vw, 80px)` }}>
              {/* 대표사진 캡션 */}
              {featured?.caption && (
                <p style={{ fontSize: 12, color: TOKENS.muted, fontFamily: TOKENS.sans, textAlign: 'center', marginBottom: 32, fontStyle: 'italic', lineHeight: 1.6 }}>
                  {featured.caption}
                </p>
              )}

              {/* 본문 텍스트 (드롭캡 포함) */}
              {bodyText ? (
                <div style={{ overflow: 'hidden' }}>
                  {renderParagraphs(bodyText, fontPreset.book, fontPreset.lineHeight)}
                </div>
              ) : (
                <p style={{ color: TOKENS.muted, fontFamily: TOKENS.sans, fontSize: 14, fontStyle: 'italic' }}>
                  아직 이야기가 작성되지 않았습니다.
                </p>
              )}

              {/* 나머지 사진들 */}
              {rest.map((photo, j) => (
                <figure key={j} style={{ margin: '2.5em -8px' }}>
                  <img
                    src={photo.data}
                    alt={photo.caption || ''}
                    style={{ width: 'calc(100% + 16px)', borderRadius: 8, display: 'block', maxHeight: '65vh', objectFit: 'cover' }}
                  />
                  {photo.caption && (
                    <figcaption style={{ fontSize: 12, color: TOKENS.muted, textAlign: 'center', marginTop: 10, fontFamily: TOKENS.sans, fontStyle: 'italic', lineHeight: 1.6 }}>
                      {photo.caption}
                    </figcaption>
                  )}
                </figure>
              ))}

              {/* 챕터 구분 장식 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '48px 0 8px', opacity: 0.3 }}>
                <div style={{ flex: 1, height: 1, background: TOKENS.border }} />
                <span style={{ fontSize: 14, color: TOKENS.muted, letterSpacing: 6 }}>· · ·</span>
                <div style={{ flex: 1, height: 1, background: TOKENS.border }} />
              </div>

              {/* 이전/다음 챕터 네비게이션 */}
              <div style={{ display: 'flex', gap: 10, padding: '20px 0 8px' }}>
                {i > 0 && (
                  <button
                    onClick={goToPrev}
                    style={{
                      flex: 1, padding: '12px 14px',
                      border: `1px solid ${TOKENS.borderLight}`,
                      borderRadius: 12, background: TOKENS.bg,
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = TOKENS.warm;
                      e.currentTarget.style.borderColor = TOKENS.border;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = TOKENS.bg;
                      e.currentTarget.style.borderColor = TOKENS.borderLight;
                    }}
                  >
                    <p style={{ fontSize: 10, color: TOKENS.muted, fontFamily: TOKENS.sans, marginBottom: 4, letterSpacing: 1 }}>← 이전 장</p>
                    <p style={{ fontSize: 13, color: TOKENS.text, fontFamily: TOKENS.serif, lineHeight: 1.4, margin: 0 }}>
                      {writtenChapters[i - 1]?.title}
                    </p>
                  </button>
                )}
                {i < writtenChapters.length - 1 && (
                  <button
                    onClick={goToNext}
                    style={{
                      flex: 1, padding: '12px 14px',
                      border: `1px solid ${TOKENS.borderLight}`,
                      borderRadius: 12, background: TOKENS.bg,
                      cursor: 'pointer', textAlign: 'right',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = TOKENS.warm;
                      e.currentTarget.style.borderColor = TOKENS.border;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = TOKENS.bg;
                      e.currentTarget.style.borderColor = TOKENS.borderLight;
                    }}
                  >
                    <p style={{ fontSize: 10, color: TOKENS.muted, fontFamily: TOKENS.sans, marginBottom: 4, letterSpacing: 1 }}>다음 장 →</p>
                    <p style={{ fontSize: 13, color: TOKENS.text, fontFamily: TOKENS.serif, lineHeight: 1.4, margin: 0 }}>
                      {writtenChapters[i + 1]?.title}
                    </p>
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}

      {/* ── 하단 CTA ── */}
      <div style={{ background: TOKENS.dark, color: '#FAFAF9', padding: 'clamp(60px, 10vw, 96px) clamp(24px, 6vw, 80px)', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          {/* 아이콘 */}
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>

          <p style={{ fontSize: 11, letterSpacing: 4, color: 'rgba(255,255,255,0.35)', fontFamily: TOKENS.sans, marginBottom: 14, textTransform: 'uppercase' }}>
            Your Story
          </p>
          <h3 style={{ fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', fontWeight: 300, fontFamily: TOKENS.serif, lineHeight: 1.4, marginBottom: 14, color: '#FAFAF9' }}>
            당신의 이야기도<br />
            <em style={{ fontStyle: 'normal', color: GOLD }}>한 권의 책</em>이 됩니다
          </h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', fontFamily: TOKENS.sans, lineHeight: 1.7, marginBottom: 32 }}>
            AI와의 대화로 자연스럽게 이야기를 나누면<br />
            나의이야기가 멋진 책으로 완성해드립니다
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320, margin: '0 auto' }}>
            <a
              href="/"
              style={{
                display: 'block', padding: '15px 0',
                background: `linear-gradient(135deg, ${ACCENT}, ${GOLD})`,
                color: '#fff', borderRadius: 40,
                fontSize: 15, fontFamily: TOKENS.sans, fontWeight: 600,
                textDecoration: 'none', letterSpacing: 0.3,
                boxShadow: `0 6px 24px ${ACCENT}55`,
              }}
            >
              나의이야기 무료로 시작하기
            </a>
            <button
              onClick={handleNativeShare}
              style={{
                display: 'block', padding: '12px 0',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'rgba(255,255,255,0.65)', borderRadius: 40,
                fontSize: 14, fontFamily: TOKENS.sans,
                cursor: 'pointer', letterSpacing: 0.2,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
            >
              {copied ? '✓ 링크 복사됨' : '이 책 공유하기'}
            </button>
          </div>
        </div>
      </div>

      {/* ── 플로팅 TOC ── */}
      {writtenChapters.length > 1 && (
        <>
          <button
            onClick={() => setTocOpen((v) => !v)}
            title="목차"
            style={{
              position: 'fixed', right: 20, bottom: 24, zIndex: 50,
              width: 44, height: 44, borderRadius: '50%',
              background: tocOpen ? TOKENS.dark : TOKENS.card,
              color: tocOpen ? '#FAFAF9' : TOKENS.subtext,
              border: `1px solid ${tocOpen ? TOKENS.dark : TOKENS.border}`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          {tocOpen && (
            <>
              <div onClick={() => setTocOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
              <div style={{
                position: 'fixed', right: 20, bottom: 76, zIndex: 50,
                background: TOKENS.card, borderRadius: 14,
                padding: '14px 0',
                boxShadow: '0 12px 40px rgba(0,0,0,0.16)',
                border: `1px solid ${TOKENS.borderLight}`,
                minWidth: 230, maxWidth: 290, maxHeight: '64vh', overflowY: 'auto',
              }}>
                <p style={{ fontSize: 10, color: TOKENS.muted, letterSpacing: 3, fontFamily: TOKENS.sans, padding: '0 16px 10px', borderBottom: `1px solid ${TOKENS.borderLight}`, margin: 0, textTransform: 'uppercase' }}>
                  목 차
                </p>
                {writtenChapters.map((ch, idx) => (
                  <button
                    key={ch.id}
                    onClick={() => scrollTo(ch.id, true)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '10px 16px', background: activeIdx === idx ? ACCENT_BG : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      borderLeft: `2px solid ${activeIdx === idx ? ACCENT : 'transparent'}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 10, color: activeIdx === idx ? ACCENT : TOKENS.light, fontFamily: TOKENS.sans, minWidth: 20, marginTop: 2, fontWeight: 600 }}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: 13, fontFamily: TOKENS.serif, color: TOKENS.text, fontWeight: activeIdx === idx ? 500 : 400, lineHeight: 1.5 }}>
                      {ch.title}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
