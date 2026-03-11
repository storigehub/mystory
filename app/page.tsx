'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBook } from '@/lib/book-context';
import { TOKENS } from '@/lib/design-tokens';

export default function LandingPage() {
  const router = useRouter();
  const { state, setTitle, setAuthor } = useBook();
  const [title, setTitleLocal] = useState(state.title);
  const [author, setAuthorLocal] = useState(state.author);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    // Check if user has previous work
    setHasSaved(state.chapters.length > 0);
  }, [state.chapters.length]);

  const handleStart = () => {
    setTitle(title);
    setAuthor(author);
    router.push('/select');
  };

  const handleContinue = () => {
    // Continue to writing page if they have saved work
    if (state.chapters.length > 0) {
      router.push('/write');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    border: `1px solid ${TOKENS.border}`,
    borderRadius: TOKENS.radiusSm,
    fontSize: 16,
    fontFamily: TOKENS.serif,
    outline: 'none',
    background: TOKENS.card,
    color: TOKENS.text,
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.25rem',
        background: `linear-gradient(180deg, ${TOKENS.bg}, ${TOKENS.warm})`,
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 420, width: '100%' }}>
        {/* Decorative line */}
        <div
          style={{
            width: 48,
            height: 1,
            background: TOKENS.text,
            margin: '0 auto 28px',
            opacity: 0.2,
          }}
        />

        {/* Title */}
        <h1
          style={{
            fontSize: TOKENS.h1,
            fontWeight: 300,
            letterSpacing: '-0.03em',
            lineHeight: 1.2,
            marginBottom: 6,
          }}
        >
          나의이야기
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 13,
            fontFamily: TOKENS.sans,
            color: TOKENS.muted,
            letterSpacing: 3,
            marginBottom: 24,
          }}
        >
          당신의 인생을 한 권의 책으로
        </p>

        {/* Steps */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            marginBottom: 28,
            flexWrap: 'wrap',
          }}
        >
          {[
            { n: '1', t: '주제 선택' },
            { n: '2', t: '이야기하기' },
            { n: '3', t: '책 완성' },
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: TOKENS.dark,
                  color: '#FAFAF9',
                  fontSize: 11,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: TOKENS.sans,
                }}
              >
                {step.n}
              </span>
              <span style={{ fontSize: 13, color: TOKENS.subtext, fontFamily: TOKENS.sans }}>
                {step.t}
              </span>
              {i < 2 && <span style={{ color: TOKENS.light, fontSize: 11, marginLeft: 4 }}>→</span>}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div
          style={{
            background: TOKENS.card,
            borderRadius: 12,
            padding: '24px 20px',
            boxShadow: TOKENS.shadowLg,
            textAlign: 'left',
            border: `1px solid ${TOKENS.borderLight}`,
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: 11,
              color: TOKENS.muted,
              marginBottom: 6,
              fontFamily: TOKENS.sans,
              letterSpacing: 2,
            }}
          >
            책 제목
          </label>
          <input
            value={title}
            onChange={(e) => setTitleLocal(e.target.value)}
            placeholder="나의 이야기"
            aria-label="책 제목"
            style={{ ...inputStyle, marginBottom: 16 }}
          />

          <label
            style={{
              display: 'block',
              fontSize: 11,
              color: TOKENS.muted,
              marginBottom: 6,
              fontFamily: TOKENS.sans,
              letterSpacing: 2,
            }}
          >
            지은이
          </label>
          <input
            value={author}
            onChange={(e) => setAuthorLocal(e.target.value)}
            placeholder="홍길동"
            aria-label="지은이"
            style={inputStyle}
          />
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          style={{
            width: '100%',
            padding: 16,
            background: TOKENS.dark,
            color: '#FAFAF9',
            border: 'none',
            borderRadius: TOKENS.radiusSm,
            fontSize: 15,
            fontFamily: TOKENS.sans,
            fontWeight: 500,
            cursor: 'pointer',
            marginTop: 16,
            minHeight: 52,
          }}
        >
          시작하기
        </button>

        {/* Continue button (if has saved) */}
        {hasSaved && (
          <button
            onClick={handleContinue}
            style={{
              width: '100%',
              padding: 14,
              background: 'transparent',
              color: TOKENS.accent,
              border: `1px solid ${TOKENS.accentBorder}`,
              borderRadius: TOKENS.radiusSm,
              fontSize: 14,
              fontFamily: TOKENS.sans,
              cursor: 'pointer',
              marginTop: 8,
              minHeight: 48,
            }}
          >
            이전에 작성하던 책 이어쓰기
          </button>
        )}
      </div>
    </div>
  );
}
