# 🚀 Phase 3 개발 로드맵 (나의이야기)

## 개요
Phase 1+2에서 완성한 프로토타입과 백엔드 모듈을 mystory(배포 폴더)에 통합하고, Next.js 14 프로덕션 프로젝트로 완성하는 단계.

**목표**: Supabase + Vercel로 배포 가능한 완전한 웹앱 완성

**예상 기간**: 4주 (Phase 3a: 1주, Phase 3b: 1주, Phase 3c: 1주, Phase 4 준비: 1주)

---

## Phase 3a: 프론트엔드 컴포넌트화 (Week 1)

### 목표
mystory-app.jsx의 단일 파일 React 앱을 Next.js 페이지 컴포넌트로 분해.

### 작업 내용

#### 1. 페이지 구조 분석 (mystory-handoff/mystory-app.jsx)
- **Landing**: 책 제목/저자 입력 + 3단계 안내
- **SelectPage**: 72개 주제 카드 + 카테고리 아코디언 + 커스텀 챕터 추가
- **WritePage**: 대화/일반 모드 + 에디터 + 음성 입력 + 사진 첨부
- **BookPage**: 표지 + 목차 + 본문 미리보기
- **SettingsPanel**: 사이드바 (STT 모드, 텍스트 크기, 진행률)

#### 2. 페이지 컴포넌트 생성
```
app/
├── page.tsx                    ← Landing
├── select/
│   └── page.tsx               ← Topic Selection
├── write/
│   └── page.tsx               ← Writing (Chat + Free Write)
├── book/
│   └── page.tsx               ← Book Preview
└── layout.tsx                 ← Root Layout (Global Styles, Provider)

components/
├── landing/
│   ├── LandingForm.tsx        ← 제목/저자 입력
│   └── StepsGuide.tsx         ← 3단계 안내
├── select/
│   ├── TopicCard.tsx          ← 개별 카드
│   ├── TopicGrid.tsx          ← 72개 카드 그리드
│   ├── CategoryAccordion.tsx   ← 카테고리별 그룹
│   ├── SearchBar.tsx          ← 검색
│   └── CustomChapterForm.tsx   ← 커스텀 추가
├── write/
│   ├── ChatEditor.tsx         ← 대화 모드
│   ├── WritingEditor.tsx      ← 일반 모드
│   ├── ChatMessage.tsx        ← 메시지 버블
│   ├── VoiceInput.tsx         ← Web Speech API
│   ├── ImageUpload.tsx        ← 사진 첨부
│   └── ModeToggle.tsx         ← 대화/일반 전환
├── book/
│   ├── BookCover.tsx          ← 표지
│   ├── TableOfContents.tsx    ← 목차
│   └── BookContent.tsx        ← 본문
├── layout/
│   ├── Header.tsx
│   ├── Sidebar.tsx            ← TOC Nav + Settings
│   └── ProgressBar.tsx        ← 진행률 바
└── ui/
    ├── Button.tsx
    ├── Input.tsx
    ├── Card.tsx
    └── ... (Shadcn/ui or custom)
```

#### 3. 상태 관리 설정
- **Context API 또는 Zustand**: 전역 상태 (book 정보, chapters, currentChapter 등)
- **localStorage 또는 서버 상태**: 데이터 영속성

#### 4. 스타일 마이그레이션
- mystory-app.jsx의 인라인 스타일 → TailwindCSS 클래스
- Noto Serif KR 폰트 적용 (이미 있음 - 확인)
- 웜 브라운 팔레트 (background, primary, accent)

#### 5. 이 단계의 주요 파일
```
생성: app/page.tsx, app/select/page.tsx, app/write/page.tsx, app/book/page.tsx
생성: components/ 폴더 내 20+ 컴포넌트
수정: app/layout.tsx (전역 스타일, 공급자)
참고: mystory-handoff/mystory-app.jsx (복사 X, 분석만)
```

---

## Phase 3b: 백엔드 모듈 통합 (Week 2)

### 목표
mystory-handoff/src/modules의 AI 엔진을 mystory 프로젝트에 통합하고 API 라우트 구현.

### 작업 내용

#### 1. 모듈 마이그레이션
```bash
# mystory-handoff/src/modules/ai → mystory/lib/ai
cp -r mystory-handoff/src/modules/ai mystory/lib/

# 결과 구조:
mystory/lib/ai/
├── interview/
│   ├── types.ts
│   ├── agent.ts
│   ├── flow-engine.ts
│   ├── context-analyzer.ts
│   ├── prompt-composer.ts
│   ├── story-assembler.ts
│   ├── index.ts
│   └── __tests__/ (테스트 파일)
└── question-pool/
    ├── types.ts
    ├── topic-cards.ts
    ├── childhood.ts
    ├── school.ts
    ├── life-stages.ts
    └── index.ts
```

#### 2. API 라우트 구현

##### a. POST /api/ai/chat
**현재**: 스켈레톤 (`app/api/ai/chat/route.ts`)

**해야 할 일**:
```typescript
import { BiographerAgent } from "@/lib/ai/interview/agent";
import { OpenAI } from "openai";

export async function POST(req: Request) {
  const { userMessage, context, chapterId } = await req.json();

  // 1. 에이전트 초기화
  const agent = new BiographerAgent({
    openai: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    model: process.env.OPENAI_MODEL || "gpt-4",
  });

  // 2. 다음 메시지 생성
  const response = await agent.nextMessage({
    userMessage,
    context,
    chapterId,
  });

  // 3. 대화 저장 (DB)
  // await saveConversation({ chapterId, role: "user", content: userMessage });
  // await saveConversation({ chapterId, role: "assistant", content: response.message });

  return Response.json(response);
}
```

