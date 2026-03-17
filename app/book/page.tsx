'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useBook, Chapter, Photo, CoverTemplateId } from '@/lib/book-context';
import { TOKENS, FONT_SIZE_PRESETS } from '@/lib/design-tokens';
import PrintBook from '@/components/book/PrintBook';

/* ── FlipBook: SSR 없이 동적 로드 ── */
const FlipBook = dynamic(() => import('@/components/book/FlipBook'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: 300, height: 430,
      background: TOKENS.card, borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: TOKENS.muted, fontFamily: TOKENS.sans, fontSize: 13,
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    }}>
      책 준비 중…
    </div>
  ),
});

/* ── 표지 템플릿 ── */
const COVER_TEMPLATES = [
  { id: 'classic', label: '클래식', gradient: `linear-gradient(180deg, #3D3530, #2C2824)`, textColor: '#FAFAF9', accentOpacity: 0.25 },
  { id: 'dawn',    label: '새벽',   gradient: `linear-gradient(180deg, #1a2a4a, #0d1b2e)`, textColor: '#FAFAF9', accentOpacity: 0.3 },
  { id: 'sunset',  label: '황혼',   gradient: `linear-gradient(160deg, #704214, #9B6A2F)`, textColor: '#FAFAF9', accentOpacity: 0.3 },
  { id: 'spring',  label: '봄날',   gradient: `linear-gradient(180deg, #F0EBE3, #E5DDD5)`, textColor: '#3D3530', accentOpacity: 0.2 },
] as const;

// CoverTemplateId는 book-context에서 import

/* ── 판형 ── */
const PAPER_SIZES = [
  { id: 'A5', label: 'A5', css: 'A5 portrait', desc: '148 × 210mm — 일반 단행본' },
  { id: 'A4', label: 'A4', css: 'A4 portrait', desc: '210 × 297mm — 표준 문서' },
  { id: 'B5', label: 'B5', css: '176mm 250mm portrait', desc: '176 × 250mm — 국판' },
  { id: 'B6', label: 'B6', css: '125mm 176mm portrait', desc: '125 × 176mm — 소형 단행본' },
] as const;
type PaperSizeId = typeof PAPER_SIZES[number]['id'];

/* ── 챕터 유틸 ── */
function getChapterText(chapter: Chapter): string {
  if (chapter.prose?.length > 0) return chapter.prose;
  return chapter.messages.filter((m) => m.type === 'user').map((m) => m.text).join('\n\n');
}
function getChapterPhotos(chapter: Chapter): { data: string; caption: string; isFeatured?: boolean }[] {
  const chatPhotos = chapter.messages
    .filter((m) => m.type === 'photo' && m.text)
    .map((m) => ({ data: m.text, caption: '', isFeatured: false }));
  const directPhotos = (chapter.photos || []).map((p: Photo) => ({
    data: p.data, caption: p.caption || '', isFeatured: p.isFeatured ?? false,
  }));
  return [...chatPhotos, ...directPhotos];
}

/* ── 인라인 사진 렌더 (prose [PHOTO:id] 마커 제거) ── */
function cleanProse(prose: string): string {
  return prose.replace(/\[PHOTO:[a-z0-9]+\]/g, '').trim();
}

