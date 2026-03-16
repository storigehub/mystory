'use client';

import { useRouter } from 'next/navigation';
import { useBook } from '@/lib/book-context';
import { TOKENS } from '@/lib/design-tokens';
import UserNav from '@/components/ui/UserNav';

export default function TocPage() {
  const router = useRouter();
  const { state, reorderChapter, removeChapter, setCurrentChapterIdx } = useBook();

  const handleBack = () => {
    router.back();
  };

  const handleStart = () => {
    setCurrentChapterIdx(0);
    router.push('/write');
  };

  const handleMove = (idx: number, delta: number) => {
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= state.chapters.length) return;
    reorderChapter(idx, newIdx);
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    color: TOKENS.muted,
    marginBottom: 6,
    fontFamily: TOKENS.sans,
    letterSpacing: 2,
  };

  const smallButtonStyle: React.CSSProperties = {
    width: 44,
    height: 44,
    border: `1px solid ${TOKENS.border}`,
    borderRadius: TOKENS.radiusSm,
    background: TOKENS.card,
    cursor: 'pointer',
    fontSize: 15,
    color: TOKENS.subtext,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const dangerButtonStyle: React.CSSProperties = {
    ...smallButtonStyle,
    border: `1px solid #D4A0A0`,
    background: '#FFF8F8',
    color: '#9B2C2C',
  };

  return (
    <div style={{ minHeight: '100dvh', background: TOKENS.bg, padding: '0 16px' }}>
      {/* 공통 사용자 네비게이션 */}
      <UserNav loginCallbackUrl="/toc" />
      <div style={{ maxWidth: 480, margin: '0 auto', paddingTop: 28, paddingBottom: 110 }}>
        {/* Back button */}
        <button
          onClick={handleBack}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 14,
            color: TOKENS.subtext,
            cursor: 'pointer',
            fontFamily: TOKENS.sans,
            marginBottom: 20,
            padding: '8px 0',
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          ← 주제 다시 선택
        </button>

        {/* Header */}
        <label style={labelStyle}>목차</label>
        <h2
          style={{
            fontSize: '1.3rem',
            fontWeight: 400,
            margin: '4px 0 8px',
          }}
        >
          목차를 확인하세요
        </h2>
        <p
          style={{
            fontSize: 13,
            color: TOKENS.muted,
            fontFamily: TOKENS.sans,
            marginBottom: 20,
          }}
        >
          순서를 바꾸거나 빼고 싶은 항목을 정리한 후 시작하세요.
        </p>

        {/* Chapters list */}
        {state.chapters.map((ch, i) => (
          <div
            key={ch.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '14px',
              marginBottom: 5,
              background: TOKENS.card,
              borderRadius: TOKENS.radiusSm,
              border: ch.custom ? `1px dashed ${TOKENS.accent}` : `1px solid ${TOKENS.borderLight}`,
              boxShadow: TOKENS.shadowSm,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: TOKENS.muted,
                fontFamily: TOKENS.sans,
                minWidth: 22,
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span style={{ flex: 1, fontSize: 15 }}>{ch.title}</span>
            {ch.custom && (
              <span
                style={{
                  fontSize: 9,
                  padding: '2px 7px',
                  borderRadius: 3,
                  color: TOKENS.accent,
                  border: `1px solid ${TOKENS.accentBorder}`,
                  fontFamily: TOKENS.sans,
                }}
              >
                직접추가
              </span>
            )}

            {/* Move buttons */}
            <button
              onClick={() => handleMove(i, -1)}
              style={smallButtonStyle}
              disabled={i === 0}
            >
              ↑
            </button>
            <button
              onClick={() => handleMove(i, 1)}
              style={smallButtonStyle}
              disabled={i === state.chapters.length - 1}
            >
              ↓
            </button>

            {/* Delete button */}
            <button
              onClick={() => removeChapter(i)}
              style={dangerButtonStyle}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Bottom button */}
      <div
        className="sa-b-lg"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '14px 16px',
          background: TOKENS.card,
          borderTop: `1px solid ${TOKENS.border}`,
        }}
      >
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <button
            onClick={handleStart}
            style={{
              width: '100%',
              padding: 14,
              background: TOKENS.dark,
              color: '#FAFAF9',
              border: 'none',
              borderRadius: TOKENS.radiusSm,
              fontSize: 15,
              fontFamily: TOKENS.sans,
              fontWeight: 500,
              cursor: 'pointer',
              minHeight: 50,
            }}
          >
            이야기 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
