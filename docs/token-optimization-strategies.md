# ChatEditor AI 토큰 최적화 전략

> **작성일**: 2026-03-23
> **대상 파일**: `components/write/ChatEditor.tsx`, `app/api/ai/chat/route.ts`
> **상태**: 📋 계획 수립 완료 — 충분한 실사용 테스트 후 필요 시 적용

---

## 1. 현재 구조와 문제점

### 현재 흐름

```
사용자 답변 입력
  → ChatEditor.callAI()
  → chapter.messages 전체를 role/content 배열로 변환
  → POST /api/ai/chat { messages: 전체누적, topicTitle, topicId }
  → GPT-4o-mini: 시스템 프롬프트 + 전체 대화 → 반응 + 다음 질문 (max 300토큰)
```

### 토큰 누적 패턴 (삼각형 누적)

| 회차 | 입력 토큰 (추정) | 출력 토큰 |
|------|----------------|----------|
| 1턴 | ~350 | ~150 |
| 5턴 | ~1,500 | ~150 |
| 10턴 | ~3,000 | ~150 |
| 15턴 | ~4,500 | ~150 |
| **15턴 합산** | **~25,000** | **~2,250** |

- 입력이 `n*(n+1)/2` 패턴으로 누적 (매 호출마다 1턴부터 다시 전송)
- 출력은 `max_tokens: 300`으로 제한되어 있어 안정적
- GPT-4o-mini 기준 입력 $0.15/1M, 출력 $0.60/1M 토큰

### 비용 계산 (챕터 1개, 15턴 기준)

```
현재: 입력 25,000 + 출력 2,250 토큰
  = $0.00375 + $0.00135 ≈ $0.005/챕터
```

책 1권(10챕터 × 15턴) = 약 $0.05 (극히 저렴)
→ **현재 규모에서는 비용 자체보다 OpenAI quota 소진 속도가 실질적 문제**

---

## 2. 최적화 방안

### 방안 A: 슬라이딩 윈도우 + 요약 ⭐ (핵심 추천)

전체 대화 대신 **최근 N턴 원문 + 이전 대화 요약문** 전송.

#### 구현 구조

```
[시스템 프롬프트 ~200토큰]
[컨텍스트 요약: "주제: 학창시절. 지금까지: 1970년 서울 중학교 입학,
 버스 통학, 선생님 이름 박철수. 가장 좋아한 과목은 수학."] ← 100~150토큰
[AI 8턴] 수학을 좋아하셨던 이유가 있으셨나요?              ← 최근 4턴 원문
[사용자 8턴] 선생님이 재미있게 가르쳐주셔서요...
[AI 9턴] 선생님께서 특별한 분이셨군요...
[사용자 9턴] 네, 방과후에도 남아서...                     ← 최근 4턴 원문
[새 답변]                                               ← 현재 입력
```

#### 로직

```typescript
// api/ai/chat/route.ts 수정안
const WINDOW_SIZE = 4;        // 원문으로 보낼 최근 턴 수
const SUMMARY_THRESHOLD = 6;  // 이 턴 수 초과 시 요약 모드 활성화

function buildMessages(allMessages, userText, summary) {
  const recent = allMessages.slice(-WINDOW_SIZE);

  const contextMessage = summary
    ? { role: 'system', content: `[이전 대화 요약]\n${summary}` }
    : null;

  return [
    systemPrompt,
    ...(contextMessage ? [contextMessage] : []),
    ...recent.map(toRoleContent),
    { role: 'user', content: userText },
  ];
}
```

#### 요약 생성 시점

- `messages.length >= SUMMARY_THRESHOLD` 이 되는 순간 1회 요약 생성
- 이후 3턴마다 요약 갱신 (요약 자체도 GPT-4o-mini, max_tokens: 150)
- 요약은 **클라이언트 state로 보관** (ChatEditor의 `summaryRef`)

#### 예상 효과

```
적용 후 15턴 합산: 입력 ~12,000토큰 (현재 대비 52% 절감)
요약 생성 비용 추가: +~2,000토큰
순 절감: 약 44%
```

---

### 방안 B: 하이브리드 로컬/AI ⭐ (추가 절감)

**모든 턴에서 API를 호출하지 않고**, 조건에 따라 로컬 질문풀 우선 사용.

#### 트리거 조건

| 조건 | 처리 |
|------|------|
| 사용자 답변 < 30자 (짧은 답변) | 로컬 `DEEP_FOLLOW` 질문 (🆓) |
| 사용자 답변 30~200자 (보통) | 로컬 질문풀 순서대로 (🆓) |
| 사용자 답변 > 200자 (풍부한 답변) | AI 호출 — 감정 공감 + 맞춤 후속질문 (💰) |
| 키워드 감지: "힘들었", "슬펐", "그리워", "행복" | AI 호출 — 감성 반응 필수 (💰) |
| 매 N번째 턴 (예: 3의 배수) | AI 호출 — 흐름 유지 (💰) |

