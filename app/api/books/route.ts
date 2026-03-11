import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

/**
 * GET /api/books
 * 가장 최근 책 가져오기 (이어쓰기용)
 */
export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ book: data || null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '서버 오류';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/books
 * 새 책 생성
 * Body: { title: string, author: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { title, author } = await req.json();

    if (!title) {
      return NextResponse.json({ error: '제목이 필요합니다' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('books')
      .insert({ title: title || '나의 이야기', author: author || '' })
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
