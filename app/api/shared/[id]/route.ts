import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

type Params = { params: { id: string } };

/**
 * GET /api/shared/[id]
 * 공개된 책을 인증 없이 조회 — is_public = true 인 경우만 반환
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const supabase = createServerClient();

    const { data: book, error: bookErr } = await supabase
      .from('books')
      .select('*')
      .eq('id', params.id)
      .single();

    if (bookErr || !book) {
      return NextResponse.json({ error: '책을 찾을 수 없습니다' }, { status: 404 });
    }

    if (!book.is_public) {
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
