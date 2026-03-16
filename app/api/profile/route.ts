import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth-helpers';
import type { Database } from '@/lib/database.types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/profile
 * 내 닉네임 조회
 */
export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { data, error: dbError } = await supabase
    .from('profiles')
    .select('user_id, nickname, updated_at')
    .eq('user_id', userId)
    .single();

  if (dbError && dbError.code !== 'PGRST116') {
    // PGRST116 = row not found (정상 — 아직 프로필 미생성)
    return NextResponse.json({ error: '프로필 조회 실패' }, { status: 500 });
  }

  return NextResponse.json({
    user_id: userId,
    nickname: data?.nickname ?? null,
    updated_at: data?.updated_at ?? null,
  });
}

/**
 * PUT /api/profile
 * 닉네임 수정
 * body: { nickname: string }
 */
export async function PUT(request: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  let body: { nickname?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 });
  }

  const nickname = body.nickname?.trim();
  if (!nickname) {
    return NextResponse.json({ error: '닉네임을 입력해주세요' }, { status: 400 });
  }
  if (nickname.length > 20) {
    return NextResponse.json({ error: '닉네임은 20자 이내로 입력해주세요' }, { status: 400 });
  }

  const { data, error: dbError } = await supabase
    .from('profiles')
    .upsert(
      { user_id: userId, nickname, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (dbError) {
    console.error('[profile PUT]', dbError);
    return NextResponse.json({ error: '닉네임 저장 실패' }, { status: 500 });
  }

  return NextResponse.json({ user_id: userId, nickname: data.nickname });
}
