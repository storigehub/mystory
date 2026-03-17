# 나의이야기 (My Story) — Claude Code 인계 문서

> **최종 업데이트**: 2026-03-17 (Phase 7 완료)
> **작성 환경**: Claude Code (CLI) — claude-sonnet-4-6
> ⚠️ 모든 개발은 Claude Code에서 `/mystory` 폴더를 직접 편집한다.

---

## 🗂 폴더 구조 (2개 디렉토리)

| 폴더 | 용도 |
|------|------|
| `/Users/yohan/Documents/claude/mystory` | **실제 배포 앱** — Next.js 14, 모든 개발 여기서 진행 |
| `/Users/yohan/Documents/claude/mystory-handoff` | **참조용** — 초기 프로토타입(mystory-app.jsx) + 설계 문서만 있음. 코드 편집 불필요 |

**개발 작업은 항상 `/Users/yohan/Documents/claude/mystory` 에서 한다.**

---

## 🚀 배포 정보

| 항목 | 값 |
|------|-----|
| 프로덕션 URL | https://mystory-khaki.vercel.app |
| GitHub | https://github.com/storigehub/mystory (main 브랜치 push → Vercel 자동 배포) |
| Supabase | https://newfsanyqkcxmtfqacfe.supabase.co |
| Vercel 프로젝트 | yohans-projects-de3234df/mystory |

> **배포 주의**: `git push origin main` 후 Vercel 자동배포가 지연되는 경우 `vercel --prod` 로 강제 배포.

---

## 📁 실제 앱 파일 구조 (`/mystory`)

```
app/
├── page.tsx                    ← 랜딩 (책 제목/저자 입력, 이어쓰기)
├── select/page.tsx             ← 주제 선택 (72개 카드, 10개 카테고리)
├── toc/page.tsx                ← 목차 편집 (순서 변경/삭제)
├── write/page.tsx              ← 글쓰기 (ChatEditor + NormalEditor + Sidebar)
│                                  ※ 마운트 시 /api/settings fetch → sttMode 적용
│                                  ※ Supabase Realtime 인터뷰어 메시지 구독
├── book/page.tsx               ← 책 미리보기 (읽기/FlipBook + 공유/PDF/이메일초대)
├── my/page.tsx                 ← 마이페이지 (책 보관함, 공유 상태 배지)
├── login/page.tsx              ← 로그인 (이메일/Google/Kakao + 비회원)
├── shared/[id]/page.tsx        ← 공개 책 읽기 (인증 불필요, 토큰 지원)
├── interviewer/[id]/page.tsx   ← 인터뷰어 전용 페이지 (질문 추가)
├── admin/page.tsx              ← 관리자 메인 대시보드 (통계 + 책 목록) ← Phase 7 신규
├── admin/settings/page.tsx     ← 관리자 STT·UI 설정
└── api/
    ├── ai/
    │   ├── chat/route.ts               ← GPT-4o-mini 인터뷰어 (론 서로게이트 sanitize)
    │   ├── assemble/route.ts           ← 대화→산문 자동 변환
    │   └── whisper/transcribe/route.ts ← Whisper STT 프록시 (OpenAI)
    ├── auth/[...nextauth]/route.ts     ← NextAuth.js
    ├── books/route.ts                  ← GET 목록 / POST 생성
    ├── books/[id]/route.ts             ← GET/PUT(is_public 지원)/DELETE
    ├── books/[id]/sync/route.ts        ← 전체 상태 동기화 (interviewer 타입 보존)
    ├── books/[id]/share/route.ts       ← POST 가족토큰 생성 / DELETE 해제
    ├── books/[id]/invite/route.ts      ← POST 이메일 초대 (Resend) ← Phase 7 신규
    ├── shared/[id]/route.ts            ← 공개 조회 (is_public OR ?token= 일치)
    ├── interviewer/[id]/route.ts       ← 인터뷰어 질문 추가 (토큰 인증)
    ├── upload/photo/route.ts           ← Cloudinary 사진 업로드
    ├── profile/route.ts                ← 닉네임 GET/PUT
    ├── settings/route.ts               ← 서비스 설정 공개 조회 (sttMode 등)
    ├── admin/settings/route.ts         ← 관리자 설정 CRUD (비밀번호 인증)
    └── admin/stats/route.ts            ← 서비스 통계 API ← Phase 7 신규

components/
├── write/
│   ├── ChatEditor.tsx    ← AI 대화 인터뷰 (인터뷰어 메시지 보라색, maxDurationSec)
│   └── NormalEditor.tsx  ← 자유 글쓰기 (Cloudinary 업로드, maxDurationSec)
└── book/
    ├── FlipBook.tsx      ← react-pageflip 페이지 넘기기
    └── PrintBook.tsx     ← PDF 인쇄 전용 레이아웃

lib/
├── book-context.tsx        ← Context API 상태 관리 (Message.source 필드)
├── use-whisper-stt.ts      ← Whisper STT 훅 (maxDurationSec 자동중지) ← Phase 7 수정
├── supabase.ts             ← Supabase 클라이언트 (createBrowserClient/createServerClient)
├── auth-helpers.ts         ← NextAuth 세션 헬퍼
├── design-tokens.ts        ← 디자인 토큰
└── interview-questions.ts  ← 질문 풀

config/
└── settings.json           ← STT·UI 서비스 설정 파일 (관리자 페이지에서 수정)
```

