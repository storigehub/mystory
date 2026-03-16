'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { TOKENS } from '@/lib/design-tokens';

interface UserNavProps {
  /** 로그인 후 돌아올 URL (기본: /my) */
  loginCallbackUrl?: string;
  /** 위치 고정 여부 (기본: fixed) */
  position?: 'fixed' | 'absolute' | 'static';
}

/**
 * 모든 페이지 공통 사용자 네비게이션 버튼
 * - 비로그인: [로그인] 버튼 → /login?callbackUrl=...
 * - 로그인: [👤 이름] 버튼 → /my
 */
export default function UserNav({ loginCallbackUrl = '/my', position = 'fixed' }: UserNavProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 세션 로딩 중 / SSR 시 표시 안 함 (깜빡임 방지)
  if (status === 'loading') return null;

  const btnStyle: React.CSSProperties = {
    position,
    top: 16,
    right: 16,
    zIndex: 50,
    background: 'rgba(255,255,255,0.95)',
    border: `1px solid ${TOKENS.border}`,
    borderRadius: 24,
    padding: '8px 16px',
    fontSize: 14,
    fontFamily: TOKENS.sans,
    color: TOKENS.text,
    cursor: 'pointer',
    boxShadow: TOKENS.shadow,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    backdropFilter: 'blur(8px)',
    whiteSpace: 'nowrap',
  };

  if (session) {
    const displayName = session.user?.name?.split(' ')[0] || '내 정보';
    return (
      <button
        style={btnStyle}
        onClick={() => router.push('/my')}
        aria-label="내 정보 페이지로 이동"
      >
        👤 {displayName}
      </button>
    );
  }

  return (
    <button
      style={{ ...btnStyle, background: TOKENS.dark, color: '#FAFAF9', border: 'none' }}
      onClick={() => {
        const callbackUrl = encodeURIComponent(loginCallbackUrl);
        router.push(`/login?callbackUrl=${callbackUrl}`);
      }}
      aria-label="로그인 페이지로 이동"
    >
      로그인
    </button>
  );
}
