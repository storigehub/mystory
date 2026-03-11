import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

type Params = { params: { id: string } };

/**
 * GET /api/books/[id]
 * 특정 책과 챕터, 메시지, 사진 모두 가져오기
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const supabase = createServerClient();
    const { data: book, error: bookErr } = await supabase
      .from('books')
      .select('*')
      .eq('id', params.id)
      .single();

    if (bookErr) {
      return NextResponse.json({ error: bookErr.message }, { status: 404 });
    }

    const { data: chapters, error: chErr } = await supabase
      .from('chapters')
      .select(`
        *,
        messages ( * ),
        photos ( * )
      `)
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

/**
 * PUT /api/books/[id]
 * 책 메타데이터 업데이트 (제목, 저자)
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.author !== undefined) updates.author = body.author;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '업데이트할 내용이 없습니다' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase
      .from('books')
      .update(updates)
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '서버 오류';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/books/[id]
 * 책 삭제 (챕터/메시지/사진 CASCADE)
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const supabase = createServerClient();
    const { error } = await supabase
      .from('books')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '서버 오류';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