/* ─────────────────────────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────────────────────────────── */
export default function BookPage() {
  const router = useRouter();
  const { state, setCoverTemplateId } = useBook();

  const [viewMode, setViewMode] = useState<'read' | 'flip'>('read');

  /* 출판 모달 */
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [adminPw, setAdminPw] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [selectedSize, setSelectedSize] = useState<PaperSizeId>('A5');
  const [isPrinting, setIsPrinting] = useState(false);

  /* 챕터 네비게이션 */
  const [tocOpen, setTocOpen] = useState(false);
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);

  /* 공유 */
  const [isPublic, setIsPublic] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  /* 가족 링크 */
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [familyCopied, setFamilyCopied] = useState(false);

  const chapterRefs = useRef<Record<string, HTMLElement | null>>({});

  /* is_public + share_token 초기값 로드 */
  useEffect(() => {
    if (!state.bookId) return;
    fetch(`/api/books/${state.bookId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.book?.is_public) setIsPublic(true);
        if (data.book?.share_token) setShareToken(data.book.share_token);
      })
      .catch(() => {});
  }, [state.bookId]);

  const togglePublic = async () => {
    if (!state.bookId) return;
    const next = !isPublic;
    setShareLoading(true);
    try {
      const res = await fetch(`/api/books/${state.bookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: next }),
      });
      if (res.ok) setIsPublic(next);
    } catch { /* ignore */ }
    finally { setShareLoading(false); }
  };

  const copyShareUrl = () => {
    const url = `${window.location.origin}/shared/${state.bookId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const generateFamilyLink = async () => {
    if (!state.bookId) return;
    setFamilyLoading(true);
    try {
      const res = await fetch(`/api/books/${state.bookId}/share`, { method: 'POST' });
      const data = await res.json();
      if (data.token) setShareToken(data.token);
    } catch { /* ignore */ }
    finally { setFamilyLoading(false); }
  };

  const revokeFamilyLink = async () => {
    if (!state.bookId) return;
    setFamilyLoading(true);
    try {
      await fetch(`/api/books/${state.bookId}/share`, { method: 'DELETE' });
      setShareToken(null);
    } catch { /* ignore */ }
    finally { setFamilyLoading(false); }
  };

  const copyFamilyUrl = () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/shared/${state.bookId}?token=${shareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setFamilyCopied(true);
      setTimeout(() => setFamilyCopied(false), 2000);
    });
  };

  const [interviewerCopied, setInterviewerCopied] = useState(false);
  const copyInterviewerUrl = () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/interviewer/${state.bookId}?token=${shareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setInterviewerCopied(true);
      setTimeout(() => setInterviewerCopied(false), 2000);
    });
  };

  const coverTemplate = COVER_TEMPLATES.find((t) => t.id === state.coverTemplateId) ?? COVER_TEMPLATES[0];
  const fontPreset = FONT_SIZE_PRESETS[state.fontSize];
  const writtenChapters = state.chapters.filter(
    (c) => getChapterText(c).length > 0 || getChapterPhotos(c).length > 0
  );

  /* ── 표지 순환 ── */
  const handleCoverChange = () => {
    const idx = COVER_TEMPLATES.findIndex((t) => t.id === state.coverTemplateId);
    setCoverTemplateId(COVER_TEMPLATES[(idx + 1) % COVER_TEMPLATES.length].id);
  };

  /* ── IntersectionObserver: 현재 챕터 감지 ── */
  useEffect(() => {
    if (viewMode !== 'read') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = writtenChapters.findIndex((c) => c.id === entry.target.id);
            if (idx >= 0) setActiveChapterIdx(idx);
          }
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    );
    Object.values(chapterRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, writtenChapters.length]);

  /* ── 챕터 스크롤 ── */
  const scrollToChapter = (id: string, closePanel = false) => {
    chapterRefs.current[id]?.scrollIntoView({ behavior: 'smooth' });
    if (closePanel) setTocOpen(false);
  };

  const goToPrevChapter = useCallback(() => {
    if (activeChapterIdx > 0) scrollToChapter(writtenChapters[activeChapterIdx - 1].id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChapterIdx, writtenChapters]);

  const goToNextChapter = useCallback(() => {
    if (activeChapterIdx < writtenChapters.length - 1) scrollToChapter(writtenChapters[activeChapterIdx + 1].id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChapterIdx, writtenChapters]);

  /* ── 관리자 인증 ── */
  const handleVerify = async () => {
    if (!adminPw) return;
    setAdminLoading(true);
    setAdminError('');
    try {
      const res = await fetch('/api/admin/settings', { headers: { 'x-admin-password': adminPw } });
      if (res.ok) { setModalStep(2); }
      else { setAdminError('비밀번호가 올바르지 않습니다.'); }
    } catch { setAdminError('서버 오류가 발생했습니다.'); }
    finally { setAdminLoading(false); }
  };

  /* ── PDF 출력 ── */
  const handlePrint = () => {
    const sizeObj = PAPER_SIZES.find((s) => s.id === selectedSize) ?? PAPER_SIZES[0];
    setIsPrinting(true);
    const styleEl = document.createElement('style');
    styleEl.id = 'print-size-override';
    styleEl.textContent = `@media print { @page { size: ${sizeObj.css}; } }`;
    document.head.appendChild(styleEl);
    setTimeout(() => {
      window.print();
      document.getElementById('print-size-override')?.remove();
      setIsPrinting(false);
      closeModal();
    }, 200);
  };

  const closeModal = () => { setShowModal(false); setModalStep(1); setAdminPw(''); setAdminError(''); };
  const openModal  = () => { setModalStep(1); setAdminPw(''); setAdminError(''); setShowModal(true); };

  /* ── 일반 PDF 저장 (A5 고정, 비밀번호 없음) ── */
  const handleQuickPrint = () => {
    const styleEl = document.createElement('style');
    styleEl.id = 'print-size-override';
    styleEl.textContent = `@media print { @page { size: A5 portrait; } }`;
    document.head.appendChild(styleEl);
    setTimeout(() => {
      window.print();
      document.getElementById('print-size-override')?.remove();
    }, 200);
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#fff', fontFamily: TOKENS.serif }}>

      {/* ── Sticky 헤더 ── */}
      <div className="no-print" style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${TOKENS.borderLight}`,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 16px', height: 52,
      }}>
        <button onClick={() => router.back()} style={{
          background: 'none', border: 'none', fontSize: 13, color: TOKENS.subtext,
          cursor: 'pointer', fontFamily: TOKENS.sans, padding: '8px 4px', minHeight: 44,
        }}>
          ← 편집으로
        </button>

        <span style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600, color: TOKENS.text, letterSpacing: '-0.02em' }}>
          {state.title || '나의 이야기'}
        </span>

        {/* 공유 버튼 */}
        {state.bookId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={togglePublic}
              disabled={shareLoading}
              title={isPublic ? '공개 중 — 클릭하면 비공개로 전환' : '클릭하면 공개 URL 생성'}
              style={{
                padding: '6px 11px', borderRadius: TOKENS.radiusSm,
                border: `1px solid ${isPublic ? '#86EFAC' : TOKENS.border}`,
                background: isPublic ? '#F0FDF4' : TOKENS.bg,
                color: isPublic ? '#16A34A' : TOKENS.muted,
                fontSize: 11, fontFamily: TOKENS.sans, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, minHeight: 32,
                transition: 'all 0.15s',
              }}
            >
              {isPublic ? '● 공개' : '○ 공유'}
            </button>
            {isPublic && (
              <button
                onClick={copyShareUrl}
                style={{
                  padding: '6px 10px', borderRadius: TOKENS.radiusSm,
                  border: `1px solid ${copied ? '#86EFAC' : TOKENS.border}`,
                  background: copied ? '#F0FDF4' : TOKENS.bg,
                  color: copied ? '#16A34A' : TOKENS.muted,
                  fontSize: 11, fontFamily: TOKENS.sans, cursor: 'pointer',
                  minHeight: 32, transition: 'all 0.15s',
                }}
              >
                {copied ? '복사됨' : 'URL 복사'}
              </button>
            )}
          </div>
        )}

        {/* 읽기/미리보기 탭 */}
        <div style={{ display: 'flex', background: TOKENS.warm, borderRadius: 8, padding: 3, gap: 2 }}>
          {(['read', 'flip'] as const).map((mode) => (
            <button key={mode} onClick={() => setViewMode(mode)} style={{
              padding: '5px 10px', borderRadius: 6, border: 'none', fontSize: 12,
              fontFamily: TOKENS.sans, cursor: 'pointer', minHeight: 32,
              background: viewMode === mode ? '#fff' : 'transparent',
              color: viewMode === mode ? TOKENS.text : TOKENS.muted,
              fontWeight: viewMode === mode ? 600 : 400,
              boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}>
              {mode === 'read' ? '읽기' : '미리보기'}
            </button>
          ))}
        </div>

        {/* 가족 공유 링크 */}
        {state.bookId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {!shareToken ? (
              <button
                onClick={generateFamilyLink}
                disabled={familyLoading}
                title="가족에게만 보이는 비공개 링크 생성"
                style={{
                  padding: '6px 11px', borderRadius: TOKENS.radiusSm,
                  border: `1px solid ${TOKENS.border}`, background: TOKENS.bg,
                  color: TOKENS.muted, fontSize: 11, fontFamily: TOKENS.sans,
                  cursor: 'pointer', minHeight: 32, whiteSpace: 'nowrap',
                }}
              >
                {familyLoading ? '…' : '가족 링크'}
              </button>
            ) : (
              <>
                <button
                  onClick={copyFamilyUrl}
                  style={{
                    padding: '6px 10px', borderRadius: TOKENS.radiusSm,
                    border: `1px solid ${familyCopied ? '#93C5FD' : TOKENS.border}`,
                    background: familyCopied ? '#EFF6FF' : TOKENS.bg,
                    color: familyCopied ? '#1D4ED8' : TOKENS.subtext,
                    fontSize: 11, fontFamily: TOKENS.sans, cursor: 'pointer',
                    minHeight: 32, transition: 'all 0.15s', whiteSpace: 'nowrap',
                  }}
                >
                  {familyCopied ? '복사됨' : '가족 링크'}
                </button>
                <button
                  onClick={copyInterviewerUrl}
                  title="가족이 직접 질문할 수 있는 인터뷰어 링크 복사"
                  style={{
                    padding: '6px 10px', borderRadius: TOKENS.radiusSm,
                    border: `1px solid ${interviewerCopied ? '#DDD6FE' : TOKENS.border}`,
                    background: interviewerCopied ? '#F5F3FF' : TOKENS.bg,
                    color: interviewerCopied ? '#7C3AED' : TOKENS.subtext,
                    fontSize: 11, fontFamily: TOKENS.sans, cursor: 'pointer',
                    minHeight: 32, transition: 'all 0.15s', whiteSpace: 'nowrap',
                  }}
                >
                  {interviewerCopied ? '복사됨' : '인터뷰어'}
                </button>
                <button
                  onClick={revokeFamilyLink}
                  disabled={familyLoading}
                  title="가족 링크 해제"
                  style={{
                    padding: '6px 8px', borderRadius: TOKENS.radiusSm,
                    border: `1px solid ${TOKENS.border}`, background: TOKENS.bg,
                    color: TOKENS.muted, fontSize: 11, fontFamily: TOKENS.sans,
                    cursor: 'pointer', minHeight: 32,
                  }}
                >
                  ✕
                </button>
              </>
            )}
          </div>
        )}

        <button onClick={handleQuickPrint} style={{
          background: 'transparent', color: TOKENS.subtext,
          border: `1px solid ${TOKENS.border}`,
          borderRadius: TOKENS.radiusSm, fontSize: 12, fontFamily: TOKENS.sans,
          cursor: 'pointer', padding: '7px 12px', minHeight: 36, whiteSpace: 'nowrap',
        }}>
          PDF 저장
        </button>

        <button onClick={openModal} style={{
          background: TOKENS.dark, color: '#FAFAF9', border: 'none',
          borderRadius: TOKENS.radiusSm, fontSize: 12, fontFamily: TOKENS.sans,
          fontWeight: 500, cursor: 'pointer', padding: '7px 12px', minHeight: 36, whiteSpace: 'nowrap',
        }}>
          📖 출판하기
        </button>
      </div>

      {/* ════════════════════════════════════════
          읽기 모드 (Brunch 스타일 스크롤)
      ════════════════════════════════════════ */}
      {viewMode === 'read' && (
        <>
          {/* ── 책 표지 히어로 ── */}
          <div style={{
            background: coverTemplate.gradient,
            color: coverTemplate.textColor,
            padding: 'clamp(60px, 15vw, 100px) clamp(20px, 6vw, 80px) clamp(40px, 8vw, 60px)',
            position: 'relative',
            minHeight: '45vh',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          }}>
            {/* 표지 선택 도트 (no-print) */}
            <div className="no-print" style={{ position: 'absolute', top: 16, right: 72, display: 'flex', gap: 8 }}>
              {COVER_TEMPLATES.map((tpl) => (
                <button key={tpl.id} onClick={() => setCoverTemplateId(tpl.id)} title={tpl.label}
                  style={{
                    width: 18, height: 18, borderRadius: '50%', background: tpl.gradient,
                    border: state.coverTemplateId === tpl.id ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent',
                    cursor: 'pointer', outline: 'none',
                    transform: state.coverTemplateId === tpl.id ? 'scale(1.3)' : 'scale(1)',
                    transition: 'transform 0.15s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  }}
                />
              ))}
            </div>

            <div style={{ maxWidth: 680, width: '100%' }}>
              <div style={{ width: 32, height: 1, background: coverTemplate.textColor, opacity: coverTemplate.accentOpacity * 2, marginBottom: 20 }} />
              <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', fontWeight: 300, letterSpacing: '-0.03em', marginBottom: 10, lineHeight: 1.25 }}>
                {state.title || '나의 이야기'}
              </h1>
              <p style={{ fontSize: 'clamp(14px, 2.5vw, 16px)', opacity: 0.65, fontWeight: 300, margin: 0 }}>
                {state.author || '저자'}
              </p>
              <p style={{ fontSize: 11, opacity: 0.3, marginTop: 16, fontFamily: TOKENS.sans, letterSpacing: 3 }}>
                나의이야기 · {new Date().getFullYear()}
              </p>
            </div>
          </div>

          {/* ── 목차 ── */}
          {writtenChapters.length > 0 && (
            <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 24px' }}>
              <p style={{ fontSize: 11, color: TOKENS.muted, letterSpacing: 4, fontFamily: TOKENS.sans, textAlign: 'center', marginBottom: 24 }}>
                목 차
              </p>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {state.chapters.map((ch, i) => (
                  <button key={ch.id} onClick={() => scrollToChapter(ch.id)} style={{
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
          {writtenChapters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 24px', color: TOKENS.muted, fontFamily: TOKENS.sans }}>
              아직 작성된 이야기가 없습니다
            </div>
          ) : (
            writtenChapters.map((ch, i) => {
              const photos = getChapterPhotos(ch);
              const featuredPhoto = photos.find((p) => p.isFeatured) ?? (photos.length > 0 ? photos[0] : null);
              const otherPhotos = photos.filter((p) => p !== featuredPhoto);

              // prose 내 [PHOTO:id] 마커 제거 후 텍스트만 추출
              const rawText = getChapterText(ch);
              const bodyText = ch.prose ? cleanProse(ch.prose) : rawText;

              return (
                <article
                  key={ch.id}
                  id={ch.id}
                  ref={(el) => { chapterRefs.current[ch.id] = el; }}
                  style={{ marginBottom: 0 }}
                >
                  {/* ── 섹션 헤더 ── */}
                  {featuredPhoto ? (
                    /* 대표사진 있음: 풀 블리드 이미지 위에 제목 오버레이 */
                    <div style={{
                      position: 'relative',
                      height: 'clamp(280px, 50vw, 480px)',
                      overflow: 'hidden',
                    }}>
                      <img
                        src={featuredPhoto.data} alt={featuredPhoto.caption || ''}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      {/* 그라데이션 오버레이 */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)',
                      }} />
                      {/* 제목 */}
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        padding: 'clamp(20px, 4vw, 40px) clamp(20px, 6vw, 80px)',
                        color: '#fff',
                      }}>
                        <p style={{ fontSize: 12, letterSpacing: 3, opacity: 0.6, fontFamily: TOKENS.sans, marginBottom: 8 }}>
                          제 {String(i + 1).padStart(2, '0')} 장
                        </p>
                        <h2 style={{ fontSize: 'clamp(1.3rem, 4vw, 1.9rem)', fontWeight: 300, lineHeight: 1.3, margin: 0, letterSpacing: '-0.02em' }}>
                          {ch.title}
                        </h2>
                      </div>
                    </div>
                  ) : (
                    /* 사진 없음: 심플 텍스트 헤더 */
                    <div style={{
                      padding: 'clamp(48px, 8vw, 72px) clamp(20px, 6vw, 80px) 32px',
                      borderTop: i > 0 ? `1px solid ${TOKENS.borderLight}` : undefined,
                      textAlign: 'center',
                    }}>
                      <p style={{ fontSize: 11, color: TOKENS.muted, letterSpacing: 4, fontFamily: TOKENS.sans, marginBottom: 12 }}>
                        제 {String(i + 1).padStart(2, '0')} 장
                      </p>
                      <h2 style={{ fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', fontWeight: 300, lineHeight: 1.4, margin: '0 0 16px', letterSpacing: '-0.02em', color: TOKENS.text }}>
                        {ch.title}
                      </h2>
                      <div style={{ width: 32, height: 1, background: TOKENS.accent, margin: '0 auto', opacity: 0.4 }} />
                    </div>
                  )}

                  {/* ── 본문 ── */}
                  <div style={{
                    maxWidth: 680, margin: '0 auto',
                    padding: featuredPhoto
                      ? 'clamp(32px, 5vw, 56px) clamp(20px, 6vw, 80px)'
                      : 'clamp(24px, 4vw, 40px) clamp(20px, 6vw, 80px)',
                  }}>
                    {/* 대표사진 캡션 */}
                    {featuredPhoto?.caption && (
                      <p style={{ fontSize: 12, color: TOKENS.muted, fontFamily: TOKENS.sans, textAlign: 'center', marginBottom: 28, fontStyle: 'italic' }}>
                        {featuredPhoto.caption}
                      </p>
                    )}

                    {/* 본문 텍스트 */}
                    {bodyText.split('\n\n').filter(Boolean).map((para, j) => (
                      <p key={j} style={{
                        fontSize: fontPreset.book,
                        lineHeight: fontPreset.lineHeight,
                        color: TOKENS.text, marginBottom: '1.2em',
                        fontWeight: 300, wordBreak: 'keep-all',
                      }}>
                        {para}
                      </p>
                    ))}

                    {/* 추가 사진 (대표사진 제외) */}
                    {otherPhotos.map((photo, j) => (
                      <figure key={j} style={{ margin: '2em 0' }}>
                        <img
                          src={photo.data} alt={photo.caption || ''}
                          style={{ width: '100%', borderRadius: 4, display: 'block', maxHeight: '60vh', objectFit: 'cover' }}
                        />
                        {photo.caption && (
                          <figcaption style={{ fontSize: 12, color: TOKENS.muted, textAlign: 'center', marginTop: 10, fontFamily: TOKENS.sans, fontStyle: 'italic' }}>
                            {photo.caption}
                          </figcaption>
                        )}
                      </figure>
                    ))}

                    {/* 이전/다음 챕터 네비게이션 */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '40px 0 8px', gap: 12,
                    }}>
                      <button
                        onClick={goToPrevChapter}
                        disabled={i === 0}
                        style={{
                          padding: '10px 16px', border: `1px solid ${TOKENS.borderLight}`,
                          borderRadius: 8, background: i === 0 ? 'transparent' : TOKENS.warm,
                          color: i === 0 ? TOKENS.light : TOKENS.subtext,
                          fontSize: 12, fontFamily: TOKENS.sans, cursor: i === 0 ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6, minHeight: 40,
                          opacity: i === 0 ? 0 : 1, pointerEvents: i === 0 ? 'none' : 'auto',
                        }}
                      >
                        ← {writtenChapters[i - 1]?.title}
                      </button>
                      <div style={{ color: TOKENS.light, letterSpacing: 10, fontSize: 13 }}>· · ·</div>
                      <button
                        onClick={goToNextChapter}
                        disabled={i === writtenChapters.length - 1}
                        style={{
                          padding: '10px 16px', border: `1px solid ${TOKENS.borderLight}`,
                          borderRadius: 8, background: i === writtenChapters.length - 1 ? 'transparent' : TOKENS.warm,
                          color: i === writtenChapters.length - 1 ? TOKENS.light : TOKENS.subtext,
                          fontSize: 12, fontFamily: TOKENS.sans,
                          cursor: i === writtenChapters.length - 1 ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6, minHeight: 40,
                          opacity: i === writtenChapters.length - 1 ? 0 : 1,
                          pointerEvents: i === writtenChapters.length - 1 ? 'none' : 'auto',
                        }}
                      >
                        {writtenChapters[i + 1]?.title} →
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}

          <div style={{ height: 80 }} />
        </>
      )}

      {/* ════════════════════════════════════════
          미리보기 모드 (FlipBook)
      ════════════════════════════════════════ */}
      {viewMode === 'flip' && (
        <>
          {/* 표지 선택 */}
          <div className="no-print" style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', padding: '14px 0 8px' }}>
            <span style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, letterSpacing: 2 }}>표지</span>
            {COVER_TEMPLATES.map((tpl) => (
              <button key={tpl.id} onClick={() => setCoverTemplateId(tpl.id)} title={tpl.label}
                style={{
                  width: 22, height: 22, borderRadius: '50%', background: tpl.gradient,
                  border: state.coverTemplateId === tpl.id ? '2px solid rgba(0,0,0,0.35)' : '2px solid transparent',
                  cursor: 'pointer', outline: 'none',
                  boxShadow: state.coverTemplateId === tpl.id ? '0 0 0 2px rgba(255,255,255,0.7)' : 'none',
                  transform: state.coverTemplateId === tpl.id ? 'scale(1.25)' : 'scale(1)',
                  transition: 'transform 0.15s',
                }}
              />
            ))}
          </div>

          <div className="flip-wrapper" style={{ display: 'flex', justifyContent: 'center', padding: '16px 0 56px' }}>
            <FlipBook
              title={state.title}
              author={state.author}
              chapters={state.chapters}
              coverTemplate={coverTemplate}
              fontPreset={fontPreset}
              onCoverChange={handleCoverChange}
            />
          </div>
        </>
      )}

      {/* ── 플로팅 TOC 버튼 + 패널 (읽기 모드만) ── */}
      {viewMode === 'read' && writtenChapters.length > 1 && (
        <>
          {/* TOC 열기 버튼 */}
          <button
            className="no-print"
            onClick={() => setTocOpen((v) => !v)}
            title="목차"
            style={{
              position: 'fixed', right: 20, bottom: 80, zIndex: 50,
              width: 44, height: 44, borderRadius: '50%',
              background: tocOpen ? TOKENS.dark : TOKENS.card,
              color: tocOpen ? '#FAFAF9' : TOKENS.text,
              border: `1px solid ${TOKENS.border}`,
              boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, transition: 'all 0.2s',
            }}
          >
            ≡
          </button>

          {/* TOC 패널 */}
          {tocOpen && (
            <div
              className="no-print"
              style={{
                position: 'fixed', right: 20, bottom: 132, zIndex: 50,
                background: TOKENS.card, borderRadius: 12, padding: '16px 0',
                boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
                border: `1px solid ${TOKENS.borderLight}`,
                minWidth: 220, maxWidth: 280,
                maxHeight: '60vh', overflowY: 'auto',
              }}
            >
              <p style={{
                fontSize: 10, color: TOKENS.muted, letterSpacing: 3,
                fontFamily: TOKENS.sans, padding: '0 16px 10px',
                borderBottom: `1px solid ${TOKENS.borderLight}`, margin: 0,
              }}>
                목 차
              </p>
              {writtenChapters.map((ch, idx) => (
                <button
                  key={ch.id}
                  onClick={() => scrollToChapter(ch.id, true)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px', background: activeChapterIdx === idx ? TOKENS.warm : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    borderLeft: activeChapterIdx === idx ? `2px solid ${TOKENS.accent}` : '2px solid transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{ fontSize: 10, color: TOKENS.muted, fontFamily: TOKENS.sans, minWidth: 18 }}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span style={{
                    fontSize: 13, fontFamily: TOKENS.serif, color: TOKENS.text,
                    fontWeight: activeChapterIdx === idx ? 500 : 400, lineHeight: 1.4,
                  }}>
                    {ch.title}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* TOC 열릴 때 외부 클릭으로 닫기 */}
          {tocOpen && (
            <div
              onClick={() => setTocOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 49 }}
            />
          )}
        </>
      )}

      {/* ── PrintBook (화면 숨김 / 인쇄 표시) ── */}
      <PrintBook
        title={state.title}
        author={state.author}
        chapters={state.chapters}
        coverGradient={coverTemplate.gradient}
        coverTextColor={coverTemplate.textColor}
      />

      {/* ── 관리자 출판 모달 ── */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{ background: TOKENS.card, borderRadius: 14, padding: '28px 24px', width: '100%', maxWidth: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

            {modalStep === 1 && (
              <>
                <p style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, letterSpacing: 3, marginBottom: 8 }}>책 출판하기</p>
                <h3 style={{ fontSize: 17, fontWeight: 500, marginBottom: 4, color: TOKENS.text }}>관리자 인증</h3>
                <p style={{ fontSize: 13, color: TOKENS.muted, marginBottom: 20, fontFamily: TOKENS.sans, lineHeight: 1.6 }}>
                  PDF 저장은 관리자만 사용할 수 있습니다.<br />관리자 비밀번호를 입력해 주세요.
                </p>
                <input
                  type="password" value={adminPw} autoFocus
                  onChange={(e) => { setAdminPw(e.target.value); if (adminError) setAdminError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleVerify(); }}
                  placeholder="관리자 비밀번호"
                  style={{ width: '100%', padding: '13px 14px', border: `1px solid ${adminError ? '#e53e3e' : TOKENS.border}`, borderRadius: TOKENS.radiusSm, fontSize: 15, fontFamily: TOKENS.sans, outline: 'none', boxSizing: 'border-box', background: TOKENS.bg, color: TOKENS.text }}
                />
                {adminError && <p style={{ fontSize: 12, color: '#e53e3e', marginTop: 6, fontFamily: TOKENS.sans }}>{adminError}</p>}
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: '12px 0', background: 'transparent', border: `1px solid ${TOKENS.border}`, borderRadius: TOKENS.radiusSm, fontSize: 14, fontFamily: TOKENS.sans, cursor: 'pointer', color: TOKENS.muted, minHeight: 48 }}>취소</button>
                  <button onClick={handleVerify} disabled={adminLoading || !adminPw}
                    style={{ flex: 2, padding: '12px 0', background: adminLoading || !adminPw ? TOKENS.muted : TOKENS.dark, color: '#FAFAF9', border: 'none', borderRadius: TOKENS.radiusSm, fontSize: 14, fontFamily: TOKENS.sans, fontWeight: 500, cursor: adminLoading || !adminPw ? 'not-allowed' : 'pointer', minHeight: 48, opacity: adminLoading || !adminPw ? 0.65 : 1 }}>
                    {adminLoading ? '확인 중…' : '확인'}
                  </button>
                </div>
              </>
            )}

            {modalStep === 2 && (
              <>
                <p style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, letterSpacing: 3, marginBottom: 8 }}>책 출판하기</p>
                <h3 style={{ fontSize: 17, fontWeight: 500, marginBottom: 4, color: TOKENS.text }}>판형 선택</h3>
                <p style={{ fontSize: 13, color: TOKENS.muted, marginBottom: 20, fontFamily: TOKENS.sans }}>PDF로 저장할 종이 크기를 선택하세요.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {PAPER_SIZES.map((size) => (
                    <label key={size.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', border: `1.5px solid ${selectedSize === size.id ? TOKENS.accent : TOKENS.border}`, borderRadius: TOKENS.radiusSm, cursor: 'pointer', background: selectedSize === size.id ? TOKENS.warm : TOKENS.card, transition: 'border-color 0.15s, background 0.15s' }}>
                      <input type="radio" name="paperSize" value={size.id} checked={selectedSize === size.id} onChange={() => setSelectedSize(size.id)} style={{ accentColor: TOKENS.accent, width: 16, height: 16 }} />
                      <span style={{ fontSize: 15, fontFamily: TOKENS.sans, fontWeight: selectedSize === size.id ? 500 : 400, color: TOKENS.text }}>{size.label}</span>
                      <span style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, marginLeft: 'auto' }}>{size.desc}</span>
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: '12px 0', background: 'transparent', border: `1px solid ${TOKENS.border}`, borderRadius: TOKENS.radiusSm, fontSize: 14, fontFamily: TOKENS.sans, cursor: 'pointer', color: TOKENS.muted, minHeight: 48 }}>취소</button>
                  <button onClick={handlePrint} disabled={isPrinting}
                    style={{ flex: 2, padding: '12px 0', background: isPrinting ? TOKENS.muted : TOKENS.dark, color: '#FAFAF9', border: 'none', borderRadius: TOKENS.radiusSm, fontSize: 14, fontFamily: TOKENS.sans, fontWeight: 500, cursor: isPrinting ? 'wait' : 'pointer', minHeight: 48 }}>
                    {isPrinting ? '준비 중…' : '📥 PDF로 저장'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