---

## ✅ 전체 완료 기능

### Phase 1~3 (Claude.ai 코드탭에서 개발)
- 랜딩, 주제 선택(72개), 목차 편집
- 대화/일반 모드 전환 + Web Speech API 음성인식
- Next.js App Router 마이그레이션
- Supabase CRUD + 2초 디바운스 자동 동기화
- NextAuth.js (이메일/Google/Kakao OAuth)
- 로그인 페이지 + 비회원 모드

### Phase 4~5 (Claude.ai 코드탭에서 개발)
- Vercel 배포 완료 (2026-03-11)
- Google/Kakao OAuth 설정 완료
- 마이페이지(/my) — 책 보관함 카탈로그
- 책 읽기(/book) — Brunch 스타일 스크롤 리더
- FlipBook 페이지 넘기기 애니메이션
- 관리자 PDF 출판 (판형 선택 A4/A5/B5/B6)
- 대표사진(isFeatured) — 챕터 배경 히어로 이미지
- coverTemplateId + isFeatured Supabase 영구 저장

### Phase 6 (Claude Code — 2026-03-17)
- [x] **이모지 론 서로게이트 버그 수정** — chat/route.ts sanitize 함수
- [x] **챕터 읽기 네비게이션** — IntersectionObserver, 이전/다음 버튼, 플로팅 TOC
- [x] **Cloudinary 이전** — 사진 base64→Cloudinary URL
- [x] **책 공유 URL** — is_public 토글, /shared/[id] 공개 읽기 페이지
- [x] **가족 공유 링크** — share_token UUID, 토큰 기반 비공개 공유
- [x] **PDF 내보내기 개선** — A5 고정, 인라인 사진, 페이지번호
- [x] **인터뷰어 모드** — /interviewer/[id], 챕터별 질문 추가, 보라색 UI 구분

### Phase 7 (Claude Code — 2026-03-17)
- [x] **Whisper STT 연동 완성**
  - `use-whisper-stt.ts`: `maxDurationSec` 파라미터 + setTimeout 자동 중지 타이머
  - `write/page.tsx`: 마운트 시 `/api/settings` fetch → `setSTTMode()` 적용
  - `ChatEditor`, `NormalEditor`: `maxDurationSec` prop 전달
- [x] **인터뷰어 Realtime 실시간화**
  - `write/page.tsx`: Supabase Realtime 구독 (`messages` 테이블, `type=eq.interviewer`)
  - 새 질문 도착 시 즉시 `addMessage()` 호출 → 저자 화면에 실시간 반영
  - 현재 챕터가 아닌 곳에 질문 오면 보라색 토스트 알림 5초 표시
  - Supabase `messages` 테이블 Realtime 활성화 + RLS SELECT 정책 추가 완료
