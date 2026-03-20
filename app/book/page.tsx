'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useBook, Chapter, Photo, CoverTemplateId } from '@/lib/book-context';
import { TOKENS, FONT_SIZE_PRESETS } from '@/lib/design-tokens';
import PrintBook from '@/components/book/PrintBook';

const ACCENT = '#A0522D';
const GOLD = '#C9A96E';
const ACCENT_BG = '#FBF6F1';
const ACCENT_BORDER = '#E8D0BC';

/* ── FlipBook: SSR 없이 동적 로드 ── */
const FlipBook = dynamic(() => import('@/components/book/FlipBook'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: 300, height: 430,
      background: TOKENS.warm, borderRadius: 12,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: TOKENS.muted, fontFamily: TOKENS.sans, fontSize: 13,
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    }}>
      책 준비 중…
    </div>
  ),
});

/* ── 표지 템플릿 ── */
const COVER_TEMPLATES = [
  { id: 'classic', label: '클래식', gradient: `linear-gradient(160deg, #3D3530, #1C1A18)`, textColor: '#FAFAF9', accentOpacity: 0.25 },
  { id: 'dawn',    label: '새벽',   gradient: `linear-gradient(160deg, #1a2a4a, #0d1b2e)`, textColor: '#FAFAF9', accentOpacity: 0.3 },
  { id: 'sunset',  label: '황혼',   gradient: `linear-gradient(160deg, #7a4820, #4a2c10)`, textColor: '#FAFAF9', accentOpacity: 0.3 },
  { id: 'spring',  label: '봄날',   gradient: `linear-gradient(160deg, #E8E0D5, #D4C9BA)`, textColor: '#3D3530', accentOpacity: 0.2 },
] as const;

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
function getChapterPhotos(chapter: Chapter) {
  const chatPhotos = chapter.messages
    .filter((m) => m.type === 'photo' && m.text)
    .map((m) => ({ data: m.text, caption: '', isFeatured: false }));
  const directPhotos = (chapter.photos || []).map((p: Photo) => ({
    data: p.data, caption: p.caption || '', isFeatured: p.isFeatured ?? false,
  }));
  return [...chatPhotos, ...directPhotos];
}
function cleanProse(prose: string): string {
  return prose.replace(/\[PHOTO:[a-z0-9]+\]/g, '').trim();
}

/* ── 드롭캡 렌더 ── */
function renderParagraphs(text: string, fontSize: number, lineHeight: number, isFirst: boolean) {
  const paras = text.split('\n\n').filter(Boolean);
  return paras.map((para, j) => {
    if (j === 0 && isFirst && para.length > 1) {
      const first = para[0];
      const rest = para.slice(1);
      return (
        <p key={j} style={{ fontSize, lineHeight, color: TOKENS.text, marginBottom: '1.4em', fontWeight: 300, wordBreak: 'keep-all' }}>
          <span style={{
            float: 'left', fontSize: fontSize * 3.2, lineHeight: 0.82,
            fontFamily: TOKENS.serif, color: ACCENT,
            marginRight: 6, marginTop: 4, fontWeight: 400,
          }}>{first}</span>
          {rest}
        </p>
      );
    }
    return (
      <p key={j} style={{ fontSize, lineHeight, color: TOKENS.text, marginBottom: '1.4em', fontWeight: 300, wordBreak: 'keep-all' }}>
        {para}
      </p>
    );
  });
}

