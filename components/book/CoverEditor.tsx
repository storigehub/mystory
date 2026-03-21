'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useBook, CoverTemplateId } from '@/lib/book-context';
import { compressImage } from '@/lib/compress-image';

/* ── 디자인 토큰 ── */
const SERIF  = "'Noto Serif KR', Georgia, serif";
const SANS   = "'Noto Sans KR', system-ui, sans-serif";
const ACCENT = '#A0522D';
const ACCENT_BG = '#FBF6F1';
const CARD   = '#FFFFFF';
const BG     = '#FAFAF8';
const BORDER = '#EDE8E2';
const MUTED  = '#9C8F85';
const TEXT   = '#1A1816';

/* ── 표지 템플릿 정의 (6종) ── */
export const ALL_COVER_TEMPLATES = [
  { id: 'classic', label: '클래식', sub: 'Dark & Warm',   gradient: 'linear-gradient(160deg, #3D3530 0%, #1C1A18 100%)', textColor: '#FAFAF9', accentOpacity: 0.25 },
  { id: 'dawn',    label: '새 벽',  sub: 'Deep Blue',     gradient: 'linear-gradient(160deg, #1a2a4a 0%, #0d1b2e 100%)', textColor: '#FAFAF9', accentOpacity: 0.3  },
  { id: 'sunset',  label: '황 혼',  sub: 'Warm Amber',    gradient: 'linear-gradient(160deg, #7a4820 0%, #4a2c10 100%)', textColor: '#FAFAF9', accentOpacity: 0.3  },
  { id: 'spring',  label: '봄 날',  sub: 'Soft Cream',    gradient: 'linear-gradient(160deg, #E8E0D5 0%, #D4C9BA 100%)', textColor: '#3D3530', accentOpacity: 0.2  },
  { id: 'forest',  label: '숲 속',  sub: 'Deep Green',    gradient: 'linear-gradient(160deg, #1e3a2f 0%, #0d2018 100%)', textColor: '#FAFAF9', accentOpacity: 0.25 },
  { id: 'rose',    label: '장 미',  sub: 'Burgundy',      gradient: 'linear-gradient(160deg, #4d1a2e 0%, #2d0f1a 100%)', textColor: '#FAFAF9', accentOpacity: 0.25 },
] as const;

export type AllCoverTemplateId = typeof ALL_COVER_TEMPLATES[number]['id'];

/* ── 사진 레이아웃 정의 (6종) ── */
export const PHOTO_LAYOUTS = [
  {
    id: 'topleft',
    label: '상단 제목',
    sub: 'Japanese Style',
    overlay: 'linear-gradient(145deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.08) 55%, transparent 80%)',
    textAlign: 'left' as const,
    textPos: 'top',
    textColor: '#fff',
  },
  {
    id: 'bottomband',
    label: '하단 밴드',
    sub: 'Photo Book',
    overlay: 'none',
    textAlign: 'center' as const,
    textPos: 'band',
    textColor: '#3D3530',
  },
  {
    id: 'center',
    label: '중앙 오버레이',
    sub: 'Cinematic',
    overlay: 'linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.58) 100%)',
    textAlign: 'center' as const,
    textPos: 'center',
    textColor: '#fff',
  },
  {
    id: 'magazine',
    label: '매거진',
    sub: 'Bold & Editorial',
    overlay: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)',
    textAlign: 'left' as const,
    textPos: 'bottom',
    textColor: '#fff',
  },
  {
    id: 'split',
    label: '좌우 분할',
    sub: 'Editorial Split',
    overlay: 'none',
    textAlign: 'left' as const,
    textPos: 'split',
    textColor: '#3D3530',
  },
  {
    id: 'minimal',
    label: '미니멀',
    sub: 'Understated',
    overlay: 'linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.48) 100%)',
    textAlign: 'center' as const,
    textPos: 'bottom-small',
    textColor: '#fff',
  },
] as const;

export type PhotoLayoutId = typeof PHOTO_LAYOUTS[number]['id'];

