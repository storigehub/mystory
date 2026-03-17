import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

function checkAuth(req: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return req.headers.get('x-admin-password') === adminPassword;
}

/**
 * GET /api/admin/stats
 * 서비스 전체 통계 + 최근 책 목록
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: books, error } = await supabase
    .from('books')
    .select('id, title, author, user_id, created_at, updated_at, is_public')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const allBooks = (books ?? []) as any[];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const uniqueUsers = new Set(allBooks.map((b) => b.user_id).filter(Boolean));

  const stats = {
    totalBooks: allBooks.length,
    publicBooks: allBooks.filter((b) => b.is_public).length,
    newBooksThisWeek: allBooks.filter((b) => b.created_at > weekAgo).length,
    totalUsers: uniqueUsers.size,
  };

  return NextResponse.json({ stats, books: allBooks });
}
