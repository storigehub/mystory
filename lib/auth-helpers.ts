import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * 서버 컴포넌트 / API Route에서 현재 로그인 userId를 가져옵니다.
 * 비로그인 시 null 반환.
 */
export async function getSessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string })?.id ?? null;
}

/**
 * userId가 없으면 401 Response를 반환합니다.
 * API Route에서 early return 패턴으로 사용합니다.
 *
 * 사용 예:
 *   const { userId, error } = await requireAuth();
 *   if (error) return error;
 */
export async function requireAuth(): Promise<
  { userId: string; error: null } | { userId: null; error: NextResponse }
> {
  const userId = await getSessionUserId();
  if (!userId) {
    return {
      userId: null,
      error: NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 }),
    };
  }
  return { userId, error: null };
}
