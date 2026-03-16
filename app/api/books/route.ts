import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getSessionUserId, requireAuth } from '@/lib/auth-helpers';

/**
 * GET /api/books
 * 로그인: 내 책 목록 전체 반환 { books: BookSummary[] }
 * 비로그인: 빈 배열 반환 { books: [] }
 */
export async function GET() {
  try {
    const userId = await getSessionUserId();

    if (!userId) {
      return NextResponse.json({ books: [] });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('books')
      .select('id, title, author, created_at, updated_at, chapters(count)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // chapters(count) 결과를 정리
    const books = (data ?? []).map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      created_at: book.created_at,
      updated_at: book.updated_at,
      chapter_count: (book.chapters as unknown as { count: number }[])?.[0]?.count ?? 0,
    }));

    return NextResponse.json({ books });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '서버 오류';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/books
 * 새 책 생성 (로그인 필수)
 * Body: { title: string, author: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const { title, author } = await req.json();

    if (!title) {
      return NextResponse.json({ error: '제목이 필요합니다' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('books')
      .insert({
        title: title || '나의 이야기',
        author: author || '',
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ book: data }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '서버 오류';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
