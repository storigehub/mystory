import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

function checkAuth(req: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return req.headers.get('x-admin-password') === adminPassword;
}

/**
 * GET /api/admin/users
 * books 테이블에서 user_id 기준으로 집계한 사용자 목록
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: books, error } = await supabase
    .from('books')
    .select('id, title, user_id, created_at, updated_at, is_public')
    .not('user_id', 'is', null)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const allBooks = (books ?? []) as any[];

  // user_id로 집계
  const userMap = new Map<string, {
    userId: string;
    bookCount: number;
    publicBookCount: number;
    firstSeen: string;
    lastActive: string;
    books: { id: string; title: string }[];
  }>();

  for (const book of allBooks) {
    const uid = book.user_id as string;
    if (!uid) continue;
    if (!userMap.has(uid)) {
      userMap.set(uid, {
        userId: uid,
        bookCount: 0,
        publicBookCount: 0,
        firstSeen: book.created_at,
        lastActive: book.updated_at,
        books: [],
      });
    }
    const u = userMap.get(uid)!;
    u.bookCount += 1;
    if (book.is_public) u.publicBookCount += 1;
    if (book.created_at < u.firstSeen) u.firstSeen = book.created_at;
    if (book.updated_at > u.lastActive) u.lastActive = book.updated_at;
    u.books.push({ id: book.id, title: book.title || '(제목 없음)' });
  }

  const users = Array.from(userMap.values()).sort(
    (a, b) => b.lastActive.localeCompare(a.lastActive)
  );

  return NextResponse.json({ users, totalUsers: users.length });
}
