// ============================================================
// 산문 변환 API — 채팅 대화를 자서전 본문으로 변환
// POST /api/ai/assemble
//
// 챕터의 채팅 메시지들을 받아 OpenAI로 자연스러운
// 자서전 산문으로 변환 후 반환
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

interface AssembleRequest {
  /** 챕터 메시지 배열 (type: user | assistant | photo) */
  messages: Array<{
    type: 'user' | 'assistant' | 'photo';
    text: string;
  }>;
  /** 챕터 제목 */
  chapterTitle: string;
  /** 저자/화자 이름 (선택) */
  userName?: string;
}

interface AssembleResponse {
  prose: string;
  sourceMessageCount: number;
}

/**
 * 사용자 메시지만 추출하여 원시 텍스트로 조합
 */
function buildRawText(
  messages: AssembleRequest['messages']
): { raw: string; userCount: number } {
  const parts: string[] = [];
  let userCount = 0;

  for (const msg of messages) {
    if (msg.type === 'user') {
      parts.push(msg.text.trim());
      userCount++;
    }
    // photo 메시지는 "[사진]" 표시로 포함
    if (msg.type === 'photo') {
      parts.push('[사진 첨부]');
    }
  }

  return { raw: parts.join('\n\n'), userCount };
}

/**
 * 산문 변환 프롬프트 생성 (story-assembler 로직 이식)
 */
function buildPolishPrompt(
  rawText: string,
  chapterTitle: string,
  userName: string
): string {
  return `다음은 "${chapterTitle}" 주제로 ${userName}이(가) 인터뷰 형식으로 들려준 이야기입니다.
이것을 자연스러운 자서전 본문으로 변환해주세요.

## 변환 규칙
1. 1인칭 시점("나는", "내가")으로 통일하세요
2. 구어체를 자연스러운 문어체로 변환하되, 원래 화자의 따뜻한 느낌을 살리세요
3. [사진 첨부] 표시는 자연스럽게 생략하거나 본문에 녹여주세요
4. 시간 순서대로 정리하세요
5. 새로운 내용을 추가하거나 과장하지 마세요
6. 문단을 적절히 나누어 읽기 좋게 구성하세요
7. 화자의 감정이 드러난 부분은 더 풍부하게 살려주세요
8. 최소 3~5문단으로 구성하세요

## 원본 텍스트
${rawText}

## 출력
자연스러운 자서전 본문만 출력하세요. 설명이나 주석은 붙이지 마세요.`;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const body: AssembleRequest = await request.json();
    const { messages, chapterTitle, userName } = body;

    if (!messages?.length || !chapterTitle) {
      return NextResponse.json(
        { error: 'messages와 chapterTitle이 필요합니다.' },
        { status: 400 }
      );
    }

    // 사용자 메시지 추출
    const { raw, userCount } = buildRawText(messages);

    if (!raw.trim()) {
      return NextResponse.json(
        { error: '변환할 내용이 없습니다. 먼저 이야기를 들려주세요.' },
        { status: 400 }
      );
    }

    if (userCount < 2) {
      return NextResponse.json(
        { error: '산문 변환을 위해 최소 2개 이상의 답변이 필요합니다.' },
        { status: 400 }
      );
    }

    const displayName = userName?.trim() || '화자';
    const prompt = buildPolishPrompt(raw, chapterTitle, displayName);

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              '당신은 한국의 자서전 전문 작가입니다. ' +
              '어르신들의 구술 인터뷰를 아름다운 자서전 본문으로 변환하는 것을 전문으로 합니다. ' +
              '화자의 목소리와 감정을 보존하면서 읽기 좋은 산문으로 다듬어주세요.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      console.error('OpenAI error:', err);
      return NextResponse.json(
        { error: '산문 변환에 실패했습니다.' },
        { status: 502 }
      );
    }

    const openaiData = await openaiRes.json();
    const prose = openaiData.choices?.[0]?.message?.content?.trim() || '';

    const response: AssembleResponse = {
      prose,
      sourceMessageCount: userCount,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Assemble error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.', detail: error.message },
      { status: 500 }
    );
  }
}
