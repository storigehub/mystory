import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

type Params = { params: { id: string } };

/**
 * GET /api/shared/[id]?token=xxx
 * 공개 책 조회 (인증 없음)
 * - is_public = true → 누구나 접근
 * - share_token 일치 → 가족 링크로 접근 (비공개여도 허용)
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    const supabase = createServerClient();

    const { data: book, error: bookErr } = await supabase
      .from('books')
      .select('*')
      .eq('id', params.id)
      .single();

    if (bookErr || !book) {
      return NextResponse.json({ error: '책을 찾을 수 없습니다' }, { status: 404 });
    }

    // 접근 허용 조건: 공개이거나 share_token 또는 interviewer_token 일치
    const tokenMatch = token && (
      (book.share_token && token === book.share_token) ||
      (book.interviewer_token && token === book.interviewer_token)
    );
    if (!book.is_public && !tokenMatch) {
      return NextResponse.json({ error: '비공개 책입니다' }, { status: 403 });
    }

    const { data: chapters, error: chErr } = await supabase
      .from('chapters')
      .select('*, messages ( * ), photos ( * )')
      .eq('book_id', params.id)
      .order('sort_order');

    if (chErr) {
      return NextResponse.json({ error: chErr.message }, { status: 500 });
    }

    return NextResponse.json({ book, chapters: chapters || [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '서버 오류';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
