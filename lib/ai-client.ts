// @ts-nocheck
/**
 * AI 인터뷰 API 호출
 * 대화 모드에서 사용자 답변을 보내고 AI 응답을 받음
 */
export async function getAIResponse(
  messages: { role: "user" | "assistant"; content: string }[],
  topicTitle: string,
  topicId: string,
): Promise<string> {
  try {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, topicTitle, topicId }),
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    return data.text || "이야기를 계속해주세요.";
  } catch (error) {
    console.error("AI response error:", error);
    // 폴백 — API 실패 시 하드코딩 반응 사용
    return null as unknown as string;
  }
}