/* ─────────────────────────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────────────────────────────── */
export default function BookPage() {
  const router = useRouter();
  const { state, setCoverTemplateId } = useBook();

  const [viewMode, setViewMode] = useState<'read' | 'flip'>('read');
  const [readPct, setReadPct] = useState(0);

  /* 공유 패널 */
  const [showSharePanel, setShowSharePanel] = useState(false);

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

  /* 공개 공유 */
  const [isPublic, setIsPublic] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  /* 가족 열람 링크 */
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [familyCopied, setFamilyCopied] = useState(false);

  /* 인터뷰어 링크 */
  const [interviewerToken, setInterviewerToken] = useState<string | null>(null);
  const [interviewerLoading, setInterviewerLoading] = useState(false);
  const [interviewerCopied, setInterviewerCopied] = useState(false);

  /* 이메일 초대 */
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteType, setInviteType] = useState<'reader' | 'interviewer'>('reader');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const chapterRefs = useRef<Record<string, HTMLElement | null>>({});

  /* 읽기 진행률 */
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      setReadPct(total > 0 ? Math.min(100, (el.scrollTop / total) * 100) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* is_public + share_token + interviewer_token 초기값 */
  useEffect(() => {
    if (!state.bookId) return;
    fetch(`/api/books/${state.bookId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.book?.is_public) setIsPublic(true);
        if (data.book?.share_token) setShareToken(data.book.share_token);
        if (data.book?.interviewer_token) setInterviewerToken(data.book.interviewer_token);
      })
      .catch(() => {});
  }, [state.bookId]);

  /* ── 핸들러들 ── */
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
    navigator.clipboard.writeText(`${window.location.origin}/shared/${state.bookId}`).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const generateFamilyLink = async () => {
    if (!state.bookId) return;
    setFamilyLoading(true);
    try {
      const res = await fetch(`/api/books/${state.bookId}/share`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'reader' }),
      });
      const data = await res.json();
      if (data.token) setShareToken(data.token);
    } catch { /* ignore */ }
    finally { setFamilyLoading(false); }
  };

  const revokeFamilyLink = async () => {
    if (!state.bookId) return;
    setFamilyLoading(true);
    try {
      await fetch(`/api/books/${state.bookId}/share?type=reader`, { method: 'DELETE' });
      setShareToken(null);
    } catch { /* ignore */ }
    finally { setFamilyLoading(false); }
  };

  const copyFamilyUrl = () => {
    if (!shareToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/shared/${state.bookId}?token=${shareToken}`).then(() => {
      setFamilyCopied(true); setTimeout(() => setFamilyCopied(false), 2000);
    });
  };

  const generateInterviewerLink = async () => {
    if (!state.bookId) return;
    setInterviewerLoading(true);
    try {
      const res = await fetch(`/api/books/${state.bookId}/share`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'interviewer' }),
      });
      const data = await res.json();
      if (data.token) setInterviewerToken(data.token);
    } catch { /* ignore */ }
    finally { setInterviewerLoading(false); }
  };

  const revokeInterviewerLink = async () => {
    if (!state.bookId) return;
    setInterviewerLoading(true);
    try {
      await fetch(`/api/books/${state.bookId}/share?type=interviewer`, { method: 'DELETE' });
      setInterviewerToken(null);
    } catch { /* ignore */ }
    finally { setInterviewerLoading(false); }
  };

  const copyInterviewerUrl = () => {
    if (!interviewerToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/interviewer/${state.bookId}?token=${interviewerToken}`).then(() => {
      setInterviewerCopied(true); setTimeout(() => setInterviewerCopied(false), 2000);
    });
  };

  const sendInviteEmail = async () => {
    if (!inviteEmail || !state.bookId) return;
    const hasToken = inviteType === 'reader' ? !!shareToken : !!interviewerToken;
    if (!hasToken) return;
    setInviteSending(true);
    setInviteResult(null);
    try {
      const res = await fetch(`/api/books/${state.bookId}/invite`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, type: inviteType }),
      });
      const data = await res.json();
      if (res.ok) { setInviteResult({ ok: true, msg: `${inviteEmail}로 초대장을 보냈습니다` }); setInviteEmail(''); }
      else { setInviteResult({ ok: false, msg: data.error || '발송 실패' }); }
    } catch { setInviteResult({ ok: false, msg: '네트워크 오류가 발생했습니다' }); }
    finally { setInviteSending(false); }
  };

  const coverTemplate = COVER_TEMPLATES.find((t) => t.id === state.coverTemplateId) ?? COVER_TEMPLATES[0];
  const fontPreset = FONT_SIZE_PRESETS[state.fontSize];
  const writtenChapters = state.chapters.filter(
    (c) => getChapterText(c).length > 0 || getChapterPhotos(c).length > 0
  );

  const handleCoverChange = () => {
    const idx = COVER_TEMPLATES.findIndex((t) => t.id === state.coverTemplateId);
    setCoverTemplateId(COVER_TEMPLATES[(idx + 1) % COVER_TEMPLATES.length].id);
  };

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

  const handleVerify = async () => {
    if (!adminPw) return;
    setAdminLoading(true); setAdminError('');
    try {
      const res = await fetch('/api/admin/settings', { headers: { 'x-admin-password': adminPw } });
      if (res.ok) { setModalStep(2); }
      else { setAdminError('비밀번호가 올바르지 않습니다.'); }
    } catch { setAdminError('서버 오류가 발생했습니다.'); }
    finally { setAdminLoading(false); }
  };

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

  const closeModal = () => { setShowModal(false); setModalStep(1); setAdminPw(''); setAdminError(''); };
  const openModal  = () => { setModalStep(1); setAdminPw(''); setAdminError(''); setShowModal(true); };

  /* ══════════════════════════════════════════════════════
     JSX
  ══════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100dvh', background: '#fff', fontFamily: TOKENS.serif }}>

      {/* ── 읽기 진행률 바 ── */}
      {viewMode === 'read' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: `${readPct}%`, height: 2,
          background: `linear-gradient(90deg, ${ACCENT}, ${GOLD})`,
          zIndex: 200, transition: 'width 0.1s linear',
          pointerEvents: 'none',
        }} className="no-print" />
      )}

      {/* ══════════════════════════════════
          슬림 헤더
      ══════════════════════════════════ */}
      <header className="no-print" style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${TOKENS.borderLight}`,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 16px', height: 52,
      }}>
        {/* 뒤로 */}
        <button
          onClick={() => router.back()}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', fontSize: 13,
            color: TOKENS.muted, cursor: 'pointer', fontFamily: TOKENS.sans,
            padding: '8px 4px', minHeight: 44, flexShrink: 0,
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = TOKENS.text)}
          onMouseLeave={(e) => (e.currentTarget.style.color = TOKENS.muted)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          편집
        </button>

        {/* 제목 */}
        <div style={{ flex: 1, overflow: 'hidden', textAlign: 'center' }}>
          <span style={{
            fontSize: 14, fontWeight: 500, color: TOKENS.text,
            letterSpacing: '-0.02em', fontFamily: TOKENS.serif,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            display: 'block',
          }}>
            {state.title || '나의 이야기'}
          </span>
        </div>

        {/* 우측 액션 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* 공유 버튼 */}
          {state.bookId && (
            <button
              onClick={() => setShowSharePanel(true)}
              title="공유 및 초대"
              style={{
                width: 36, height: 36, borderRadius: 9,
                border: `1px solid ${showSharePanel ? ACCENT : TOKENS.border}`,
                background: showSharePanel ? ACCENT_BG : TOKENS.card,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={showSharePanel ? ACCENT : TOKENS.subtext} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              {/* 공개중 인디케이터 */}
              {isPublic && (
                <span style={{
                  position: 'absolute', top: -3, right: -3,
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#4ADE80', border: '1.5px solid #fff',
                }} />
              )}
            </button>
          )}

          {/* PDF 저장 */}
          <button
            onClick={handleQuickPrint}
            title="PDF로 저장"
            style={{
              width: 36, height: 36, borderRadius: 9,
              border: `1px solid ${TOKENS.border}`,
              background: TOKENS.card,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = TOKENS.warm)}
            onMouseLeave={(e) => (e.currentTarget.style.background = TOKENS.card)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TOKENS.subtext} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>

          {/* 출판하기 */}
          <button
            onClick={openModal}
            style={{
              height: 36, padding: '0 14px',
              background: `linear-gradient(135deg, ${TOKENS.dark}, #2D2926)`,
              color: '#FAFAF9', border: 'none',
              borderRadius: 9, fontSize: 12, fontFamily: TOKENS.sans,
              fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'opacity 0.15s',
            }}
          >
            출판
          </button>

          {/* 읽기/미리보기 탭 */}
          <div style={{ display: 'flex', background: TOKENS.warm, borderRadius: 9, padding: 3, gap: 2 }}>
            {(['read', 'flip'] as const).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                padding: '5px 10px', borderRadius: 6, border: 'none', fontSize: 12,
                fontFamily: TOKENS.sans, cursor: 'pointer', minHeight: 30,
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
        </div>
      </header>

      {/* ══════════════════════════════════
          읽기 모드
      ══════════════════════════════════ */}
      {viewMode === 'read' && (
        <>
          {/* 표지 히어로 */}
          <div style={{
            position: 'relative',
            background: coverTemplate.gradient,
            color: coverTemplate.textColor,
            minHeight: '58vh',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            overflow: 'hidden',
          }}>
            {/* 장식 원 */}
            <div style={{ position: 'absolute', top: '12%', right: '6%', width: 'clamp(130px,20vw,190px)', height: 'clamp(130px,20vw,190px)', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: '6%', right: '13%', width: 'clamp(55px,9vw,80px)', height: 'clamp(55px,9vw,80px)', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

            {/* 표지 템플릿 선택 (no-print) */}
            <div className="no-print" style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 7, alignItems: 'center' }}>
              {COVER_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setCoverTemplateId(tpl.id)}
                  title={tpl.label}
                  style={{
                    width: 18, height: 18, borderRadius: '50%', background: tpl.gradient,
                    border: state.coverTemplateId === tpl.id ? '2px solid rgba(255,255,255,0.9)' : '2px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer', outline: 'none',
                    transform: state.coverTemplateId === tpl.id ? 'scale(1.3)' : 'scale(1)',
                    transition: 'transform 0.15s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }}
                />
              ))}
            </div>

            {/* 저자 이니셜 */}
            {state.author && (
              <div style={{
                position: 'absolute', top: 'clamp(28px,6vw,52px)', left: 'clamp(20px,5vw,72px)',
                width: 42, height: 42, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 15, fontFamily: TOKENS.serif, color: coverTemplate.textColor, opacity: 0.8 }}>
                  {state.author[0]}
                </span>
              </div>
            )}

            {/* 텍스트 블록 */}
            <div style={{ maxWidth: 720, padding: 'clamp(56px,10vw,96px) clamp(20px,5vw,72px) clamp(44px,7vw,64px)' }}>
              <p style={{ fontSize: 10, letterSpacing: 4, opacity: 0.35, fontFamily: TOKENS.sans, marginBottom: 18, textTransform: 'uppercase', color: coverTemplate.textColor }}>
                나의이야기 · My Story
              </p>
              <div style={{ width: 36, height: 1, background: coverTemplate.textColor, opacity: 0.25, marginBottom: 18 }} />
              <h1 style={{ fontSize: 'clamp(1.9rem,6vw,2.8rem)', fontWeight: 300, letterSpacing: '-0.03em', marginBottom: 12, lineHeight: 1.2, color: coverTemplate.textColor, fontFamily: TOKENS.serif }}>
                {state.title || '나의 이야기'}
              </h1>
              <p style={{ fontSize: 'clamp(14px,2.5vw,17px)', opacity: 0.6, fontWeight: 300, color: coverTemplate.textColor, margin: '0 0 20px', fontFamily: TOKENS.serif }}>
                {state.author || '저자'}
              </p>
              {writtenChapters.length > 0 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.13)' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={coverTemplate.textColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                  <span style={{ fontSize: 11, color: coverTemplate.textColor, opacity: 0.6, fontFamily: TOKENS.sans, letterSpacing: 0.5 }}>
                    {writtenChapters.length}개의 이야기
                  </span>
                </div>
              )}
            </div>

            {/* 스크롤 힌트 */}
            <div className="no-print" style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, opacity: 0.3 }}>
              <span style={{ fontSize: 9, letterSpacing: 3, fontFamily: TOKENS.sans, color: coverTemplate.textColor, textTransform: 'uppercase' }}>scroll</span>
              <div style={{ width: 1, height: 20, background: coverTemplate.textColor }} />
            </div>
          </div>

          {/* 목차 */}
          {writtenChapters.length > 0 && (
            <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(44px,7vw,64px) clamp(20px,5vw,72px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
                <p style={{ fontSize: 10, color: TOKENS.muted, letterSpacing: 4, fontFamily: TOKENS.sans, textTransform: 'uppercase', margin: 0 }}>목 차</p>
                <div style={{ flex: 1, height: 1, background: TOKENS.borderLight }} />
                <p style={{ fontSize: 10, color: TOKENS.muted, letterSpacing: 2, fontFamily: TOKENS.sans, margin: 0 }}>
                  {writtenChapters.length} Chapters
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {state.chapters.map((ch, i) => (
                  <button
                    key={ch.id}
                    onClick={() => scrollToChapter(ch.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '13px 0', background: 'none', border: 'none',
                      borderBottom: `1px solid ${TOKENS.borderLight}`,
                      cursor: 'pointer', textAlign: 'left', transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.55')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  >
                    <span style={{ fontSize: 11, color: TOKENS.light, fontFamily: TOKENS.sans, fontWeight: 600, minWidth: 26, letterSpacing: 1 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div style={{ flex: 1, borderBottom: `1px dashed ${TOKENS.borderLight}`, marginBottom: 2 }} />
                    <span style={{ fontSize: 15, color: TOKENS.text, fontFamily: TOKENS.serif, lineHeight: 1.4, textAlign: 'right', maxWidth: '68%' }}>
                      {ch.title}
                    </span>
                    <span style={{ color: TOKENS.light, fontSize: 12 }}>↓</span>
                  </button>
                ))}
              </div>
              <div style={{ width: 44, height: 1, background: `linear-gradient(90deg, ${ACCENT}, ${GOLD})`, margin: '36px auto 0', opacity: 0.45 }} />
            </div>
          )}

          {/* 챕터 본문 */}
          {writtenChapters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 24px' }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <p style={{ fontSize: 15, fontFamily: TOKENS.serif, color: TOKENS.text, marginBottom: 6 }}>아직 작성된 이야기가 없습니다</p>
              <p style={{ fontSize: 13, color: TOKENS.muted, fontFamily: TOKENS.sans }}>글쓰기로 돌아가 이야기를 시작해보세요</p>
            </div>
          ) : (
            writtenChapters.map((ch, i) => {
              const photos = getChapterPhotos(ch);
              const featuredPhoto = photos.find((p) => p.isFeatured) ?? (photos.length > 0 ? photos[0] : null);
              const otherPhotos = photos.filter((p) => p !== featuredPhoto);
              const rawText = getChapterText(ch);
              const bodyText = ch.prose ? cleanProse(ch.prose) : rawText;

              return (
                <article key={ch.id} id={ch.id} ref={(el) => { chapterRefs.current[ch.id] = el; }} style={{ marginBottom: 0 }}>
                  {/* 섹션 헤더 */}
                  {featuredPhoto ? (
                    <div style={{ position: 'relative', height: 'clamp(280px, 52vw, 500px)', overflow: 'hidden' }}>
                      <img src={featuredPhoto.data} alt={featuredPhoto.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 'clamp(20px,4vw,40px) clamp(20px,5vw,72px)', color: '#fff' }}>
                        <p style={{ fontSize: 10, letterSpacing: 4, opacity: 0.5, fontFamily: TOKENS.sans, marginBottom: 10, textTransform: 'uppercase' }}>Chapter {String(i + 1).padStart(2, '0')}</p>
                        <h2 style={{ fontSize: 'clamp(1.4rem,4.5vw,2rem)', fontWeight: 300, lineHeight: 1.3, margin: 0, letterSpacing: '-0.02em', fontFamily: TOKENS.serif }}>{ch.title}</h2>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: 'clamp(52px,9vw,80px) clamp(20px,5vw,72px) 28px', borderTop: i > 0 ? `1px solid ${TOKENS.borderLight}` : undefined, textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
                      <p style={{ fontSize: 10, color: TOKENS.muted, letterSpacing: 4, fontFamily: TOKENS.sans, marginBottom: 14, textTransform: 'uppercase' }}>Chapter {String(i + 1).padStart(2, '0')}</p>
                      <h2 style={{ fontSize: 'clamp(1.4rem,4.5vw,1.9rem)', fontWeight: 300, lineHeight: 1.4, margin: '0 0 18px', letterSpacing: '-0.02em', color: TOKENS.text, fontFamily: TOKENS.serif }}>{ch.title}</h2>
                      <div style={{ width: 30, height: 1, background: `linear-gradient(90deg, ${ACCENT}, ${GOLD})`, margin: '0 auto', opacity: 0.45 }} />
                    </div>
                  )}

                  {/* 본문 */}
                  <div style={{ maxWidth: 680, margin: '0 auto', padding: `clamp(28px,4.5vw,48px) clamp(20px,5vw,72px)` }}>
                    {featuredPhoto?.caption && (
                      <p style={{ fontSize: 12, color: TOKENS.muted, fontFamily: TOKENS.sans, textAlign: 'center', marginBottom: 28, fontStyle: 'italic', lineHeight: 1.6 }}>{featuredPhoto.caption}</p>
                    )}
                    {bodyText ? (
                      <div style={{ overflow: 'hidden' }}>
                        {renderParagraphs(bodyText, fontPreset.book, fontPreset.lineHeight, i === 0)}
                      </div>
                    ) : (
                      <p style={{ color: TOKENS.muted, fontFamily: TOKENS.sans, fontSize: 14, fontStyle: 'italic' }}>아직 이야기가 작성되지 않았습니다.</p>
                    )}
                    {otherPhotos.map((photo, j) => (
                      <figure key={j} style={{ margin: '2.5em -8px' }}>
                        <img src={photo.data} alt={photo.caption || ''} style={{ width: 'calc(100% + 16px)', borderRadius: 8, display: 'block', maxHeight: '65vh', objectFit: 'cover' }} />
                        {photo.caption && <figcaption style={{ fontSize: 12, color: TOKENS.muted, textAlign: 'center', marginTop: 10, fontFamily: TOKENS.sans, fontStyle: 'italic', lineHeight: 1.6 }}>{photo.caption}</figcaption>}
                      </figure>
                    ))}

                    {/* 구분선 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '44px 0 8px', opacity: 0.28 }}>
                      <div style={{ flex: 1, height: 1, background: TOKENS.border }} />
                      <span style={{ fontSize: 14, color: TOKENS.muted, letterSpacing: 6 }}>· · ·</span>
                      <div style={{ flex: 1, height: 1, background: TOKENS.border }} />
                    </div>

                    {/* 이전/다음 카드형 네비게이션 */}
                    <div style={{ display: 'flex', gap: 10, padding: '16px 0 8px' }}>
                      {i > 0 && (
                        <button onClick={goToPrevChapter}
                          style={{ flex: 1, padding: '12px 14px', border: `1px solid ${TOKENS.borderLight}`, borderRadius: 12, background: TOKENS.bg, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = TOKENS.warm; e.currentTarget.style.borderColor = TOKENS.border; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = TOKENS.bg; e.currentTarget.style.borderColor = TOKENS.borderLight; }}
                        >
                          <p style={{ fontSize: 10, color: TOKENS.muted, fontFamily: TOKENS.sans, marginBottom: 4, letterSpacing: 1 }}>← 이전 장</p>
                          <p style={{ fontSize: 13, color: TOKENS.text, fontFamily: TOKENS.serif, lineHeight: 1.4, margin: 0 }}>{writtenChapters[i - 1]?.title}</p>
                        </button>
                      )}
                      {i < writtenChapters.length - 1 && (
                        <button onClick={goToNextChapter}
                          style={{ flex: 1, padding: '12px 14px', border: `1px solid ${TOKENS.borderLight}`, borderRadius: 12, background: TOKENS.bg, cursor: 'pointer', textAlign: 'right', transition: 'all 0.2s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = TOKENS.warm; e.currentTarget.style.borderColor = TOKENS.border; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = TOKENS.bg; e.currentTarget.style.borderColor = TOKENS.borderLight; }}
                        >
                          <p style={{ fontSize: 10, color: TOKENS.muted, fontFamily: TOKENS.sans, marginBottom: 4, letterSpacing: 1 }}>다음 장 →</p>
                          <p style={{ fontSize: 13, color: TOKENS.text, fontFamily: TOKENS.serif, lineHeight: 1.4, margin: 0 }}>{writtenChapters[i + 1]?.title}</p>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
          <div style={{ height: 80 }} />
        </>
      )}

      {/* ══════════════════════════════════
          미리보기 모드 (FlipBook)
      ══════════════════════════════════ */}
      {viewMode === 'flip' && (
        <>
          {/* 표지 선택 */}
          <div className="no-print" style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', padding: '18px 0 10px' }}>
            <span style={{ fontSize: 10, color: TOKENS.muted, fontFamily: TOKENS.sans, letterSpacing: 2, textTransform: 'uppercase' }}>표지</span>
            {COVER_TEMPLATES.map((tpl) => (
              <button key={tpl.id} onClick={() => setCoverTemplateId(tpl.id)} title={tpl.label}
                style={{
                  width: 22, height: 22, borderRadius: '50%', background: tpl.gradient,
                  border: state.coverTemplateId === tpl.id ? '2px solid rgba(0,0,0,0.4)' : '2px solid transparent',
                  cursor: 'pointer', outline: 'none',
                  boxShadow: state.coverTemplateId === tpl.id ? `0 0 0 2px ${TOKENS.bg}, 0 2px 8px rgba(0,0,0,0.2)` : '0 1px 3px rgba(0,0,0,0.15)',
                  transform: state.coverTemplateId === tpl.id ? 'scale(1.25)' : 'scale(1)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
              />
            ))}
          </div>
          <div className="flip-wrapper" style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 60px' }}>
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

      {/* ── 플로팅 TOC (읽기 모드) ── */}
      {viewMode === 'read' && writtenChapters.length > 1 && (
        <>
          <button className="no-print" onClick={() => setTocOpen((v) => !v)} title="목차"
            style={{
              position: 'fixed', right: 20, bottom: 24, zIndex: 50,
              width: 44, height: 44, borderRadius: '50%',
              background: tocOpen ? TOKENS.dark : TOKENS.card,
              color: tocOpen ? '#FAFAF9' : TOKENS.subtext,
              border: `1px solid ${tocOpen ? TOKENS.dark : TOKENS.border}`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          {tocOpen && (
            <>
              <div onClick={() => setTocOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
              <div className="no-print" style={{
                position: 'fixed', right: 20, bottom: 76, zIndex: 50,
                background: TOKENS.card, borderRadius: 14, padding: '14px 0',
                boxShadow: '0 12px 40px rgba(0,0,0,0.14)', border: `1px solid ${TOKENS.borderLight}`,
                minWidth: 230, maxWidth: 290, maxHeight: '64vh', overflowY: 'auto',
              }}>
                <p style={{ fontSize: 10, color: TOKENS.muted, letterSpacing: 3, fontFamily: TOKENS.sans, padding: '0 16px 10px', borderBottom: `1px solid ${TOKENS.borderLight}`, margin: 0, textTransform: 'uppercase' }}>목 차</p>
                {writtenChapters.map((ch, idx) => (
                  <button key={ch.id} onClick={() => scrollToChapter(ch.id, true)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '10px 16px', background: activeChapterIdx === idx ? ACCENT_BG : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      borderLeft: `2px solid ${activeChapterIdx === idx ? ACCENT : 'transparent'}`, transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 10, color: activeChapterIdx === idx ? ACCENT : TOKENS.light, fontFamily: TOKENS.sans, minWidth: 20, marginTop: 2, fontWeight: 600 }}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: 13, fontFamily: TOKENS.serif, color: TOKENS.text, fontWeight: activeChapterIdx === idx ? 500 : 400, lineHeight: 1.5 }}>
                      {ch.title}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ── PrintBook ── */}
      <PrintBook
        title={state.title}
        author={state.author}
        chapters={state.chapters}
        coverGradient={coverTemplate.gradient}
        coverTextColor={coverTemplate.textColor}
      />

      {/* ══════════════════════════════════
          공유 패널 (우측 드로어)
      ══════════════════════════════════ */}
      {showSharePanel && (
        <>
          {/* 백드롭 */}
          <div
            onClick={() => setShowSharePanel(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 150, backdropFilter: 'blur(2px)' }}
          />
          {/* 드로어 */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 160,
            width: 'min(380px, 92vw)',
            background: TOKENS.card,
            boxShadow: '-12px 0 48px rgba(0,0,0,0.14)',
            display: 'flex', flexDirection: 'column',
            animation: 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

            {/* 드로어 헤더 */}
            <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${TOKENS.borderLight}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 15, fontWeight: 500, color: TOKENS.text, margin: 0, fontFamily: TOKENS.sans }}>공유 및 초대</h3>
                <p style={{ fontSize: 11, color: TOKENS.muted, margin: '2px 0 0', fontFamily: TOKENS.sans }}>링크를 생성하고 가족을 초대하세요</p>
              </div>
              <button onClick={() => setShowSharePanel(false)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${TOKENS.borderLight}`, background: TOKENS.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: TOKENS.muted, fontSize: 16 }}>×</button>
            </div>

            {/* 드로어 콘텐츠 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* ① 공개 URL */}
              <div style={{ padding: '16px', background: TOKENS.bg, borderRadius: 14, border: `1px solid ${TOKENS.borderLight}` }}>
                <p style={{ fontSize: 10, letterSpacing: 2.5, color: TOKENS.muted, fontFamily: TOKENS.sans, marginBottom: 10, textTransform: 'uppercase' }}>공개 URL</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <p style={{ fontSize: 13, color: TOKENS.text, fontFamily: TOKENS.sans, fontWeight: 500, margin: '0 0 2px' }}>
                      {isPublic ? '공개 중' : '비공개'}
                    </p>
                    <p style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, margin: 0 }}>
                      {isPublic ? '누구나 링크로 읽을 수 있습니다' : '공개하면 누구나 읽을 수 있습니다'}
                    </p>
                  </div>
                  <button
                    onClick={togglePublic}
                    disabled={shareLoading}
                    style={{
                      width: 48, height: 26, borderRadius: 13,
                      background: isPublic ? '#4ADE80' : TOKENS.light,
                      border: 'none', cursor: 'pointer', position: 'relative',
                      transition: 'background 0.25s', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 3, left: isPublic ? 25 : 3,
                      width: 20, height: 20, borderRadius: '50%', background: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.25s',
                    }} />
                  </button>
                </div>
                {isPublic && (
                  <button
                    onClick={copyShareUrl}
                    style={{
                      marginTop: 10, width: '100%', padding: '9px 0',
                      background: copied ? ACCENT_BG : TOKENS.warm,
                      border: `1px solid ${copied ? ACCENT_BORDER : TOKENS.borderLight}`,
                      borderRadius: 8, fontSize: 12, fontFamily: TOKENS.sans,
                      color: copied ? ACCENT : TOKENS.subtext,
                      cursor: 'pointer', transition: 'all 0.2s', fontWeight: copied ? 500 : 400,
                    }}
                  >
                    {copied ? '✓ 링크 복사됨' : '공개 URL 복사'}
                  </button>
                )}
              </div>

              {/* ② 가족 열람 링크 */}
              <div style={{ padding: '16px', background: TOKENS.bg, borderRadius: 14, border: `1px solid ${TOKENS.borderLight}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <p style={{ fontSize: 10, letterSpacing: 2.5, color: TOKENS.muted, fontFamily: TOKENS.sans, margin: 0, textTransform: 'uppercase' }}>가족 열람 링크</p>
                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: TOKENS.warm, color: TOKENS.muted, fontFamily: TOKENS.sans }}>읽기 전용</span>
                </div>
                <p style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, margin: '0 0 10px', lineHeight: 1.5 }}>
                  특정 가족에게만 공유하는 비공개 열람 링크입니다
                </p>
                {!shareToken ? (
                  <button
                    onClick={generateFamilyLink}
                    disabled={familyLoading}
                    style={{ width: '100%', padding: '9px 0', background: TOKENS.warm, border: `1px solid ${TOKENS.border}`, borderRadius: 8, fontSize: 12, fontFamily: TOKENS.sans, color: TOKENS.subtext, cursor: 'pointer' }}
                  >
                    {familyLoading ? '생성 중…' : '열람 링크 생성'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={copyFamilyUrl}
                      style={{
                        flex: 1, padding: '9px 0',
                        background: familyCopied ? ACCENT_BG : TOKENS.warm,
                        border: `1px solid ${familyCopied ? ACCENT_BORDER : TOKENS.border}`,
                        borderRadius: 8, fontSize: 12, fontFamily: TOKENS.sans,
                        color: familyCopied ? ACCENT : TOKENS.subtext, cursor: 'pointer',
                        fontWeight: familyCopied ? 500 : 400,
                      }}
                    >
                      {familyCopied ? '✓ 복사됨' : '링크 복사'}
                    </button>
                    <button
                      onClick={revokeFamilyLink}
                      disabled={familyLoading}
                      style={{ width: 36, height: 36, border: `1px solid #E8C4C4`, borderRadius: 8, background: '#FFF8F8', cursor: 'pointer', color: '#B45454', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              {/* ③ 인터뷰어 링크 */}
              <div style={{ padding: '16px', background: TOKENS.bg, borderRadius: 14, border: `1px solid ${TOKENS.borderLight}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <p style={{ fontSize: 10, letterSpacing: 2.5, color: TOKENS.muted, fontFamily: TOKENS.sans, margin: 0, textTransform: 'uppercase' }}>인터뷰어 링크</p>
                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: '#F5F3FF', color: '#7C3AED', fontFamily: TOKENS.sans }}>질문 추가 가능</span>
                </div>
                <p style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, margin: '0 0 10px', lineHeight: 1.5 }}>
                  가족이 직접 질문을 추가하고 대화에 참여할 수 있습니다
                </p>
                {!interviewerToken ? (
                  <button
                    onClick={generateInterviewerLink}
                    disabled={interviewerLoading}
                    style={{ width: '100%', padding: '9px 0', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 8, fontSize: 12, fontFamily: TOKENS.sans, color: '#7C3AED', cursor: 'pointer' }}
                  >
                    {interviewerLoading ? '생성 중…' : '인터뷰어 링크 생성'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={copyInterviewerUrl}
                      style={{
                        flex: 1, padding: '9px 0',
                        background: interviewerCopied ? '#F5F3FF' : '#FAF8FF',
                        border: `1px solid ${interviewerCopied ? '#DDD6FE' : '#EDE9FE'}`,
                        borderRadius: 8, fontSize: 12, fontFamily: TOKENS.sans,
                        color: '#7C3AED', cursor: 'pointer', fontWeight: interviewerCopied ? 500 : 400,
                      }}
                    >
                      {interviewerCopied ? '✓ 복사됨' : '링크 복사'}
                    </button>
                    <button
                      onClick={revokeInterviewerLink}
                      disabled={interviewerLoading}
                      style={{ width: 36, height: 36, border: '1px solid #E8C4C4', borderRadius: 8, background: '#FFF8F8', cursor: 'pointer', color: '#B45454', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              {/* ④ 이메일 초대 */}
              {(shareToken || interviewerToken) && (
                <button
                  onClick={() => { setInviteResult(null); setShowInviteModal(true); setShowSharePanel(false); }}
                  style={{
                    width: '100%', padding: '13px 0',
                    background: `linear-gradient(135deg, ${TOKENS.dark}, #2D2926)`,
                    color: '#FAFAF9', border: 'none', borderRadius: 10,
                    fontSize: 14, fontFamily: TOKENS.sans, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  이메일로 초대장 보내기
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════
          이메일 초대 모달 (바텀시트)
      ══════════════════════════════════ */}
      {showInviteModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowInviteModal(false); }}
        >
          <div style={{
            background: TOKENS.card, borderRadius: '20px 20px 0 0', padding: '24px 24px 32px',
            width: '100%', maxWidth: 480, boxShadow: '0 -12px 48px rgba(0,0,0,0.16)',
            animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            {/* 핸들 */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: TOKENS.border, margin: '0 auto 20px' }} />

            <p style={{ fontSize: 10, letterSpacing: 3, color: TOKENS.muted, fontFamily: TOKENS.sans, marginBottom: 6, textTransform: 'uppercase' }}>가족 초대</p>
            <h3 style={{ fontSize: 17, fontWeight: 500, marginBottom: 4, color: TOKENS.text, fontFamily: TOKENS.sans }}>이메일로 초대장 보내기</h3>
            <p style={{ fontSize: 13, color: TOKENS.muted, marginBottom: 18, fontFamily: TOKENS.sans, lineHeight: 1.6 }}>
              수신자는 링크를 통해 바로 접근할 수 있습니다.
            </p>

            {/* 초대 유형 탭 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {([
                { value: 'reader', label: '열람', desc: '읽기만 가능' },
                { value: 'interviewer', label: '인터뷰어', desc: '질문 추가 가능' },
              ] as const).map(({ value, label, desc }) => (
                <button key={value} onClick={() => setInviteType(value)}
                  style={{
                    flex: 1, padding: '10px 12px',
                    border: `1.5px solid ${inviteType === value ? (value === 'interviewer' ? '#7C3AED' : ACCENT) : TOKENS.border}`,
                    borderRadius: 10,
                    background: inviteType === value ? (value === 'interviewer' ? '#F5F3FF' : ACCENT_BG) : TOKENS.card,
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 13, fontFamily: TOKENS.sans, fontWeight: 600, color: inviteType === value ? (value === 'interviewer' ? '#7C3AED' : ACCENT) : TOKENS.text }}>{label}</div>
                  <div style={{ fontSize: 11, fontFamily: TOKENS.sans, color: TOKENS.muted, marginTop: 2 }}>{desc}</div>
                </button>
              ))}
            </div>

            {inviteType === 'reader' && !shareToken && (
              <p style={{ fontSize: 12, color: '#92400E', background: '#FFFBEB', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontFamily: TOKENS.sans }}>
                열람 링크를 먼저 생성해주세요
              </p>
            )}
            {inviteType === 'interviewer' && !interviewerToken && (
              <p style={{ fontSize: 12, color: '#5B21B6', background: '#F5F3FF', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontFamily: TOKENS.sans }}>
                인터뷰어 링크를 먼저 생성해주세요
              </p>
            )}

            <label style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, letterSpacing: 1.5, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>받는 사람 이메일</label>
            <input
              type="email" value={inviteEmail}
              onChange={(e) => { setInviteEmail(e.target.value); setInviteResult(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') sendInviteEmail(); }}
              placeholder="family@example.com" autoFocus
              style={{ width: '100%', padding: '12px 14px', boxSizing: 'border-box', border: `1px solid ${TOKENS.border}`, borderRadius: 10, fontSize: 15, fontFamily: TOKENS.sans, outline: 'none', background: TOKENS.bg, color: TOKENS.text, marginBottom: 12 }}
              onFocus={(e) => (e.target.style.borderColor = ACCENT)}
              onBlur={(e) => (e.target.style.borderColor = TOKENS.border)}
            />
            {inviteResult && (
              <p style={{ fontSize: 13, fontFamily: TOKENS.sans, marginBottom: 12, color: inviteResult.ok ? '#16a34a' : '#c0392b', padding: '10px 12px', borderRadius: 8, background: inviteResult.ok ? '#F0FDF4' : '#FEF2F2' }}>
                {inviteResult.ok ? '✓ ' : '✗ '}{inviteResult.msg}
              </p>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setShowInviteModal(false); setInviteEmail(''); setInviteResult(null); }}
                style={{ flex: 1, padding: '13px 0', background: 'transparent', border: `1px solid ${TOKENS.border}`, borderRadius: 40, fontSize: 14, fontFamily: TOKENS.sans, cursor: 'pointer', color: TOKENS.muted }}
              >닫기</button>
              <button
                onClick={sendInviteEmail}
                disabled={inviteSending || !inviteEmail || (inviteType === 'reader' ? !shareToken : !interviewerToken)}
                style={{
                  flex: 2, padding: '13px 0',
                  background: (inviteSending || !inviteEmail || (inviteType === 'reader' ? !shareToken : !interviewerToken)) ? TOKENS.light : TOKENS.dark,
                  color: '#FAFAF9', border: 'none', borderRadius: 40,
                  fontSize: 14, fontFamily: TOKENS.sans, fontWeight: 600,
                  cursor: (inviteSending || !inviteEmail || (inviteType === 'reader' ? !shareToken : !interviewerToken)) ? 'not-allowed' : 'pointer',
                }}
              >
                {inviteSending ? '발송 중…' : '초대장 보내기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          출판 모달 (바텀시트)
      ══════════════════════════════════ */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{
            background: TOKENS.card, borderRadius: '20px 20px 0 0', padding: '24px 24px 32px',
            width: '100%', maxWidth: 480, boxShadow: '0 -12px 48px rgba(0,0,0,0.16)',
            animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: TOKENS.border, margin: '0 auto 20px' }} />

            {modalStep === 1 && (
              <>
                <p style={{ fontSize: 10, letterSpacing: 3, color: TOKENS.muted, fontFamily: TOKENS.sans, marginBottom: 6, textTransform: 'uppercase' }}>책 출판하기</p>
                <h3 style={{ fontSize: 17, fontWeight: 500, marginBottom: 4, color: TOKENS.text, fontFamily: TOKENS.sans }}>관리자 인증</h3>
                <p style={{ fontSize: 13, color: TOKENS.muted, marginBottom: 20, fontFamily: TOKENS.sans, lineHeight: 1.6 }}>
                  PDF 저장은 관리자만 사용할 수 있습니다.<br />관리자 비밀번호를 입력해 주세요.
                </p>
                <input type="password" value={adminPw} autoFocus
                  onChange={(e) => { setAdminPw(e.target.value); if (adminError) setAdminError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleVerify(); }}
                  placeholder="관리자 비밀번호"
                  style={{ width: '100%', padding: '13px 14px', border: `1px solid ${adminError ? '#e53e3e' : TOKENS.border}`, borderRadius: 10, fontSize: 15, fontFamily: TOKENS.sans, outline: 'none', boxSizing: 'border-box', background: TOKENS.bg, color: TOKENS.text }}
                  onFocus={(e) => (e.target.style.borderColor = ACCENT)}
                  onBlur={(e) => (e.target.style.borderColor = adminError ? '#e53e3e' : TOKENS.border)}
                />
                {adminError && <p style={{ fontSize: 12, color: '#e53e3e', marginTop: 6, fontFamily: TOKENS.sans }}>{adminError}</p>}
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: '13px 0', background: 'transparent', border: `1px solid ${TOKENS.border}`, borderRadius: 40, fontSize: 14, fontFamily: TOKENS.sans, cursor: 'pointer', color: TOKENS.muted }}>취소</button>
                  <button onClick={handleVerify} disabled={adminLoading || !adminPw}
                    style={{ flex: 2, padding: '13px 0', background: adminLoading || !adminPw ? TOKENS.light : TOKENS.dark, color: '#FAFAF9', border: 'none', borderRadius: 40, fontSize: 14, fontFamily: TOKENS.sans, fontWeight: 600, cursor: adminLoading || !adminPw ? 'not-allowed' : 'pointer' }}>
                    {adminLoading ? '확인 중…' : '확인'}
                  </button>
                </div>
              </>
            )}

            {modalStep === 2 && (
              <>
                <p style={{ fontSize: 10, letterSpacing: 3, color: TOKENS.muted, fontFamily: TOKENS.sans, marginBottom: 6, textTransform: 'uppercase' }}>책 출판하기</p>
                <h3 style={{ fontSize: 17, fontWeight: 500, marginBottom: 4, color: TOKENS.text, fontFamily: TOKENS.sans }}>판형 선택</h3>
                <p style={{ fontSize: 13, color: TOKENS.muted, marginBottom: 18, fontFamily: TOKENS.sans }}>PDF로 저장할 종이 크기를 선택하세요.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {PAPER_SIZES.map((size) => (
                    <label key={size.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: `1.5px solid ${selectedSize === size.id ? ACCENT : TOKENS.border}`, borderRadius: 10, cursor: 'pointer', background: selectedSize === size.id ? ACCENT_BG : TOKENS.card, transition: 'all 0.15s' }}>
                      <input type="radio" name="paperSize" value={size.id} checked={selectedSize === size.id} onChange={() => setSelectedSize(size.id)} style={{ accentColor: ACCENT, width: 16, height: 16 }} />
                      <span style={{ fontSize: 15, fontFamily: TOKENS.sans, fontWeight: selectedSize === size.id ? 500 : 400, color: TOKENS.text }}>{size.label}</span>
                      <span style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, marginLeft: 'auto' }}>{size.desc}</span>
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: '13px 0', background: 'transparent', border: `1px solid ${TOKENS.border}`, borderRadius: 40, fontSize: 14, fontFamily: TOKENS.sans, cursor: 'pointer', color: TOKENS.muted }}>취소</button>
                  <button onClick={handlePrint} disabled={isPrinting}
                    style={{ flex: 2, padding: '13px 0', background: isPrinting ? TOKENS.light : TOKENS.dark, color: '#FAFAF9', border: 'none', borderRadius: 40, fontSize: 14, fontFamily: TOKENS.sans, fontWeight: 600, cursor: isPrinting ? 'wait' : 'pointer' }}>
                    {isPrinting ? '준비 중…' : 'PDF로 저장'}
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