#### 예상 API 호출 비율

```
15턴 중 API 호출: 5~7회 (현재 15회 → 67% 감소)
15턴 합산 입력: ~8,000토큰 (현재 대비 68% 절감)
```

---

### 방안 C: 메시지 압축 (간단 구현)

API 호출 횟수는 유지하되, 오래된 메시지 내용을 **앞 80자만** 전송.

```typescript
function compressOldMessages(messages, keepRecentN = 4) {
  return messages.map((m, i) => {
    if (i >= messages.length - keepRecentN) return m; // 최근 N개 원문 유지
    return { ...m, content: m.content.slice(0, 80) + (m.content.length > 80 ? '…' : '') };
  });
}
```

- 구현 5분, 리스크 낮음
- 효과: 입력 토큰 30~40% 절감
- 단점: AI가 앞부분 내용을 정확히 기억 못할 수 있음

---

## 3. 추천 적용 순서

```
1단계 (지금): 현재 방식 유지 + 실사용 테스트로 체감 품질 확인
2단계 (필요시): 방안 C (압축) 먼저 적용 — 코드 5줄, 리스크 최소
3단계 (quota 이슈 빈발 시): 방안 A (슬라이딩 윈도우) 적용
4단계 (비용 절감 목표 시): 방안 B (하이브리드) 추가
```

---

## 4. 구현 가이드 (방안 A 상세)

### 변경 파일

1. `app/api/ai/chat/route.ts` — 슬라이딩 윈도우 로직 추가
2. `components/write/ChatEditor.tsx` — summary state 관리, API 호출 시 요약 전달

### route.ts 수정 포인트

```typescript
// 기존
const { messages, topicTitle, topicId } = await req.json();

// 변경
const { messages, topicTitle, topicId, summary } = await req.json();

const WINDOW_SIZE = 4;
const recentMessages = messages.slice(-WINDOW_SIZE);
const chatMessages = [
  { role: 'system', content: SYSTEM_PROMPT + `\n\n현재 주제: "${topicTitle}"` },
  ...(summary ? [{ role: 'system', content: `[이전 대화 요약]\n${summary}` }] : []),
  ...recentMessages.map(sanitizeMessage),
];
```

### ChatEditor.tsx 수정 포인트

```typescript
// 추가할 state/ref
const summaryRef = useRef<string>('');
const SUMMARY_THRESHOLD = 6;

// callAI 함수 내 요약 갱신 로직
if (chapter.messages.length >= SUMMARY_THRESHOLD &&
    chapter.messages.length % 3 === 0) {
  // 비동기로 요약 갱신 (현재 응답에는 영향 없음)
  updateSummary();
}

// fetch 시 summary 포함
body: JSON.stringify({
  messages,
  topicTitle: chapter.title,
  topicId: chapter.tid,
  summary: summaryRef.current,  // ← 추가
}),
```

### 요약 생성 API 엔드포인트

`POST /api/ai/summarize` (신규) — max_tokens: 150, temperature: 0.3

```typescript
// 프롬프트
`다음 대화를 100자 이내로 요약하세요.
주제: ${topicTitle}
핵심 사실(날짜, 장소, 이름, 사건)만 포함하세요.
대화:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}`
```

---

## 5. 방안별 비교표

| | 현재 | 방안 C (압축) | 방안 A (윈도우) | A+B (혼합) |
|---|------|-------------|----------------|-----------|
| 구현 난이도 | — | ⭐ 쉬움 | ⭐⭐ 보통 | ⭐⭐⭐ 복잡 |
| 토큰 절감 | 0% | ~35% | ~50% | ~75% |
| 대화 품질 영향 | — | 미미 | 거의 없음 | 있을 수 있음 |
| API 호출 횟수 | 매 턴 | 매 턴 | 매 턴 | 50% 감소 |
| 추가 API 필요 | 없음 | 없음 | 요약 API 1개 | 없음 |
| 권장 시점 | 현재 | 테스트 후 | quota 이슈 시 | 비용 목표 시 |

---

## 6. 모니터링 지표

최적화 적용 전후 비교를 위해 확인할 지표:

- **OpenAI 대시보드** → Usage → 일별 토큰 소비량
- **체감 품질**: AI 반응이 앞선 내용을 잘 기억하는가?
- **대화 자연스러움**: 요약 모드 전환 시 맥락 끊김 없는가?
- **응답 속도**: 윈도우 적용 후 응답이 더 빨라지는가? (입력 감소 효과)