##### b. POST /api/ai/transcribe
**현재**: 없음

**해야 할 일**:
```typescript
import { openai } from "@/lib/ai-client";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  const transcript = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "ko",
  });

  return Response.json({ text: transcript.text });
}
```

#### 3. React 훅 통합
- `useBiographer` (mystory-handoff 참고) → 컴포넌트 로직으로 통합
- `useVoiceRecorder` (mystory-handoff 참고) → VoiceInput 컴포넌트로 통합

#### 4. 타입 시스템
- `lib/ai/interview/types.ts` 사용 (이미 포함됨)
- 필요 시 확장

#### 5. 이 단계의 주요 파일
```
이관: mystory-handoff/src/modules/ai → mystory/lib/ai
수정: app/api/ai/chat/route.ts (스켈레톤 → 구현)
생성: app/api/ai/transcribe/route.ts
생성: lib/ai-client.ts (OpenAI 클라이언트 설정)
```

---

## Phase 3c: 데이터베이스 + 인증 (Week 3)

### 목표
Supabase 데이터베이스 스키마 적용 + NextAuth.js 인증 통합.

### 작업 내용

#### 1. Supabase 스키마 적용
- README.md의 "1단계: Supabase 설정" 참고
- `lib/supabase-schema.sql` → Supabase SQL Editor에 붙여넣기 + Run
- 테이블: users, books, chapters, conversations, images 등 생성

#### 2. Supabase 클라이언트 설정
- `lib/supabase.ts` (이미 있음 - 확인)
- 환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

#### 3. NextAuth.js 통합
```bash
npm install next-auth
```

구성:
- `lib/auth.ts` (인증 설정)
- `app/api/auth/[...nextauth]/route.ts` (API 라우트)
- `middleware.ts` (보호된 페이지 설정)

#### 4. 데이터 API 라우트
```
app/api/books/route.ts           ← GET: 사용자의 책 목록
app/api/books/[id]/route.ts      ← GET/POST/PUT: 개별 책
app/api/chapters/[id]/route.ts   ← POST: 챕터 업데이트
app/api/conversations/route.ts   ← POST: 대화 저장
```

#### 5. 이 단계의 주요 파일
```
생성: lib/auth.ts
생성: app/api/auth/[...nextauth]/route.ts
생성: app/api/books/route.ts 등 (CRUD API)
수정: middleware.ts (인증 필수 페이지)
환경: .env.local (Supabase + NextAuth 설정)
```

---

## Phase 4: 배포 + 최적화 (Week 4)

### 목표
Vercel + Supabase로 프로덕션 배포 및 성능 최적화.

### 작업 내용

#### 1. 코드 최적화
- 불필요한 번들 제거
- 컴포넌트 레이지 로딩
- 이미지 최적화

#### 2. 환경 설정
- GitHub에 코드 업로드
- Vercel 배포 (자동 배포 설정)
- 환경변수 설정

#### 3. 테스트
- 로컬 빌드: `npm run build`
- 프로덕션 프리뷰: `npm run build && npm run start`
- 배포 후 기능 테스트

#### 4. 배포 후 작업
- 도메인 설정 (선택)
- 모니터링 (Vercel Analytics)
- 버그 수정

---

## 파일 참고 관계

```
mystory (개발 작업)
  ├── 참고 1: mystory-handoff/mystory-app.jsx (UI 분해)
  ├── 참고 2: mystory-handoff/mystory-ux-review.md (설계 기준)
  ├── 참고 3: mystory-handoff/mystory-dev-issues.md (관리자 기능)
  └── 이관 1: mystory-handoff/src/modules/ai (백엔드 모듈)

mystory-handoff (개발 참고)
  ├── 유지: CLAUDE.md (기술 결정)
  ├── 유지: mystory-app.jsx (프로토타입)
  ├── 유지: *.md (설계 문서)
  └── 유지: src/ (모듈 소스)
```

---

## 체크리스트

### Phase 3a ✅
- [ ] Landing 페이지 컴포넌트 (제목/저자 입력)
- [ ] SelectPage 컴포넌트 (주제 선택)
- [ ] WritePage 컴포넌트 (대화/일반 모드)
- [ ] BookPage 컴포넌트 (표지+목차+본문)
- [ ] Sidebar 컴포넌트 (네비게이션)
- [ ] 전역 상태 관리 설정 (Context/Zustand)
- [ ] TailwindCSS 스타일링 완료
- [ ] 모바일 반응형 검증

### Phase 3b ✅
- [ ] 모듈 마이그레이션 (src/modules → lib/ai)
- [ ] POST /api/ai/chat 구현
- [ ] POST /api/ai/transcribe 구현
- [ ] OpenAI 클라이언트 설정
- [ ] 훅 로직 컴포넌트 통합

### Phase 3c ✅
- [ ] Supabase 스키마 생성
- [ ] NextAuth.js 설정
- [ ] CRUD API 라우트 구현
- [ ] 인증 보호 설정

### Phase 4 ✅
- [ ] 로컬 빌드 성공
- [ ] GitHub 업로드
- [ ] Vercel 배포
- [ ] 기능 테스트
- [ ] 프로덕션 런칭

---

**작성일**: 2026-03-11
**상태**: Phase 3 시작 전 계획 문서

## 다음 세션
1. `npm install` 확인
2. Phase 3a 시작: Landing 페이지 컴포넌트 분해
3. mystory-app.jsx 분석 및 참고 자료 정리