- [x] **관리자 대시보드 완성**
  - `/admin/page.tsx`: 메인 대시보드 (통계 카드 4개 + 전체 책 목록 테이블 + 검색)
  - `/api/admin/stats/route.ts`: 서비스 통계 API (총 책/공개 책/이번 주 신규/사용자 수)
  - `ADMIN_PASSWORD=strg1128!@` — Vercel 환경변수 설정 완료
- [x] **가족 이메일 초대**
  - `/api/books/[id]/invite/route.ts`: Resend로 HTML 초대 이메일 발송
  - `/book/page.tsx`: "✉ 초대" 버튼 + 모달 (열람/인터뷰어 유형 선택, 이메일 입력)
  - `resend` 패키지 설치 완료 (v6.9.4)
  - ⚠️ **`RESEND_API_KEY` 미설정** — 아래 설정 필요 항목 참고

---

## ⚠️ 설정 필요 항목 (개발 재개 전 확인)

### 1. Resend 이메일 서비스 설정 (미완료)
이메일 초대 기능은 코드 완성, API 키만 없는 상태.

**설정 순서:**
1. [resend.com](https://resend.com) 가입 (무료: 월 3,000건)
2. API Keys 메뉴 → `+ Create API Key` → 키 복사
3. Vercel에 환경변수 추가:
   ```bash
   printf 'your_resend_api_key' | vercel env add RESEND_API_KEY production
   vercel --prod
   ```
4. `.env.local`에도 추가: `RESEND_API_KEY=re_xxxx...`

**발신자 주소 관련:**
- 현재: `onboarding@resend.dev` (Resend 기본 주소, 테스트용)
- 추후: 자체 도메인 인증 필요 → `RESEND_FROM_EMAIL` 환경변수로 변경
  - Resend 대시보드 → Domains → 도메인 추가 및 DNS 인증
  - 예: `noreply@mystory.co.kr`

### 2. Supabase SQL 마이그레이션 (Phase 6, 이미 실행했다면 무시)
```sql
ALTER TABLE books ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
ALTER TABLE books ADD COLUMN IF NOT EXISTS share_token uuid;
```

### 3. Supabase Realtime 설정 (Phase 7, 이미 완료)
- `messages` 테이블 Realtime: ✅ 활성화됨
- RLS SELECT 정책: ✅ 추가됨 (`Allow read messages` — USING true)

---

## 🔧 환경변수

### 로컬 (`.env.local` — `/mystory/.env.local`)
```
OPENAI_API_KEY=sk-proj-MP-r_...
OPENAI_MODEL=gpt-4o-mini
NEXT_PUBLIC_SUPABASE_URL=https://newfsanyqkcxmtfqacfe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXTAUTH_SECRET=mystory-dev-secret-2024
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=408488608243-...
GOOGLE_CLIENT_SECRET=GOCSPX-...
KAKAO_CLIENT_ID=7944c11c...
KAKAO_CLIENT_SECRET=Yp0gR51k...
CLOUDINARY_CLOUD_NAME=dgvrgxq72
CLOUDINARY_API_KEY=156597567526248
CLOUDINARY_API_SECRET=iXVRvhSgSjv3mM0T6nnz5VfXgRw
CLOUDINARY_URL=cloudinary://156597567526248:iXVRvhSgSjv3mM0T6nnz5VfXgRw@dgvrgxq72
ADMIN_PASSWORD=strg1128!@
RESEND_API_KEY=          ← 미설정, 위 설정 순서 참고
RESEND_FROM_EMAIL=       ← 미설정, 도메인 인증 후 추가 (없으면 onboarding@resend.dev 사용)
```

### Vercel (production) — 설정 완료 항목
- 위 모든 항목 + `NEXTAUTH_URL=https://mystory-khaki.vercel.app`
- `ADMIN_PASSWORD=strg1128!@` ✅ 설정 완료
- `RESEND_API_KEY` ⚠️ 미설정

---

## 🗃 데이터베이스 스키마

```sql
books (
  id uuid PK,
  user_id uuid FK → users,
  title text,
  author text,
  cover_template text DEFAULT 'classic',
  is_public boolean DEFAULT false,   ← Phase 6 추가
  share_token uuid,                  ← Phase 6 추가
  created_at, updated_at
)

chapters (
  id uuid PK,
  book_id uuid FK → books CASCADE,
  topic_id text, title text,
  sort_order int, is_custom bool,
  mode text DEFAULT 'chat',
  prose text, is_done bool
)

messages (
  id uuid PK,
  chapter_id uuid FK → chapters CASCADE,
  type text,   -- 'user' | 'ai' | 'photo' | 'interviewer'
  text text, sort_order int
)
-- ※ Realtime 활성화됨 / RLS SELECT 정책 추가됨 (Phase 7)

photos (
  id uuid PK,
  chapter_id uuid FK → chapters CASCADE,
  url text,    -- Cloudinary URL
  caption text, sort_order int,
  is_featured bool DEFAULT false
)
```

---

## 🔑 핵심 로직 / 주의사항

### 이모지 & JSON 오류
- `app/api/ai/chat/route.ts` — `sanitize()` 함수로 론 서로게이트 제거
- Claude.ai 대화창 컨텍스트 누적 오류 → **새 대화 시작**으로 해결

### Whisper STT 흐름 (Phase 7 완성)
```
관리자 /admin/settings → STT 모드 'whisper' 설정 → config/settings.json 저장
  → write/page.tsx 마운트 시 GET /api/settings → setSTTMode('whisper')
  → ChatEditor/NormalEditor: useWhisperSTT(enabled=true, onTranscribed, maxDurationSec)
  → 마이크 버튼 클릭 → MediaRecorder 녹음 시작
  → maxDurationSec 초과 시 자동 중지
  → onstop → POST /api/ai/whisper/transcribe (FormData)
  → OpenAI Whisper API → 텍스트 반환 → 입력창 자동 채움
```

### 인터뷰어 Realtime 흐름 (Phase 7 추가)
```
인터뷰어가 /interviewer/[id]?token=xxx 에서 질문 전송
  → POST /api/interviewer/[bookId] → Supabase messages에 type='interviewer' INSERT
  → Supabase Realtime → write/page.tsx 구독 채널로 이벤트 수신
  → chapter.dbId === msg.chapter_id 매칭 → addMessage(chapterIdx, {source:'interviewer'})
  → ChatEditor에 보라색 메시지 즉시 표시
  → 다른 챕터이면 보라색 토스트 알림 (5초 후 자동 소멸)
```

### 이메일 초대 흐름 (Phase 7 추가)
```
book/page.tsx → "✉ 초대" 버튼 (가족 링크 생성 후에만 표시)
  → 모달: 유형(열람/인터뷰어) 선택 + 이메일 입력
  → POST /api/books/[id]/invite { email, type, token }
  → Resend → HTML 이메일 발송
     - 열람: /shared/[bookId]?token=xxx
     - 인터뷰어: /interviewer/[bookId]?token=xxx
```

### 공유 URL 체계
| URL | 접근 조건 |
|-----|----------|
| `/shared/[bookId]` | `is_public = true` |
| `/shared/[bookId]?token=xxx` | `share_token` 일치 (비공개 가족 열람) |
| `/interviewer/[bookId]?token=xxx` | `share_token` 일치 (질문 추가 권한) |

### 인터뷰어 메시지 DB↔프론트 변환
```typescript
// DB → 프론트 (restoreFromDb)
type='interviewer' → { type: 'assistant', source: 'interviewer' }
type='ai'          → { type: 'assistant', source: 'ai' }

// 프론트 → DB (sync/route.ts)
source==='interviewer' → type: 'interviewer'
source==='ai'          → type: 'ai'
```

### 관리자 대시보드 구조
| 경로 | 기능 | 인증 |
|------|------|------|
| `/admin` | 통계 카드 + 전체 책 목록 + 검색 | ADMIN_PASSWORD |
| `/admin/settings` | STT 모드·API키·UI 설정 | ADMIN_PASSWORD |
| `/api/admin/stats` | 서비스 통계 JSON | x-admin-password 헤더 |
| `/api/admin/settings` | 설정 GET/POST | x-admin-password 헤더 |

### 한글 IME 처리
모든 텍스트 입력창에 `composingRef` + `onCompositionStart/End` 패턴 필수.
Enter 전송 로직: `if (e.key === 'Enter' && !e.shiftKey && !composingRef.current)`

### Message.source 필드
```typescript
// lib/book-context.tsx
interface Message {
  type: 'user' | 'assistant' | 'photo';
  source?: 'ai' | 'interviewer';
}
```

---

## 🚧 다음 작업 목록 (우선순위 순)

### 즉시 필요
- [ ] **Resend API 키 설정** — resend.com 가입 후 `RESEND_API_KEY` Vercel에 추가 (위 설정 항목 참고)

### 단기 — UI/UX 개선 (온보딩 튜토리얼 전에 선행)
- [ ] **랜딩 페이지 리디자인** — 서비스 가치 전달, 시작 유도 UX 개선
- [ ] **책 보관함(/my) UI/UX 개선** — 카드 디자인, 정렬/필터, 빈 상태 안내
- [ ] **온보딩 튜토리얼** — 랜딩/보관함 개선 후 진행 (첫 방문자 가이드)

### 단기 — 기능
- [ ] **Resend 발신자 도메인 인증** — `noreply@[커스텀도메인]` 설정 (Resend 대시보드 → Domains)
- [ ] **인터뷰어 모드 역할 분리** — 소유자/읽기전용/인터뷰어 권한 체계 고도화
- [ ] **OpenAI quota 충전** — 현재 소진, 로컬 질문 풀 폴백 중

### 중기
- [ ] **사진 Cloudinary 마이그레이션 완성** — 기존 base64 저장 이전 사진 일괄 변환
- [ ] **Whisper STT 검증** — 실제 음성 인식 end-to-end 테스트 (RESEND 설정 완료 후 진행)
- [ ] **인터뷰어 답변 Realtime** — 현재는 인터뷰어→저자 단방향. 저자 답변도 Realtime 반영

### 장기
- [ ] **POD 인쇄 연동** — 외부 출판사 API 연동
- [ ] **가족 초대 이메일 다중 발송** — 현재 1건씩 → 여러 명 동시 발송 UI
- [ ] **Supabase Auth 마이그레이션** — 현재 NextAuth → Supabase Auth 통합 검토

---

## 🛠 개발 환경 실행

```bash
cd /Users/yohan/Documents/claude/mystory
npm run dev   # localhost:3000
```

```bash
# 배포
git add .
git commit -m "..."
git push origin main
# → Vercel 자동 배포 (지연 시 vercel --prod 강제 실행)
```

---

## ⚙️ 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) + TypeScript |
| 상태 관리 | Context API + localStorage + Supabase 2초 디바운스 동기화 |
| AI | OpenAI GPT-4o-mini + 로컬 질문 풀 폴백 |
| 인증 | NextAuth.js v4 (이메일/Google/Kakao) |
| DB | Supabase (PostgreSQL + Realtime) |
| 사진 저장 | Cloudinary |
| 이메일 | Resend (v6.9.4) — API 키 미설정 상태 |
| 배포 | Vercel |
| 음성 | Web Speech API (browser) + OpenAI Whisper STT |
| PDF | 브라우저 window.print() + CSS @media print |

---

## 📌 개발 원칙

- **코드탭 사용 금지** — Claude.ai 대화창 컨텍스트 누적 시 론 서로게이트 JSON 오류 발생
- **mystory-app.jsx** — 참조용 레거시, 실제 앱과 다름
- 모든 개발은 Claude Code (CLI)에서 `/mystory` 폴더를 직접 편집
- Vercel 환경변수 변경 후 반드시 재배포 (`vercel --prod`)

---

## 📚 참고 문서

| 파일 | 내용 |
|------|------|
| `docs/mystory-progress-report.md` | Phase별 전체 진행 현황 |
| `docs/mystory-ux-review.md` | UX 점검 + 상세 계획 |
| `docs/mystory-dev-issues.md` | 관리자 STT 설정 API 상세 설계 |
| `config/settings.json` | STT·UI 서비스 설정 (관리자 페이지에서 수정) |
