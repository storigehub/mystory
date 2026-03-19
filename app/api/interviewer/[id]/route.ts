import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

type Params = { params: { id: string } };

/**
 * POST /api/interviewer/[bookId]
 * 인터뷰어가 특정 챕터에 질문 추가
 * Body: { token: string, chapterId: string, question: string }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { token, chapterId, question } = await req.json();

    if (!token || !chapterId || !question?.trim()) {
      return NextResponse.json({ error: '필수 항목이 없습니다' }, { status: 400 });
    }

    const supabase = createServerClient();

    // 토큰 검증 (interviewer_token 우선, share_token 하위 호환)
    const { data: book, error: bookErr } = await supabase
      .from('books')
      .select('id, share_token, interviewer_token')
      .eq('id', params.id)
      .single();

    if (bookErr || !book) {
      return NextResponse.json({ error: '책을 찾을 수 없습니다' }, { status: 404 });
    }
    const validToken =
      (book.interviewer_token && book.interviewer_token === token) ||
      (!book.interviewer_token && book.share_token && book.share_token === token);
    if (!validToken) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다' }, { status: 403 });
    }

    // 챕터 소속 확인
    const { data: chapter, error: chErr } = await supabase
      .from('chapters')
      .select('id')
      .eq('id', chapterId)
      .eq('book_id', params.id)
      .single();

    if (chErr || !chapter) {
      return NextResponse.json({ error: '챕터를 찾을 수 없습니다' }, { status: 404 });
    }

    // 현재 마지막 sort_order 조회
    const { data: lastMsg } = await supabase
      .from('messages')
      .select('sort_order')
      .eq('chapter_id', chapterId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const sortOrder = (lastMsg?.sort_order ?? -1) + 1;

    // 인터뷰어 질문 삽입
    const { error: insertErr } = await supabase
      .from('messages')
      .insert({
        chapter_id: chapterId,
        type: 'interviewer',
        text: question.trim(),
        sort_order: sortOrder,
      });

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '서버 오류';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
