import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/ai/summarize
 * 대화 히스토리를 100자 이내로 요약 — 토큰 최적화 방안 A
 */
export async function POST(req: NextRequest) {
  try {
    const { messages, topicTitle } = await req.json();

    const dialogue = messages
      .map((m: { role: string; content: string }) =>
        `${m.role === 'user' ? '어르신' : 'AI'}: ${m.content.slice(0, 200)}`
      )
      .join('\n');

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `다음 대화에서 핵심 사실(날짜, 장소, 이름, 주요 사건)만 추려 100자 이내 한국어로 요약하세요. 문장이 아닌 키워드 나열 형식도 좋습니다.`,
        },
        {
          role: "user",
          content: `주제: ${topicTitle}\n\n${dialogue}`,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const summary = response.choices[0]?.message?.content?.trim() || '';
    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Summarize error:", error);
    return NextResponse.json({ summary: '' });
  }
}