/* ── 레이아웃 미니 프리뷰 컴포넌트 ── */
function LayoutMiniPreview({
  layout,
  photoUrl,
  title,
  author,
  selected,
}: {
  layout: typeof PHOTO_LAYOUTS[number];
  photoUrl: string;
  title: string;
  author: string;
  selected: boolean;
}) {
  const t = title || '제목';
  const a = author || '저자';

  if (layout.textPos === 'split') {
    return (
      <div style={{ width: '100%', paddingTop: '142%', position: 'relative', borderRadius: 8, overflow: 'hidden', border: selected ? `2.5px solid ${ACCENT}` : `1.5px solid ${BORDER}`, transition: 'border-color 0.15s', cursor: 'pointer' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
          <div style={{ width: '40%', background: '#FAFAF8', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 8px 0 10px', borderRight: '1px solid #eee' }}>
            <div style={{ width: 14, height: 1, background: 'rgba(0,0,0,0.2)', marginBottom: 5 }} />
            <div style={{ fontSize: 8, fontWeight: 600, color: '#3D3530', lineHeight: 1.3, fontFamily: SERIF, wordBreak: 'break-all' }}>{t.slice(0, 6)}</div>
            <div style={{ fontSize: 6, color: '#9C8F85', marginTop: 3, fontFamily: SANS }}>{a.slice(0, 5)}</div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
        {selected && (
          <div style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        )}
      </div>
    );
  }

  if (layout.textPos === 'band') {
    return (
      <div style={{ width: '100%', paddingTop: '142%', position: 'relative', borderRadius: 8, overflow: 'hidden', border: selected ? `2.5px solid ${ACCENT}` : `1.5px solid ${BORDER}`, transition: 'border-color 0.15s', cursor: 'pointer' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(250,250,248,0.93)', backdropFilter: 'blur(6px)', padding: '10px 8px 12px', textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 8.5, fontWeight: 600, color: '#3D3530', fontFamily: SERIF, lineHeight: 1.3 }}>{t.slice(0, 8)}</div>
            <div style={{ fontSize: 6.5, color: '#9C8F85', marginTop: 2, fontFamily: SANS }}>{a.slice(0, 6)}</div>
          </div>
        </div>
        {selected && (
          <div style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        )}
      </div>
    );
  }

  const justifyContent = layout.textPos === 'top' ? 'flex-start' : layout.textPos === 'center' ? 'center' : 'flex-end';
  const padding = layout.textPos === 'top' ? '10px 10px 0' : layout.textPos === 'center' ? '0 10px' : '0 10px 10px';
  const isBottom = layout.textPos === 'bottom';
  const isBottomSmall = layout.textPos === 'bottom-small';

  return (
    <div style={{ width: '100%', paddingTop: '142%', position: 'relative', borderRadius: 8, overflow: 'hidden', border: selected ? `2.5px solid ${ACCENT}` : `1.5px solid ${BORDER}`, transition: 'border-color 0.15s', cursor: 'pointer' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent }}>
        <img src={photoUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        {layout.overlay !== 'none' && (
          <div style={{ position: 'absolute', inset: 0, background: layout.overlay }} />
        )}
        <div style={{ position: 'relative', padding, textAlign: layout.textAlign, display: 'flex', flexDirection: 'column', alignItems: layout.textAlign === 'center' ? 'center' : 'flex-start', gap: 2 }}>
          {isBottomSmall && <div style={{ width: 18, height: 1, background: 'rgba(255,255,255,0.6)', marginBottom: 3 }} />}
          {isBottom && <div style={{ width: 18, height: 1, background: 'rgba(255,255,255,0.3)', marginBottom: 4 }} />}
          <div style={{
            fontSize: isBottom ? 10 : isBottomSmall ? 7 : 9,
            fontWeight: isBottom ? 700 : 600,
            color: layout.textColor,
            lineHeight: 1.2,
            fontFamily: isBottom ? SANS : SERIF,
            letterSpacing: isBottom ? '0.03em' : '-0.01em',
            wordBreak: 'break-all',
            textShadow: layout.textColor === '#fff' ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
          }}>
            {isBottom ? t.slice(0, 8).toUpperCase() : t.slice(0, isBottomSmall ? 6 : 8)}
          </div>
          <div style={{ fontSize: 6.5, color: layout.textColor === '#fff' ? 'rgba(255,255,255,0.72)' : '#9C8F85', fontFamily: SANS, textShadow: layout.textColor === '#fff' ? '0 1px 3px rgba(0,0,0,0.4)' : 'none' }}>
            {a.slice(0, 5)}
          </div>
        </div>
      </div>
      {selected && (
        <div style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      )}
    </div>
  );
}

/* ── 템플릿 미니 프리뷰 컴포넌트 ── */
function TemplateMiniPreview({
  tpl,
  title,
  author,
  selected,
}: {
  tpl: typeof ALL_COVER_TEMPLATES[number];
  title: string;
  author: string;
  selected: boolean;
}) {
  return (
    <div style={{ width: '100%', paddingTop: '142%', position: 'relative', borderRadius: 8, overflow: 'hidden', border: selected ? `2.5px solid ${ACCENT}` : `1.5px solid ${BORDER}`, transition: 'border-color 0.15s', cursor: 'pointer', boxShadow: selected ? `0 0 0 3px ${ACCENT_BG}, 0 4px 16px rgba(0,0,0,0.15)` : '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ position: 'absolute', inset: 0, background: tpl.gradient, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 0 14px 12px' }}>
        {/* 장식 원 */}
        <div style={{ position: 'absolute', top: '8%', right: '6%', width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', top: '4%', right: '20%', width: 18, height: 18, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)' }} />
        {/* 저자 이니셜 */}
        <div style={{ position: 'absolute', top: 10, left: 10, width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 8, color: tpl.textColor, opacity: 0.8, fontFamily: SERIF }}>{(author || 'A')[0]}</span>
        </div>
        {/* 텍스트 */}
        <div style={{ width: 20, height: 1, background: tpl.textColor, opacity: 0.2, marginBottom: 6 }} />
        <div style={{ fontSize: 9.5, fontWeight: 300, color: tpl.textColor, lineHeight: 1.3, letterSpacing: '-0.02em', fontFamily: SERIF, maxWidth: 80 }}>{(title || '나의 이야기').slice(0, 8)}</div>
        <div style={{ fontSize: 7, color: tpl.textColor, opacity: 0.55, marginTop: 3, fontFamily: SERIF }}>{(author || '저자').slice(0, 6)}</div>
      </div>
      {selected && (
        <div style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      )}
    </div>
  );
}

/* ── 메인 CoverEditor 컴포넌트 ── */
interface CoverEditorProps {
  onClose: () => void;
}

export default function CoverEditor({ onClose }: CoverEditorProps) {
  const { state, setCoverTemplateId, setCoverPhotoUrl, setCoverLayout } = useBook();
  const [tab, setTab] = useState<'template' | 'photo'>(state.coverPhotoUrl ? 'photo' : 'template');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isPhotoCover = !!state.coverPhotoUrl;

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { setUploadError('이미지 파일만 업로드 가능합니다'); return; }
    if (file.size > 20 * 1024 * 1024) { setUploadError('파일 크기는 20MB 이하여야 합니다'); return; }
    setUploading(true);
    setUploadError('');
    try {
      // 4.5MB Vercel 제한 대응: 업로드 전 클라이언트 압축
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append('file', compressed);
      const res = await fetch('/api/upload/photo', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '업로드 실패');
      setCoverPhotoUrl(data.url);
      setCoverLayout(state.coverLayout || 'topleft');
      setTab('photo');
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : '업로드 중 오류가 발생했습니다');
    } finally {
      setUploading(false);
    }
  }, [setCoverPhotoUrl, setCoverLayout, state.coverLayout]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleSelectTemplate = (id: AllCoverTemplateId) => {
    setCoverTemplateId(id as CoverTemplateId);
    setCoverPhotoUrl('');
  };

  const handleSelectLayout = (id: PhotoLayoutId) => {
    setCoverLayout(id);
  };

  // 배경 클릭 → 닫기
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.22s ease',
      }}
    >
      <style>{`
        @keyframes editorSlideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .cover-tpl-card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,0.2) !important; }
        .cover-layout-card:hover { transform: translateY(-2px); }
        .cover-tpl-card, .cover-layout-card { transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1); }
      `}</style>

      {/* 모달 카드 */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(620px, 95vw)',
          maxHeight: '90dvh',
          background: BG,
          borderRadius: 20,
          boxShadow: '0 32px 80px rgba(0,0,0,0.32), 0 0 0 1px rgba(0,0,0,0.08)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'editorSlideUp 0.32s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* ── 헤더 ── */}
        <div style={{ padding: '22px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 400, color: TEXT, margin: 0, letterSpacing: '-0.02em' }}>표지 디자인</h2>
            <p style={{ fontFamily: SANS, fontSize: 12, color: MUTED, margin: '4px 0 0', letterSpacing: 0.2 }}>
              템플릿을 고르거나 직접 사진으로 표지를 만들어보세요
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 10, border: `1px solid ${BORDER}`, background: CARD, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontSize: 17, flexShrink: 0, marginTop: 2 }}
          >×</button>
        </div>

        {/* ── 탭 바 ── */}
        <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'inline-flex', background: '#EFEBE6', borderRadius: 12, padding: 4, gap: 2 }}>
            {([
              { id: 'template', icon: '🎨', label: '템플릿' },
              { id: 'photo',    icon: '📷', label: '내 사진' },
            ] as const).map(({ id, icon, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 9,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: SANS, fontSize: 13, fontWeight: 500,
                  transition: 'all 0.18s ease',
                  background: tab === id ? CARD : 'transparent',
                  color: tab === id ? TEXT : MUTED,
                  boxShadow: tab === id ? '0 1px 6px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <span style={{ fontSize: 14 }}>{icon}</span>
                <span>{label}</span>
                {id === 'photo' && isPhotoCover && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, marginLeft: 2 }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── 콘텐츠 영역 ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 28px', scrollbarWidth: 'none' }}>

          {/* ══ 템플릿 탭 ══ */}
          {tab === 'template' && (
            <div>
              <p style={{ fontFamily: SANS, fontSize: 12, color: MUTED, margin: '0 0 16px', letterSpacing: 0.3 }}>
                6가지 분위기 중 하나를 선택하세요
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {ALL_COVER_TEMPLATES.map((tpl) => {
                  const selected = !state.coverPhotoUrl && state.coverTemplateId === tpl.id;
                  return (
                    <div key={tpl.id} className="cover-tpl-card" onClick={() => handleSelectTemplate(tpl.id as AllCoverTemplateId)}>
                      <TemplateMiniPreview
                        tpl={tpl}
                        title={state.title}
                        author={state.author}
                        selected={selected}
                      />
                      <div style={{ marginTop: 8, textAlign: 'center' }}>
                        <div style={{ fontFamily: SERIF, fontSize: 12.5, fontWeight: 400, color: selected ? ACCENT : TEXT, letterSpacing: '0.03em', transition: 'color 0.15s' }}>{tpl.label}</div>
                        <div style={{ fontFamily: SANS, fontSize: 10, color: MUTED, marginTop: 2, letterSpacing: '0.04em' }}>{tpl.sub}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ 내 사진 탭 ══ */}
          {tab === 'photo' && (
            <div>
              {!state.coverPhotoUrl ? (
                /* ── 업로드 존 ── */
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => !uploading && fileRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? ACCENT : BORDER}`,
                    borderRadius: 16,
                    padding: '52px 24px',
                    textAlign: 'center',
                    cursor: uploading ? 'wait' : 'pointer',
                    background: dragOver ? ACCENT_BG : CARD,
                    transition: 'all 0.18s ease',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  }}
                >
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                  {uploading ? (
                    <>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${BORDER}`, borderTop: `3px solid ${ACCENT}`, animation: 'spin 0.8s linear infinite' }} />
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                      <p style={{ fontFamily: SANS, fontSize: 14, color: MUTED, margin: 0 }}>업로드 중…</p>
                    </>
                  ) : (
                    <>
                      <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F0EBE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                      </div>
                      <div>
                        <p style={{ fontFamily: SANS, fontSize: 15, fontWeight: 500, color: TEXT, margin: '0 0 4px' }}>사진을 끌어다 놓거나 클릭하여 선택</p>
                        <p style={{ fontFamily: SANS, fontSize: 12, color: MUTED, margin: 0 }}>JPG, PNG, WEBP · 8MB 이하</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 240 }}>
                        <div style={{ flex: 1, height: 1, background: BORDER }} />
                        <span style={{ fontFamily: SANS, fontSize: 11, color: MUTED }}>또는</span>
                        <div style={{ flex: 1, height: 1, background: BORDER }} />
                      </div>
                      <button style={{ padding: '10px 24px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 24, fontFamily: SANS, fontSize: 13, fontWeight: 500, cursor: 'pointer', letterSpacing: 0.3 }}>
                        사진 선택하기
                      </button>
                    </>
                  )}
                  {uploadError && (
                    <p style={{ fontFamily: SANS, fontSize: 12, color: '#DC2626', margin: '-4px 0 0', background: '#FEF2F2', padding: '8px 16px', borderRadius: 8, width: '100%', boxSizing: 'border-box' }}>{uploadError}</p>
                  )}
                </div>
              ) : (
                /* ── 사진 업로드됨: 레이아웃 선택 ── */
                <div>
                  {/* 현재 사진 썸네일 + 변경 버튼 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: '12px 14px', background: CARD, borderRadius: 12, border: `1px solid ${BORDER}` }}>
                    <div style={{ width: 52, height: 52, borderRadius: 8, overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                      <img src={state.coverPhotoUrl} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: TEXT, margin: '0 0 2px' }}>사진이 등록되었습니다</p>
                      <p style={{ fontFamily: SANS, fontSize: 11, color: MUTED, margin: 0 }}>아래에서 레이아웃을 선택하세요</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => fileRef.current?.click()}
                        style={{ padding: '7px 14px', borderRadius: 20, border: `1px solid ${BORDER}`, background: CARD, fontFamily: SANS, fontSize: 12, color: TEXT, cursor: 'pointer' }}
                      >
                        변경
                      </button>
                      <button
                        onClick={() => { setCoverPhotoUrl(''); }}
                        style={{ padding: '7px 14px', borderRadius: 20, border: `1px solid #FCA5A5`, background: '#FFF5F5', fontFamily: SANS, fontSize: 12, color: '#DC2626', cursor: 'pointer' }}
                      >
                        삭제
                      </button>
                    </div>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                  </div>

                  {/* 레이아웃 그리드 */}
                  <p style={{ fontFamily: SANS, fontSize: 12, color: MUTED, margin: '0 0 14px', letterSpacing: 0.3 }}>
                    6가지 레이아웃 중 하나를 선택하세요
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {PHOTO_LAYOUTS.map((layout) => {
                      const selected = state.coverLayout === layout.id;
                      return (
                        <div key={layout.id} className="cover-layout-card" onClick={() => handleSelectLayout(layout.id as PhotoLayoutId)}>
                          <LayoutMiniPreview
                            layout={layout}
                            photoUrl={state.coverPhotoUrl}
                            title={state.title}
                            author={state.author}
                            selected={selected}
                          />
                          <div style={{ marginTop: 8, textAlign: 'center' }}>
                            <div style={{ fontFamily: SERIF, fontSize: 12, fontWeight: 400, color: selected ? ACCENT : TEXT, transition: 'color 0.15s' }}>{layout.label}</div>
                            <div style={{ fontFamily: SANS, fontSize: 10, color: MUTED, marginTop: 2, letterSpacing: '0.03em' }}>{layout.sub}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 푸터 ── */}
        <div style={{ padding: '14px 24px 20px', borderTop: `1px solid ${BORDER}`, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: BG }}>
          <p style={{ fontFamily: SANS, fontSize: 11, color: MUTED, margin: 0 }}>
            선택 즉시 자동 저장됩니다
          </p>
          <button
            onClick={onClose}
            style={{
              padding: '10px 28px', background: ACCENT, color: '#fff',
              border: 'none', borderRadius: 24, fontFamily: SANS, fontSize: 13, fontWeight: 500,
              cursor: 'pointer', letterSpacing: 0.3,
              boxShadow: '0 4px 14px rgba(160,82,45,0.35)',
              transition: 'transform 0.18s, box-shadow 0.18s',
            }}
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
}
