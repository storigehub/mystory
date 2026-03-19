'use client';

import { useState } from 'react';
import { TOKENS } from '@/lib/design-tokens';

interface Props {
  onClose: () => void;
  onStart: () => void;
}

export default function OnboardingModal({ onClose, onStart }: Props) {
  const [show, setShow] = useState(() => !localStorage.getItem('mystory_visited'));

  if (!show) return null;

  const close = (andStart?: boolean) => {
    localStorage.setItem('mystory_visited', 'true');
    setShow(false);
    if (andStart) onStart();
    else onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(26,24,22,0.6)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
      onClick={() => close()}
    >
      <div
        style={{
          background: '#FAFAF8', borderRadius: 24,
          padding: '44px 36px 36px', maxWidth: 480, width: '100%',
          position: 'relative', boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 */}
        <button
          onClick={() => close()}
          style={{
            position: 'absolute', top: 18, right: 20,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 22, color: TOKENS.muted, lineHeight: 1, padding: '4px 8px',
          }}
        >
          ×
        </button>

        {/* 책 아이콘 */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{
            width: 56, height: 68, margin: '0 auto',
            background: 'linear-gradient(160deg, #8B7355, #6B5535)',
            borderRadius: '3px 7px 7px 3px', position: 'relative',
            boxShadow: '2px 2px 10px rgba(0,0,0,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: 'rgba(0,0,0,0.18)', borderRadius: '3px 0 0 3px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 6 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ width: 22, height: 1, background: 'rgba(255,255,255,0.3)' }} />
              ))}
            </div>
          </div>
        </div>

        {/* 타이틀 */}
        <h2 style={{
          fontFamily: TOKENS.serif, fontSize: 'clamp(1.3rem, 4vw, 1.55rem)',
          fontWeight: 300, letterSpacing: '-0.025em', textAlign: 'center',
          color: TOKENS.text, marginBottom: 10, lineHeight: 1.3,
        }}>
          나의이야기에<br />오신 것을 환영합니다
        </h2>
        <p style={{
          fontSize: 14, color: TOKENS.subtext, textAlign: 'center',
          lineHeight: 1.7, marginBottom: 32, wordBreak: 'keep-all', fontWeight: 300,
        }}>
          AI와의 대화로 당신의 삶을 한 권의 책으로 완성하는 서비스입니다.
        </p>

        {/* 3단계 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
          {[
            { n: '01', title: '주제를 고르세요', desc: '탄생·학창시절·사랑 등 72가지 테마 중 내 이야기와 맞는 것을 선택합니다.' },
            { n: '02', title: 'AI와 편하게 대화하세요', desc: '글쓰기 실력은 필요 없어요. AI가 질문하면 말씀하시듯 대답만 하시면 됩니다.' },
            { n: '03', title: '책이 완성됩니다', desc: '이야기가 아름다운 책으로 정리됩니다. 가족과 함께 읽고 PDF로 간직하세요.' },
          ].map((step) => (
            <div key={step.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: `1.5px solid ${TOKENS.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 10, color: TOKENS.subtext, fontFamily: TOKENS.sans, letterSpacing: '0.05em' }}>
                  {step.n}
                </span>
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: TOKENS.text, margin: '4px 0 3px', fontFamily: TOKENS.serif }}>
                  {step.title}
                </p>
                <p style={{ fontSize: 12.5, color: TOKENS.subtext, lineHeight: 1.65, margin: 0, wordBreak: 'keep-all', fontWeight: 300 }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => close(true)}
          style={{
            width: '100%', padding: '15px',
            background: TOKENS.dark, color: '#FAFAF9',
            border: 'none', borderRadius: 40,
            fontSize: 15, fontWeight: 500, cursor: 'pointer',
            letterSpacing: '0.01em', fontFamily: TOKENS.sans,
          }}
        >
          시작하기
        </button>
        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: TOKENS.muted }}>
          다음에는 이 화면이 나타나지 않습니다
        </p>
      </div>
    </div>
  );
}
