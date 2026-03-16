'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useBook, Chapter } from '@/lib/book-context';
import { TOKENS, FONT_SIZE_PRESETS } from '@/lib/design-tokens';
import PrintBook from '@/components/book/PrintBook';

/* ── FlipBook: SSR 없이 동적 로드 (react-pageflip은 브라우저 전용) ── */
const FlipBook = dynamic(() => import('@/components/book/FlipBook'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: 300,
        height: 430,
        background: TOKENS.card,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: TOKENS.muted,
        fontFamily: TOKENS.sans,
        fontSize: 13,
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      }}
    >
      책 준비 중…
    </div>
  ),
});

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

/* ── 판형 목록 ── */
const PAPER_SIZES = [
  { id: 'A5', label: 'A5', css: 'A5 portrait', desc: '148 × 210mm — 일반 단행본' },
  { id: 'A4', label: 'A4', css: 'A4 portrait', desc: '210 × 297mm — 표준 문서' },
  { id: 'B5', label: 'B5', css: '176mm 250mm portrait', desc: '176 × 250mm — 국판' },
  { id: 'B6', label: 'B6', css: '125mm 176mm portrait', desc: '125 × 176mm — 소형 단행본' },
] as const;

type PaperSizeId = typeof PAPER_SIZES[number]['id'];

/* ── 챕터 유틸 (FlipBook에서도 동일 함수 export) ── */
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

