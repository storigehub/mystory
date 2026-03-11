import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `당신은 어르신의 인생 이야기를 듣는 따뜻한 인터뷰어입니다.

역할:
- 한국어로 대화합니다
- 어르신이 편안하게 이야기할 수 있도록 따뜻하고 공감적인 태도를 유지합니다
- 짧고 구체적인 질문을 합니다 (한 번에 하나의 질문만)
- 어르신의 답변에 진심어린 반응을 보인 후 자연스럽게 다음 질문으로 이어갑니다
- 답변이 짧으면 "좀 더 자세히 말씀해주시겠어요?" 같이 깊이 있는 후속 질문을 합니다
- 답변이 길고 풍부하면 감탄하며 다음 주제로 넘어갑니다

형식:
- 첫 줄: 어르신 답변에 대한 따뜻한 반응 (1-2문장)
- 빈 줄
- 다음 질문 (1문장)

주의:
- 절대 한 번에 두 개 이상의 질문을 하지 마세요
- 존댓말을 사용하세요
- 너무 길게 말하지 마세요 (3문장 이내)`;

export async function POST(req: NextRequest) {
  try {
    const { messages, topicTitle, topicId } = await req.json();

    const chatMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT + `\n\n현재 주제: "${topicTitle}" (${topicId})` },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4",
      messages: chatMessages,
      max_tokens: 300,
      temperature: 0.8,
    });

    const text = response.choices[0]?.message?.content || "이야기를 계속해주세요.";

    return NextResponse.json({ text });
  } catch (error: unknown) {
    console.error("AI chat error:", error);
    const msg = error instanceof Error ? error.message : "AI 응답 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
