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
    const result = await signIn('credentials', {
      email: email.trim(),
      name: name.trim(),
      redirect: false,
      callbackUrl,
    });

    if (result?.ok) {
      router.push(callbackUrl);
    } else {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl });
  };

  const handleKakaoSignIn = () => {
    signIn('kakao', { callbackUrl });
  };

  const handleGuestContinue = () => {
    // 로그인 없이 계속하기 (localStorage 모드)
    router.push('/');
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: TOKENS.warm,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        fontFamily: TOKENS.serif,
      }}
    >
      <div
        style={{
          background: TOKENS.card,
          borderRadius: 16,
          padding: '36px 28px',
          maxWidth: 400,
          width: '100%',
          boxShadow: TOKENS.shadowLg,
        }}
      >
        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: TOKENS.dark,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              fontSize: 24,
            }}
          >
            📖
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>나의 이야기</h1>
          <p style={{ fontSize: 14, color: TOKENS.subtext, margin: 0, fontFamily: TOKENS.sans }}>
            소중한 인생 이야기를 책으로 남겨요
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 16,
              fontSize: 13,
              color: '#DC2626',
              fontFamily: TOKENS.sans,
            }}
          >
            로그인 중 문제가 발생했어요. 다시 시도해주세요.
          </div>
        )}

        {/* 이메일 로그인 폼 */}
        <form onSubmit={handleEmailSignIn} style={{ marginBottom: 16 }}>
          <label
            style={{
              display: 'block',
              fontSize: 13,
              color: TOKENS.text,
              fontFamily: TOKENS.sans,
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            이메일로 시작하기
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            required
            style={{
              width: '100%',
              padding: '12px 14px',
              border: `1.5px solid ${TOKENS.border}`,
              borderRadius: 8,
              fontSize: 16,
              fontFamily: TOKENS.sans,
              marginBottom: 8,
              boxSizing: 'border-box',
              outline: 'none',
            }}
            onFocus={(e) => (e.target.style.borderColor = TOKENS.accent)}
            onBlur={(e) => (e.target.style.borderColor = TOKENS.border)}
          />

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름 (선택사항)"
            style={{
              width: '100%',
              padding: '12px 14px',
              border: `1.5px solid ${TOKENS.border}`,
              borderRadius: 8,
              fontSize: 16,
              fontFamily: TOKENS.sans,
              marginBottom: 12,
              boxSizing: 'border-box',
              outline: 'none',
            }}
            onFocus={(e) => (e.target.style.borderColor = TOKENS.accent)}
            onBlur={(e) => (e.target.style.borderColor = TOKENS.border)}
          />

          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            style={{
              width: '100%',
              padding: '14px 0',
              background: email.trim() ? TOKENS.dark : TOKENS.borderLight,
              color: email.trim() ? '#FAFAF9' : TOKENS.muted,
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: TOKENS.sans,
              cursor: email.trim() ? 'pointer' : 'not-allowed',
              minHeight: 48,
              transition: 'background .2s',
            }}
          >
            {isLoading ? '로그인 중...' : '시작하기'}
          </button>
        </form>

        {/* 구분선 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            margin: '16px 0',
          }}
        >
          <div style={{ flex: 1, height: 1, background: TOKENS.borderLight }} />
          <span style={{ fontSize: 12, color: TOKENS.muted, fontFamily: TOKENS.sans }}>또는</span>
          <div style={{ flex: 1, height: 1, background: TOKENS.borderLight }} />
        </div>

        {/* 소셜 로그인 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {process.env.NEXT_PUBLIC_GOOGLE_ENABLED !== 'false' && (
            <button
              onClick={handleGoogleSignIn}
              style={{
                width: '100%',
                padding: '13px 0',
                border: `1.5px solid ${TOKENS.border}`,
                borderRadius: 8,
                fontSize: 14,
                fontFamily: TOKENS.sans,
                cursor: 'pointer',
                background: TOKENS.card,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                minHeight: 48,
              }}
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

          <button
            onClick={handleKakaoSignIn}
            style={{
              width: '100%',
              padding: '13px 0',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontFamily: TOKENS.sans,
              cursor: 'pointer',
              background: '#FEE500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              minHeight: 48,
              color: '#1A1816',
            }}
          >
            <svg width="18" height="17" viewBox="0 0 18 17" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M9 0C4.029 0 0 3.134 0 7C0 9.412 1.412 11.55 3.564 12.864L2.764 16.4C2.706 16.658 2.994 16.86 3.21 16.704L7.4 13.916C7.924 13.972 8.458 14 9 14C13.971 14 18 10.866 18 7C18 3.134 13.971 0 9 0Z" fill="#3A1D1D"/>
            </svg>
            카카오로 로그인
          </button>
        </div>

        {/* 비회원 계속하기 */}
        <button
          onClick={handleGuestContinue}
          style={{
            width: '100%',
            padding: '12px 0',
            border: 'none',
            background: 'transparent',
            fontSize: 13,
            fontFamily: TOKENS.sans,
            color: TOKENS.muted,
            cursor: 'pointer',
            marginTop: 16,
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          로그인 없이 계속하기 (기기에만 저장)
        </button>
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