/* ── 메인 컴포넌트 ── */
export default function BookPage() {
  const router = useRouter();
  const { state } = useBook();

  /* 표지 */
  const [coverTemplateId, setCoverTemplateId] = useState<CoverTemplateId>('classic');

  /* 출판 모달 */
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [adminPw, setAdminPw] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [selectedSize, setSelectedSize] = useState<PaperSizeId>('A5');
  const [isPrinting, setIsPrinting] = useState(false);

  const coverTemplate = COVER_TEMPLATES.find((t) => t.id === coverTemplateId) ?? COVER_TEMPLATES[0];
  const fontPreset = FONT_SIZE_PRESETS[state.fontSize];

  /* 표지 순환 (FlipBook 내 🎨 버튼에서도 호출) */
  const handleCoverChange = () => {
    const currentIdx = COVER_TEMPLATES.findIndex((t) => t.id === coverTemplateId);
    const nextIdx = (currentIdx + 1) % COVER_TEMPLATES.length;
    setCoverTemplateId(COVER_TEMPLATES[nextIdx].id);
  };

  const writtenChapters = state.chapters.filter(
    (c) => getChapterText(c).length > 0 || getChapterPhotos(c).length > 0
  );

  /* ── 관리자 비밀번호 확인 ── */
  const handleVerify = async () => {
    if (!adminPw) return;
    setAdminLoading(true);
    setAdminError('');
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { 'x-admin-password': adminPw },
      });
      if (res.ok) {
        setModalStep(2);
      } else {
        setAdminError('비밀번호가 올바르지 않습니다.');
      }
    } catch {
      setAdminError('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setAdminLoading(false);
    }
  };

  /* ── PDF 출력 ── */
  const handlePrint = () => {
    const sizeObj = PAPER_SIZES.find((s) => s.id === selectedSize) ?? PAPER_SIZES[0];
    setIsPrinting(true);

    // @page size 동적 주입
    const styleEl = document.createElement('style');
    styleEl.id = 'print-size-override';
    styleEl.textContent = `@media print { @page { size: ${sizeObj.css}; } }`;
    document.head.appendChild(styleEl);

    setTimeout(() => {
      window.print();
      // 출력 후 제거
      const existing = document.getElementById('print-size-override');
      if (existing) document.head.removeChild(existing);
      setIsPrinting(false);
      closeModal();
    }, 200);
  };

  /* ── 모달 닫기 ── */
  const closeModal = () => {
    setShowModal(false);
    setModalStep(1);
    setAdminPw('');
    setAdminError('');
  };

  /* ── 모달 열기 ── */
  const openModal = () => {
    setModalStep(1);
    setAdminPw('');
    setAdminError('');
    setShowModal(true);
  };

  return (
    <div style={{ minHeight: '100dvh', background: TOKENS.bg }}>
      {/* ── Sticky 헤더 ── */}
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

        <span style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 500, color: TOKENS.text }}>
          {state.title || '나의 이야기'}
        </span>

        <span style={{ fontSize: 12, color: TOKENS.muted, fontFamily: TOKENS.sans }}>
          {writtenChapters.length}장
        </span>

        <button
          onClick={openModal}
          style={{
            background: TOKENS.dark,
            color: '#FAFAF9',
            border: 'none',
            borderRadius: TOKENS.radiusSm,
            fontSize: 12,
            fontFamily: TOKENS.sans,
            fontWeight: 500,
            cursor: 'pointer',
            padding: '8px 14px',
            minHeight: 40,
            whiteSpace: 'nowrap',
          }}
        >
          📖 책 출판하기
        </button>
      </div>

      {/* ── 표지 템플릿 선택 ── */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          gap: 10,
          justifyContent: 'center',
          alignItems: 'center',
          padding: '14px 0 8px',
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: TOKENS.muted,
            fontFamily: TOKENS.sans,
            letterSpacing: 2,
          }}
        >
          표지
        </span>
        {COVER_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => setCoverTemplateId(tpl.id)}
            title={tpl.label}
            aria-label={`표지 ${tpl.label}`}
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: tpl.gradient,
              border:
                coverTemplateId === tpl.id
                  ? '2px solid rgba(0,0,0,0.35)'
                  : '2px solid transparent',
              cursor: 'pointer',
              outline: 'none',
              boxShadow:
                coverTemplateId === tpl.id
                  ? '0 0 0 2px rgba(255,255,255,0.7)'
                  : 'none',
              transform: coverTemplateId === tpl.id ? 'scale(1.25)' : 'scale(1)',
              transition: 'transform 0.15s',
            }}
          />
        ))}
      </div>

      {/* ── FlipBook 뷰어 ── */}
      <div
        className="flip-wrapper"
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '16px 0 56px',
        }}
      >
        <FlipBook
          title={state.title}
          author={state.author}
          chapters={state.chapters}
          coverTemplate={coverTemplate}
          fontPreset={fontPreset}
          onCoverChange={handleCoverChange}
        />
      </div>

      {/* ── PrintBook: 화면에선 숨김 / 인쇄 시 표시 ── */}
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
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            style={{
              background: TOKENS.card,
              borderRadius: 14,
              padding: '28px 24px',
              width: '100%',
              maxWidth: 360,
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
          >
            {/* ─ Step 1: 비밀번호 입력 ─ */}
            {modalStep === 1 && (
              <>
                <p
                  style={{
                    fontSize: 11,
                    color: TOKENS.muted,
                    fontFamily: TOKENS.sans,
                    letterSpacing: 3,
                    marginBottom: 8,
                  }}
                >
                  책 출판하기
                </p>
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 500,
                    marginBottom: 4,
                    color: TOKENS.text,
                  }}
                >
                  관리자 인증
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: TOKENS.muted,
                    marginBottom: 20,
                    fontFamily: TOKENS.sans,
                    lineHeight: 1.6,
                  }}
                >
                  PDF 파일 저장은 관리자만 사용할 수 있습니다.
                  <br />
                  관리자 비밀번호를 입력해 주세요.
                </p>

                <input
                  type="password"
                  value={adminPw}
                  onChange={(e) => {
                    setAdminPw(e.target.value);
                    if (adminError) setAdminError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleVerify();
                  }}
                  placeholder="관리자 비밀번호"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '13px 14px',
                    border: `1px solid ${adminError ? '#e53e3e' : TOKENS.border}`,
                    borderRadius: TOKENS.radiusSm,
                    fontSize: 15,
                    fontFamily: TOKENS.sans,
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: TOKENS.bg,
                    color: TOKENS.text,
                  }}
                />
                {adminError && (
                  <p
                    style={{
                      fontSize: 12,
                      color: '#e53e3e',
                      marginTop: 6,
                      fontFamily: TOKENS.sans,
                    }}
                  >
                    {adminError}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button
                    onClick={closeModal}
                    style={{
                      flex: 1,
                      padding: '12px 0',
                      background: 'transparent',
                      border: `1px solid ${TOKENS.border}`,
                      borderRadius: TOKENS.radiusSm,
                      fontSize: 14,
                      fontFamily: TOKENS.sans,
                      cursor: 'pointer',
                      color: TOKENS.muted,
                      minHeight: 48,
                    }}
                  >
                    취소
                  </button>
                  <button
                    onClick={handleVerify}
                    disabled={adminLoading || !adminPw}
                    style={{
                      flex: 2,
                      padding: '12px 0',
                      background: adminLoading || !adminPw ? TOKENS.muted : TOKENS.dark,
                      color: '#FAFAF9',
                      border: 'none',
                      borderRadius: TOKENS.radiusSm,
                      fontSize: 14,
                      fontFamily: TOKENS.sans,
                      fontWeight: 500,
                      cursor: adminLoading || !adminPw ? 'not-allowed' : 'pointer',
                      minHeight: 48,
                      opacity: adminLoading || !adminPw ? 0.65 : 1,
                    }}
                  >
                    {adminLoading ? '확인 중…' : '확인'}
                  </button>
                </div>
              </>
            )}

            {/* ─ Step 2: 판형 선택 ─ */}
            {modalStep === 2 && (
              <>
                <p
                  style={{
                    fontSize: 11,
                    color: TOKENS.muted,
                    fontFamily: TOKENS.sans,
                    letterSpacing: 3,
                    marginBottom: 8,
                  }}
                >
                  책 출판하기
                </p>
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 500,
                    marginBottom: 4,
                    color: TOKENS.text,
                  }}
                >
                  판형 선택
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: TOKENS.muted,
                    marginBottom: 20,
                    fontFamily: TOKENS.sans,
                  }}
                >
                  PDF로 저장할 종이 크기를 선택하세요.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {PAPER_SIZES.map((size) => (
                    <label
                      key={size.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '13px 14px',
                        border: `1.5px solid ${
                          selectedSize === size.id ? TOKENS.accent : TOKENS.border
                        }`,
                        borderRadius: TOKENS.radiusSm,
                        cursor: 'pointer',
                        background: selectedSize === size.id ? TOKENS.warm : TOKENS.card,
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <input
                        type="radio"
                        name="paperSize"
                        value={size.id}
                        checked={selectedSize === size.id}
                        onChange={() => setSelectedSize(size.id)}
                        style={{ accentColor: TOKENS.accent, width: 16, height: 16 }}
                      />
                      <span
                        style={{
                          fontSize: 15,
                          fontFamily: TOKENS.sans,
                          fontWeight: selectedSize === size.id ? 500 : 400,
                          color: TOKENS.text,
                        }}
                      >
                        {size.label}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: TOKENS.muted,
                          fontFamily: TOKENS.sans,
                          marginLeft: 'auto',
                        }}
                      >
                        {size.desc}
                      </span>
                    </label>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={closeModal}
                    style={{
                      flex: 1,
                      padding: '12px 0',
                      background: 'transparent',
                      border: `1px solid ${TOKENS.border}`,
                      borderRadius: TOKENS.radiusSm,
                      fontSize: 14,
                      fontFamily: TOKENS.sans,
                      cursor: 'pointer',
                      color: TOKENS.muted,
                      minHeight: 48,
                    }}
                  >
                    취소
                  </button>
                  <button
                    onClick={handlePrint}
                    disabled={isPrinting}
                    style={{
                      flex: 2,
                      padding: '12px 0',
                      background: isPrinting ? TOKENS.muted : TOKENS.dark,
                      color: '#FAFAF9',
                      border: 'none',
                      borderRadius: TOKENS.radiusSm,
                      fontSize: 14,
                      fontFamily: TOKENS.sans,
                      fontWeight: 500,
                      cursor: isPrinting ? 'wait' : 'pointer',
                      minHeight: 48,
                    }}
                  >
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
