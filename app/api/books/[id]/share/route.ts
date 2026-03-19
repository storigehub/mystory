import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-helpers';

type Params = { params: { id: string } };

/**
 * POST /api/books/[id]/share
 * 공유 토큰 생성 (이미 있으면 갱신)
 * Body: { type?: 'reader' | 'interviewer' }  default: 'reader'
 * 반환: { token: string }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const body = await req.json().catch(() => ({}));
    const type: 'reader' | 'interviewer' = body.type === 'interviewer' ? 'interviewer' : 'reader';
    const field = type === 'interviewer' ? 'interviewer_token' : 'share_token';

    const supabase = createServerClient();

    const { data: book, error: fetchErr } = await supabase
      .from('books')
      .select('user_id')
      .eq('id', params.id)
      .single();

    if (fetchErr || !book) {
      return NextResponse.json({ error: '책을 찾을 수 없습니다' }, { status: 404 });
    }
    if (book.user_id && book.user_id !== userId) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
    }

    const token = crypto.randomUUID();

    const { error } = await supabase
      .from('books')
      .update({ [field]: token })
      .eq('id', params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ token, type });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '서버 오류';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/books/[id]/share?type=reader|interviewer
 * 공유 링크 해제
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const type = req.nextUrl.searchParams.get('type') === 'interviewer' ? 'interviewer' : 'reader';
    const field = type === 'interviewer' ? 'interviewer_token' : 'share_token';

    const supabase = createServerClient();

    const { data: book, error: fetchErr } = await supabase
      .from('books')
      .select('user_id')
      .eq('id', params.id)
      .single();

    if (fetchErr || !book) {
      return NextResponse.json({ error: '책을 찾을 수 없습니다' }, { status: 404 });
    }
    if (book.user_id && book.user_id !== userId) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
    }

    const { error } = await supabase
      .from('books')
      .update({ [field]: null })
      .eq('id', params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '서버 오류';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
