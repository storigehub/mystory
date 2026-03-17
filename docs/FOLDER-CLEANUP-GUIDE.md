# 🗂️ 폴더 정리 가이드 (2026-03-11)

## 현재 상황
- **mystory** (배포용): Next.js 14 프로젝트, Supabase + Vercel 배포 준비
- **mystory-handoff** (개발용): Claude Code 진행 중, 완성된 모듈 + 프로토타입 + 문서

## 역할 정의

### ✅ mystory (= 프로덕션 코드)
**목표**: Supabase + Vercel로 배포 가능한 완전한 Next.js 프로젝트

**현재 상태**:
- Next.js 14 구조 완성 (app/, components/, lib/)
- 기본 AI API 틀만 있음 (`app/api/ai/chat/route.ts` — 스켈레톤)
- Supabase 설정 가이드 완성 (README.md)
- TailwindCSS 기본 설정

**해야 할 일**:
1. **프로토타입 통합** → `mystory-app.jsx`의 UI를 컴포넌트로 분해
2. **백엔드 모듈 이관** → `mystory-handoff/src/modules` → `mystory/lib/ai/`
3. **API 실구현** → 스켈레톤 → 실제 로직 연결
4. **DB 스키마 적용** → `lib/supabase-schema.sql` → Supabase에 적용

**파일 구조 (Phase 3 완료 후 예상)**:
```
mystory/
├── app/
│   ├── page.tsx (Landing)
│   ├── select/page.tsx (Topic Selection)
│   ├── write/page.tsx (Writing/Chat)
│   ├── book/page.tsx (Book Preview)
│   └── api/ai/
│       ├── chat/route.ts (OpenAI + story-assembler)
│       └── transcribe/route.ts (Whisper)
├── components/
│   ├── layout/ (Header, Sidebar)
│   ├── editor/ (ChatEditor, WritingEditor)
│   ├── chat/ (ChatMessage, ChatInput)
│   └── ui/ (shared)
├── lib/
│   ├── ai/ (← src/modules/ai 이관)
│   ├── db.ts (Supabase 클라이언트)
│   └── constants.ts
└── package.json (필요한 의존성만 포함)
```

---

### 📚 mystory-handoff (= 개발 참고 문서 보관소)
**목표**: Phase 3 이후 개발 과정에서 참고할 수 있는 설계 문서 + 모듈 소스

**현재 상태**:
- 프로토타입: `mystory-app.jsx` (427줄, React 단일 파일)
- 완성 모듈: 6개 (agent, flow-engine, context-analyzer, prompt-composer, story-assembler, question-pool)
- 테스트: 60+ 단위 테스트
- 문서: 4개 (CLAUDE.md, 진행 리포트, UX 리뷰, 개발 이슈)

**역할**:
- Phase 3 개발 시 **참고 자료** (UI 레이아웃, 로직, 질문 풀 등)
- 모듈 마이그레이션 **소스**
- 설계 및 기술 검토 **기록**

**정리 계획**:
1. `mystory-app.jsx` → 컴포넌트 분해 시 참고 (읽기만)
2. `src/modules` → 필요 부분 복사해서 `mystory/lib/ai`에 통합
3. 문서들 → 각 Phase별 체크리스트로 활용
4. 레거시 파일(`prototype.html`, `tests.js`) → 삭제 가능

---

## Phase 3 작업 흐름

### Step 1: mystory 폴더로 작업 환경 이동
```bash
# mystory 폴더에서 package.json 확인
cd /Users/yohan/Documents/claude/mystory
npm install  # or yarn install (필요 시)
npm run dev  # 로컬 개발 서버 시작
```

### Step 2: mystory-app.jsx 분석 → 페이지 컴포넌트 분해
**mystory-handoff에서 읽기**:
- `mystory-handoff/mystory-app.jsx` 분석
- 상태 구조 파악 (state, chapters, currentChapterIdx 등)

**mystory에서 작성**:
```
app/page.tsx              ← Landing (제목/저자 입력)
app/select/page.tsx       ← Topic Selection (72개 카드)
app/write/page.tsx        ← Writing Page (대화/일반 모드)
app/book/page.tsx         ← Book Preview (표지+목차+본문)
```

### Step 3: 백엔드 모듈 마이그레이션
**소스**: `mystory-handoff/src/modules/ai/`

**대상**: `mystory/lib/ai/` 또는 npm 패키지화

**포함**:
- interview/ (agent, flow-engine, context-analyzer, prompt-composer, story-assembler)
- question-pool/
- 타입 시스템

### Step 4: API 라우트 실구현
**현재 상태**:
- `mystory/app/api/ai/chat/route.ts` (스켈레톤)

**해야 할 일**:
- OpenAI Chat Completion 로직 추가
- story-assembler 연동
- Whisper STT 프록시 추가

### Step 5: 사용자 인증 통합
- NextAuth.js 설정
- Supabase Auth 연동
- 사용자별 데이터 저장

---

## 파일 이관 체크리스트

### 모듈 복사 (mystory-handoff → mystory)
- [ ] `src/modules/ai/interview/` → `lib/ai/interview/`
- [ ] `src/modules/ai/question-pool/` → `lib/ai/question-pool/`
- [ ] `src/hooks/useBiographer.ts` → 페이지 컴포넌트 로직으로 통합
- [ ] `src/hooks/useVoiceRecorder.ts` → 오디오 입력 컴포넌트로 통합

### 프로토타입 참고 (mystory-handoff 읽기만)
- [ ] `mystory-app.jsx` 레이아웃 구조 분석
- [ ] 상태 관리 패턴 학습
- [ ] UI/UX 디자인 참고

### 문서 활용
- [ ] `CLAUDE.md` → Phase 3 체크리스트로 사용
- [ ] `mystory-progress-report.md` → 진행 상황 추적
- [ ] `mystory-ux-review.md` → UI/UX 기준 확인
- [ ] `mystory-dev-issues.md` → 관리자 대시보드 설계 참고

---

## 정리 후 폴더 상태

### mystory-handoff 정리 (선택)
**유지할 파일**:
- `CLAUDE.md`
- `mystory-app.jsx`
- `src/` (참고용 보관)
- `*.md` (4개 문서)

**삭제 가능**:
- `prototype.html` (레거시 HTML 프로토타입)
- `tests.js` (초기 테스트, 불필요)

### mystory 폴더 정리
**불필요한 파일 제거**:
- `mystory-dev-issues.md` (중복, mystory-handoff 참고)

**추가할 파일**:
- `.env.local` (개발 환경변수)
- `lib/supabase-schema.sql` 적용 후 기록

---

## 개발 진행 명령어

```bash
# mystory 폴더에서
cd /Users/yohan/Documents/claude/mystory

# 개발 서버 시작
npm run dev

# 빌드 테스트
npm run build

# 타입 체크
npx tsc --noEmit

# 린트 (필요 시)
npm run lint
```

---

## 다음 세션 체크리스트
- [ ] mystory 폴더 구조 확인 및 npm install
- [ ] mystory-handoff 문서 읽기 (CLAUDE.md, mystory-ux-review.md)
- [ ] Step 1-2: 페이지 컴포넌트 분해 (Landing, SelectPage, WritePage, BookPage)
- [ ] Step 3: 백엔드 모듈 마이그레이션
- [ ] Step 4: API 라우트 구현
- [ ] Step 5: 사용자 인증 통합

---

**작성일**: 2026-03-11
**상태**: Phase 2 완료, Phase 3 준비 중
