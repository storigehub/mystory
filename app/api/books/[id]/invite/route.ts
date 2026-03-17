import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServerClient } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-helpers';

type Params = { params: { id: string } };

/**
 * POST /api/books/[id]/invite
 * 가족에게 이메일 초대장 발송
 * Body: { email: string, type: 'reader' | 'interviewer', token: string }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY가 설정되지 않았습니다' }, { status: 500 });
    }

    const { email, type, token } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: '올바른 이메일 주소를 입력해주세요' }, { status: 400 });
    }
    if (!token) {
      return NextResponse.json({ error: '공유 링크를 먼저 생성해주세요' }, { status: 400 });
    }

    // 소유자 검증 + 책 정보 조회
    const supabase = createServerClient();
    const { data: book, error: fetchErr } = await supabase
      .from('books')
      .select('user_id, title, author')
      .eq('id', params.id)
      .single();

    const bookData = book as any;

    if (fetchErr || !bookData) {
      return NextResponse.json({ error: '책을 찾을 수 없습니다' }, { status: 404 });
    }
    if (bookData.user_id && bookData.user_id !== userId) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
    }

    const origin = process.env.NEXTAUTH_URL || 'https://mystory-khaki.vercel.app';
    const bookTitle = bookData.title || '나의 이야기';
    const bookAuthor = bookData.author || '저자';

    const isInterviewer = type === 'interviewer';
    const link = isInterviewer
      ? `${origin}/interviewer/${params.id}?token=${token}`
      : `${origin}/shared/${params.id}?token=${token}`;

    const roleLabel = isInterviewer ? '인터뷰어' : '열람';
    const roleDesc = isInterviewer
      ? '질문을 남겨 이야기 집필을 도와줄 수 있습니다'
      : '소중한 이야기를 읽어볼 수 있습니다';
    const btnLabel = isInterviewer ? '질문 남기러 가기' : '이야기 읽으러 가기';
    const btnColor = isInterviewer ? '#7C3AED' : '#1A1816';

    const resend = new Resend(resendApiKey);

    const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F5F2ED;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F2ED;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

        <!-- 헤더 -->
        <tr><td style="background:#1A1816;padding:32px 40px;">
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:4px;font-family:sans-serif;">나의이야기</p>
          <h1 style="margin:12px 0 0;font-size:22px;font-weight:300;color:#FAFAF9;letter-spacing:-0.02em;line-height:1.3;">
            ${bookAuthor}님의 이야기에<br>초대받으셨습니다
          </h1>
        </td></tr>

        <!-- 책 정보 -->
        <tr><td style="padding:32px 40px 24px;border-bottom:1px solid #F0EBE3;">
          <p style="margin:0 0 6px;font-size:11px;color:#78716C;font-family:sans-serif;letter-spacing:2px;">초대받은 책</p>
          <p style="margin:0;font-size:20px;color:#1A1816;font-weight:300;letter-spacing:-0.02em;">${bookTitle}</p>
          <p style="margin:6px 0 0;font-size:14px;color:#6B6560;">by ${bookAuthor}</p>
        </td></tr>

        <!-- 초대 설명 -->
        <tr><td style="padding:24px 40px;">
          <div style="background:#F5F2ED;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
            <p style="margin:0 0 4px;font-size:12px;color:#7C3AED;font-family:sans-serif;font-weight:600;">${roleLabel} 초대</p>
            <p style="margin:0;font-size:14px;color:#44403C;line-height:1.6;font-family:sans-serif;">${roleDesc}</p>
          </div>
          <a href="${link}" style="display:block;text-align:center;background:${btnColor};color:#FFFFFF;text-decoration:none;padding:16px 24px;border-radius:8px;font-size:15px;font-family:sans-serif;font-weight:500;letter-spacing:-0.01em;">
            ${btnLabel}
          </a>
        </td></tr>

        <!-- 링크 직접 표시 -->
        <tr><td style="padding:0 40px 24px;">
          <p style="margin:0 0 6px;font-size:11px;color:#78716C;font-family:sans-serif;">버튼이 작동하지 않으면 아래 링크를 복사하세요</p>
          <p style="margin:0;font-size:11px;color:#78716C;word-break:break-all;font-family:monospace;">${link}</p>
        </td></tr>

        <!-- 푸터 -->
        <tr><td style="background:#F5F2ED;padding:20px 40px;border-top:1px solid #E8E3DC;">
          <p style="margin:0;font-size:11px;color:#A8A29E;font-family:sans-serif;text-align:center;">
            이 메일은 나의이야기 서비스를 통해 발송되었습니다
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const fromAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const { data, error: sendError } = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: `[나의이야기] ${bookAuthor}님이 "${bookTitle}"에 초대했습니다`,
      html,
    });

    if (sendError) {
      console.error('Resend error:', sendError);
      return NextResponse.json({ error: '이메일 발송에 실패했습니다' }, { status: 502 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '서버 오류';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
