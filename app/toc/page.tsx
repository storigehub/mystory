'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBook } from '@/lib/book-context';
import { TOKENS } from '@/lib/design-tokens';
import UserNav from '@/components/ui/UserNav';

const ACCENT = '#A0522D';
const GOLD = '#C9A96E';
const ACCENT_BG = '#FBF6F1';
const ACCENT_BORDER = '#E8D0BC';

export default function TocPage() {
  const router = useRouter();
  const { state, reorderChapter, removeChapter, setCurrentChapterIdx } = useBook();
  const [hovered, setHovered] = useState<number | null>(null);

  const handleStart = () => {
    setCurrentChapterIdx(0);
    router.push('/write');
  };

  const handleMove = (idx: number, delta: number) => {
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= state.chapters.length) return;
    reorderChapter(idx, newIdx);
  };

  const total = state.chapters.length;

  return (
    <div style={{ minHeight: '100dvh', background: TOKENS.bg }}>
      {/* 상단 그라디언트 진행 바 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${ACCENT}, ${GOLD})`,
          zIndex: 100,
        }}
      />

      {/* Step indicator */}
      <div
        style={{
          position: 'fixed',
          top: 2,
          left: 0,
          right: 0,
          background: TOKENS.bg,
          borderBottom: `1px solid ${TOKENS.borderLight}`,
          zIndex: 90,
        }}
      >
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
          {['주제 선택', '목차 확인', '이야기 쓰기'].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 10px',
                  borderRadius: 20,
                  background: i === 1 ? ACCENT : i < 1 ? TOKENS.warm : 'transparent',
                  border: `1px solid ${i === 1 ? ACCENT : i < 1 ? TOKENS.borderLight : TOKENS.borderLight}`,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: i === 1 ? '#fff' : i < 1 ? TOKENS.muted : TOKENS.light,
                    fontFamily: TOKENS.sans,
                    letterSpacing: 0.5,
                  }}
                >
                  {i < 1 ? '✓' : String(i + 1).padStart(2, '0')}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: i === 1 ? '#fff' : i < 1 ? TOKENS.muted : TOKENS.light,
                    fontFamily: TOKENS.sans,
                  }}
                >
                  {step}
                </span>
              </div>
              {i < 2 && (
                <div style={{ width: 16, height: 1, background: TOKENS.borderLight }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 사용자 네비게이션 */}
      <div style={{ paddingTop: 44 }}>
        <UserNav loginCallbackUrl="/toc" />
      </div>

      {/* 본문 */}
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 20px 140px' }}>
        {/* 뒤로 가기 */}
        <button
          onClick={() => router.back()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            fontSize: 13,
            color: TOKENS.muted,
            cursor: 'pointer',
            fontFamily: TOKENS.sans,
            marginBottom: 24,
            padding: '6px 0',
            minHeight: 36,
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = TOKENS.text)}
          onMouseLeave={(e) => (e.currentTarget.style.color = TOKENS.muted)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          주제 다시 선택
        </button>

        {/* 헤더 */}
        <div style={{ marginBottom: 28 }}>
          <p
            style={{
              fontSize: 10,
              letterSpacing: 3,
              color: TOKENS.muted,
              fontFamily: TOKENS.sans,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Step 02 · Table of Contents
          </p>
          <h2
            style={{
              fontSize: 'clamp(1.2rem, 5vw, 1.5rem)',
              fontWeight: 400,
              fontFamily: TOKENS.serif,
              color: TOKENS.text,
              margin: '0 0 8px',
              lineHeight: 1.4,
            }}
          >
            목차를 확인하세요
          </h2>
          <p style={{ fontSize: 13, color: TOKENS.muted, fontFamily: TOKENS.sans, margin: 0, lineHeight: 1.6 }}>
            순서를 바꾸거나 빼고 싶은 항목을 정리한 후 시작하세요.
          </p>

          {/* 챕터 수 요약 */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 14,
              padding: '8px 16px',
              background: ACCENT_BG,
              border: `1px solid ${ACCENT_BORDER}`,
              borderRadius: 20,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <span style={{ fontSize: 12, color: ACCENT, fontWeight: 600, fontFamily: TOKENS.sans }}>
              총 {total}개 챕터
            </span>
          </div>
        </div>

        {/* 챕터 목록 */}
        {state.chapters.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 24px',
              background: TOKENS.warm,
              borderRadius: 16,
              border: `1px dashed ${TOKENS.border}`,
            }}
          >
            <p style={{ fontSize: 14, color: TOKENS.muted, fontFamily: TOKENS.sans }}>
              선택된 챕터가 없습니다
            </p>
            <button
              onClick={() => router.back()}
              style={{
                marginTop: 12,
                padding: '10px 24px',
                background: ACCENT,
                color: '#fff',
                border: 'none',
                borderRadius: 40,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: TOKENS.sans,
                fontWeight: 500,
              }}
            >
              주제 선택하러 가기
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {state.chapters.map((ch, i) => (
              <div
                key={ch.id}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  background: hovered === i ? TOKENS.warm : TOKENS.card,
                  borderRadius: 14,
                  border: ch.custom
                    ? `1.5px dashed ${ACCENT_BORDER}`
                    : `1px solid ${hovered === i ? TOKENS.border : TOKENS.borderLight}`,
                  boxShadow: hovered === i ? '0 4px 16px rgba(0,0,0,0.06)' : '0 1px 4px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                  cursor: 'default',
                }}
              >
                {/* 순서 번호 */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: i === 0
                      ? `linear-gradient(135deg, ${ACCENT}, ${GOLD})`
                      : TOKENS.warm,
                    border: i === 0 ? 'none' : `1px solid ${TOKENS.borderLight}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: i === 0 ? '#fff' : TOKENS.muted,
                      fontFamily: TOKENS.sans,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>

                {/* 챕터 제목 */}
                <span
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontFamily: TOKENS.serif,
                    color: TOKENS.text,
                    lineHeight: 1.4,
                  }}
                >
                  {ch.title}
                </span>

                {/* 직접추가 배지 */}
                {ch.custom && (
                  <span
                    style={{
                      fontSize: 9,
                      padding: '2px 8px',
                      borderRadius: 10,
                      color: ACCENT,
                      border: `1px solid ${ACCENT_BORDER}`,
                      fontFamily: TOKENS.sans,
                      letterSpacing: 0.5,
                      flexShrink: 0,
                    }}
                  >
                    직접추가
                  </span>
                )}

                {/* 순서 이동 버튼 */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => handleMove(i, -1)}
                    disabled={i === 0}
                    style={{
                      width: 32,
                      height: 32,
                      border: `1px solid ${i === 0 ? TOKENS.borderLight : TOKENS.border}`,
                      borderRadius: 8,
                      background: TOKENS.card,
                      cursor: i === 0 ? 'not-allowed' : 'pointer',
                      fontSize: 13,
                      color: i === 0 ? TOKENS.light : TOKENS.subtext,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (i > 0) {
                        e.currentTarget.style.background = TOKENS.warm;
                        e.currentTarget.style.borderColor = TOKENS.border;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = TOKENS.card;
                    }}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMove(i, 1)}
                    disabled={i === state.chapters.length - 1}
                    style={{
                      width: 32,
                      height: 32,
                      border: `1px solid ${i === state.chapters.length - 1 ? TOKENS.borderLight : TOKENS.border}`,
                      borderRadius: 8,
                      background: TOKENS.card,
                      cursor: i === state.chapters.length - 1 ? 'not-allowed' : 'pointer',
                      fontSize: 13,
                      color: i === state.chapters.length - 1 ? TOKENS.light : TOKENS.subtext,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (i < state.chapters.length - 1) {
                        e.currentTarget.style.background = TOKENS.warm;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = TOKENS.card;
                    }}
                  >
                    ↓
                  </button>

                  {/* 삭제 버튼 */}
                  <button
                    onClick={() => removeChapter(i)}
                    style={{
                      width: 32,
                      height: 32,
                      border: `1px solid #E8C4C4`,
                      borderRadius: 8,
                      background: '#FFF8F8',
                      cursor: 'pointer',
                      fontSize: 14,
                      color: '#B45454',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#FFF0F0';
                      e.currentTarget.style.borderColor = '#D08080';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#FFF8F8';
                      e.currentTarget.style.borderColor = '#E8C4C4';
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 안내 텍스트 */}
        {total > 0 && (
          <p
            style={{
              marginTop: 20,
              fontSize: 12,
              color: TOKENS.muted,
              fontFamily: TOKENS.sans,
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            챕터는 나중에 글쓰기 화면에서도 언제든 수정할 수 있어요
          </p>
        )}
      </div>

      {/* 하단 고정 시작 버튼 */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '14px 20px 24px',
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: `1px solid ${TOKENS.borderLight}`,
          boxShadow: '0 -8px 32px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          {/* 미니 진행 표시 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
            {[0, 1, 2].map((dot) => (
              <div
                key={dot}
                style={{
                  width: dot === 1 ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: dot === 1
                    ? `linear-gradient(90deg, ${ACCENT}, ${GOLD})`
                    : dot < 1 ? TOKENS.muted : TOKENS.light,
                  transition: 'all 0.3s',
                }}
              />
            ))}
          </div>

          <button
            onClick={handleStart}
            disabled={total === 0}
            style={{
              width: '100%',
              padding: '15px 0',
              background: total === 0
                ? TOKENS.light
                : `linear-gradient(135deg, ${TOKENS.dark} 0%, #2D2926 100%)`,
              color: total === 0 ? TOKENS.muted : '#FAFAF9',
              border: 'none',
              borderRadius: 40,
              fontSize: 15,
              fontWeight: 600,
              cursor: total === 0 ? 'not-allowed' : 'pointer',
              fontFamily: TOKENS.sans,
              letterSpacing: 0.3,
              boxShadow: total === 0 ? 'none' : '0 6px 20px rgba(26,24,22,0.2)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              if (total > 0) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 28px rgba(26,24,22,0.28)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = total === 0 ? 'none' : '0 6px 20px rgba(26,24,22,0.2)';
            }}
          >
            이야기 시작하기  →
          </button>
        </div>
      </div>
    </div>
  );
}
