'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TOKENS } from '@/lib/design-tokens';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    const result = await signIn('credentials', { email: email.trim(), name: name.trim(), redirect: false, callbackUrl });
    if (result?.ok) router.push(callbackUrl);
    else setIsLoading(false);
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex',
      background: `linear-gradient(145deg, #FAFAF8 0%, #F0E9DF 100%)`,
    }}>
      {/* 좌측 브랜드 패널 (데스크탑) */}
      <div style={{
        display: 'none', flex: '1 1 50%',
        background: '#1A1816', padding: '64px 56px',
        flexDirection: 'column', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
      }} className="login-brand">
        {/* 배경 패턴 */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(160,82,45,0.15) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60,
          width: 240, height: 240, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,169,110,0.1) 0%, transparent 70%)',
        }} />

        <div style={{ position: 'relative' }}>
          <p style={{ fontFamily: TOKENS.serif, fontSize: 22, color: '#FAFAF9', fontWeight: 300, letterSpacing: '-0.025em', marginBottom: 8 }}>
            나의이야기
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 3, fontFamily: TOKENS.sans, textTransform: 'uppercase' }}>
            My Story
          </p>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ width: 36, height: 1, background: 'rgba(160,82,45,0.6)', marginBottom: 24 }} />
          <p style={{
            fontFamily: TOKENS.serif, fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
            fontWeight: 300, color: '#FAFAF9', lineHeight: 1.45,
            letterSpacing: '-0.02em', wordBreak: 'keep-all',
          }}>
            "당신의 삶은<br />한 권의 책이<br />될 자격이 있습니다"
          </p>
        </div>
      </div>

      {/* 우측 폼 패널 */}
      <div style={{
        flex: '1 1 50%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '40px 24px',
        fontFamily: TOKENS.sans,
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* 모바일 로고 */}
          <div style={{ marginBottom: 40, textAlign: 'center' }}>
            <p style={{ fontFamily: TOKENS.serif, fontSize: 20, fontWeight: 300, color: TOKENS.text, letterSpacing: '-0.025em', marginBottom: 6 }}>
              나의이야기
            </p>
            <p style={{ fontSize: 13, color: TOKENS.subtext, fontWeight: 300 }}>
              소중한 인생 이야기를 책으로 남겨요
            </p>
          </div>

          {/* 에러 */}
          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
              padding: '11px 16px', marginBottom: 20, fontSize: 13, color: '#DC2626',
            }}>
              로그인 중 문제가 발생했어요. 다시 시도해주세요.
            </div>
          )}

          {/* 이메일 폼 */}
          <form onSubmit={handleEmailSignIn} style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 10, color: TOKENS.muted, marginBottom: 9, letterSpacing: 2.5, textTransform: 'uppercase' }}>
              이메일로 시작하기
            </label>
            <input
              type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com" required
              style={{
                width: '100%', padding: '14px 16px', marginBottom: 10,
                border: `1.5px solid ${TOKENS.border}`, borderRadius: 12,
                fontSize: 16, fontFamily: TOKENS.sans, outline: 'none',
                background: '#FFF', color: TOKENS.text, boxSizing: 'border-box',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            />
            <input
              type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름 (선택사항)"
              style={{
                width: '100%', padding: '14px 16px', marginBottom: 14,
                border: `1.5px solid ${TOKENS.border}`, borderRadius: 12,
                fontSize: 16, fontFamily: TOKENS.sans, outline: 'none',
                background: '#FFF', color: TOKENS.text, boxSizing: 'border-box',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            />
            <button type="submit" disabled={isLoading || !email.trim()} style={{
              width: '100%', padding: '16px 0',
              background: email.trim() ? '#1A1816' : TOKENS.borderLight,
              color: email.trim() ? '#FAFAF9' : TOKENS.muted,
              border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500,
              fontFamily: TOKENS.sans, cursor: email.trim() ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s, box-shadow 0.2s',
              boxShadow: email.trim() ? '0 4px 20px rgba(26,24,22,0.18)' : 'none',
            }}>
              {isLoading ? '로그인 중…' : '시작하기'}
            </button>
          </form>

          {/* 구분선 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: TOKENS.borderLight }} />
            <span style={{ fontSize: 12, color: TOKENS.muted }}>또는</span>
            <div style={{ flex: 1, height: 1, background: TOKENS.borderLight }} />
          </div>

          {/* 소셜 로그인 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {process.env.NEXT_PUBLIC_GOOGLE_ENABLED !== 'false' && (
              <button onClick={() => signIn('google', { callbackUrl })} style={{
                width: '100%', padding: '14px 0',
                border: `1.5px solid ${TOKENS.border}`, borderRadius: 12,
                fontSize: 14, fontFamily: TOKENS.sans, cursor: 'pointer',
                background: '#FFF', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 10, transition: 'border-color 0.2s, box-shadow 0.2s',
                color: TOKENS.text,
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#A0522D'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = TOKENS.border; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google로 로그인
              </button>
            )}
            <button onClick={() => signIn('kakao', { callbackUrl })} style={{
              width: '100%', padding: '14px 0', border: 'none', borderRadius: 12,
              fontSize: 14, fontFamily: TOKENS.sans, cursor: 'pointer',
              background: '#FEE500', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 10, color: '#1A1816',
              transition: 'filter 0.2s',
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(0.96)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'none'; }}
            >
              <svg width="18" height="17" viewBox="0 0 18 17" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M9 0C4.029 0 0 3.134 0 7C0 9.412 1.412 11.55 3.564 12.864L2.764 16.4C2.706 16.658 2.994 16.86 3.21 16.704L7.4 13.916C7.924 13.972 8.458 14 9 14C13.971 14 18 10.866 18 7C18 3.134 13.971 0 9 0Z" fill="#3A1D1D"/>
              </svg>
              카카오로 로그인
            </button>
          </div>

          {/* 비회원 */}
          <button onClick={() => router.push('/')} style={{
            width: '100%', padding: '14px 0', border: 'none', background: 'transparent',
            fontSize: 13, fontFamily: TOKENS.sans, color: TOKENS.muted,
            cursor: 'pointer', marginTop: 16,
            textDecoration: 'underline', textUnderlineOffset: 3,
          }}>
            로그인 없이 계속하기 (기기에만 저장)
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#F5F2ED' }} />}>
      <LoginContent />
    </Suspense>
  );
}
