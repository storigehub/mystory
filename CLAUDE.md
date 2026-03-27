# 나의이야기 (My Story) — Claude Code 인계 문서

> **최종 업데이트**: 2026-03-27 (Phase 10 완료)
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
├── page.tsx                    ← 랜딩 (책 제목/저자 입력, 이어쓰기, 온보딩 모달)
│                                  ※ Phase 8: HOW IT WORKS 아웃라인 원/워터마크/영문 라벨 리디자인
├── select/page.tsx             ← 주제 선택 (72개 카드, 10개 카테고리)
├── toc/page.tsx                ← 목차 편집 (순서 변경/삭제)
├── write/page.tsx              ← 글쓰기 (ChatEditor + NormalEditor + Sidebar)
│                                  ※ 마운트 시 /api/settings fetch → sttMode 적용
│                                  ※ Supabase Realtime 인터뷰어 메시지 구독
├── book/page.tsx               ← 책 미리보기 (읽기/FlipBook + 공유/PDF/이메일초대)
│                                  ※ Phase 8: 열람 링크 / 인터뷰어 링크 버튼 분리
├── my/page.tsx                 ← 마이페이지 (책 보관함)
│                                  ※ Phase 8: 에디토리얼 헤더, 정렬 탭, 진행률 바, 빈 상태
├── login/page.tsx              ← 로그인 (이메일/Google/Kakao + 비회원)
├── shared/[id]/page.tsx        ← 공개 책 읽기 (인증 불필요, 토큰 지원)
├── interviewer/[id]/page.tsx   ← 인터뷰어 전용 페이지 (질문 추가)
│                                  ※ Phase 8: Supabase Realtime 추가 (저자 답변 실시간 표시)
├── admin/page.tsx              ← 관리자 메인 대시보드 (통계 + 책 목록 + 마이그레이션 + 랜딩 관리 링크)
│                                  ※ Phase 8: base64 사진 마이그레이션 카드 추가
├── admin/settings/page.tsx     ← 관리자 STT·UI 설정
├── admin/landing/page.tsx      ← 관리자 랜딩 CMS (히어로/WHY/FOR WHOM 이미지·문구 편집) ← Phase 9 신규
└── api/
    ├── ai/
    │   ├── chat/route.ts               ← GPT-4o-mini 인터뷰어 (론 서로게이트 sanitize)
    │   ├── assemble/route.ts           ← 대화→산문 자동 변환
    │   └── whisper/transcribe/route.ts ← Whisper STT 프록시 (OpenAI)
    ├── auth/[...nextauth]/route.ts     ← NextAuth.js
    ├── books/route.ts                  ← GET 목록 / POST 생성
    ├── books/[id]/route.ts             ← GET/PUT(is_public 지원)/DELETE
    ├── books/[id]/sync/route.ts        ← 전체 상태 동기화 (interviewer 타입 보존)
    ├── books/[id]/share/route.ts       ← POST/DELETE (type: reader|interviewer 분리) ← Phase 8 수정
    ├── books/[id]/invite/route.ts      ← POST 이메일 초대 (Resend, 서버에서 토큰 조회) ← Phase 8 수정
    ├── shared/[id]/route.ts            ← 공개 조회 (is_public OR share_token OR interviewer_token)
    ├── interviewer/[id]/route.ts       ← 인터뷰어 질문 추가 (interviewer_token 우선 검증) ← Phase 8 수정
    ├── upload/photo/route.ts           ← Cloudinary 사진 업로드
    ├── profile/route.ts                ← 닉네임 GET/PUT
    ├── settings/route.ts               ← 서비스 설정 공개 조회 (sttMode 등)
    ├── admin/settings/route.ts         ← 관리자 설정 CRUD (비밀번호 인증)
    ├── admin/stats/route.ts            ← 서비스 통계 API
    ├── admin/migrate-photos/route.ts   ← base64 사진 → Cloudinary 일괄 마이그레이션 ← Phase 8 신규
    └── admin/landing/route.ts          ← 랜딩 CMS GET/POST + revalidatePath('/') ← Phase 9 신규

components/
├── write/
│   ├── ChatEditor.tsx    ← AI 대화 인터뷰 (인터뷰어 메시지 보라색, maxDurationSec)
│   └── NormalEditor.tsx  ← 자유 글쓰기 (Cloudinary 업로드, compressImage, maxDurationSec)
├── book/
│   ├── FlipBook.tsx      ← react-pageflip 페이지 넘기기
│   ├── PrintBook.tsx     ← PDF 인쇄 전용 레이아웃
│   └── CoverEditor.tsx   ← 책 표지 편집 (6종 템플릿 + 사진 커버, compressImage)
├── LandingClient.tsx     ← 랜딩 페이지 클라이언트 컴포넌트 (Server→Client props) ← Phase 9 신규
└── OnboardingModal.tsx   ← 첫 방문자 환영 모달 (localStorage 기반) ← Phase 8 신규

lib/
├── book-context.tsx        ← Context API 상태 관리 (Message.source 필드)
├── use-whisper-stt.ts      ← Whisper STT 훅 (maxDurationSec 자동중지)
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
- [x] **인터뷰어 Realtime 실시간화 (저자 화면)**
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

### Phase 9 (Claude Code — 2026-03-19~21)
- [x] **사진 업로드 500 에러 수정**
  - `lib/compress-image.ts` 신규 생성 — Canvas 기반 클라이언트 압축 (목표 ≤3MB, 최대 1920px)
  - Vercel Serverless Function 4.5MB 요청 한도 대응
  - `NormalEditor`, `CoverEditor` 양쪽 적용
- [x] **랜딩 페이지 이미지 전면 교체**
  - 히어로 + WHY 3개 + FOR WHOM 4→5개 카드 전체를 Pexels CDN 한국인/아시아인 사진으로 교체
  - Unsplash → Pexels 이전 (국내 네트워크 안정성)
- [x] **FOR WHOM 5-카드 비대칭 그리드**
  - 4카드 → 5카드 확장, 대형 좌측 카드(2행 span) + 우측 2×2 배치
  - `gridTemplateColumns: '1.1fr 1fr'`, `gridTemplateRows: '224px 224px 176px'`
  - 모바일: 단일 컬럼 전환, `grid-column/row: auto` 리셋
- [x] **관리자 랜딩 CMS**
  - `app/admin/landing/page.tsx`: 히어로/WHY/FOR WHOM 이미지·문구 편집 UI
  - `app/api/admin/landing/route.ts`: Supabase `site_config` 저장 + ISR 온디맨드 재검증
  - Supabase `site_config` 테이블 신규 생성 (MCP 마이그레이션)
- [x] **랜딩 ISR + 온디맨드 재검증 (깜빡임 제거)**
  - `app/page.tsx` → Server Component (`export const revalidate = 3600`)
  - 서버에서 Supabase config 조회 후 `<LandingClient config={config} />` props 전달
  - 관리자 저장 시 `revalidatePath('/')` → CDN 즉시 무효화 → 클라이언트 fetch 없음
- [x] **스크롤 애니메이션 다이나믹 강화**
  - `.reveal-left`, `.reveal-right`, `.reveal-blur` 방향별 진입 클래스 추가
  - `will-change: transform, opacity` + `backface-visibility: hidden` GPU 가속
  - delay 3단계 → 5단계, 이징 0.75s → 0.95s
  - 랜딩 섹션별 reveal 클래스 교차 배치 (좌우/블러 교번)

### Phase 8 (Claude Code — 2026-03-19)
- [x] **랜딩 페이지 리디자인**
  - HOW IT WORKS 섹션: 이모지 제거 → 아웃라인 원 + 워터마크 숫자(opacity 0.045) + 영문 라벨(CHOOSE/TALK/FINISH)
  - FOR WHOM 섹션 배경: `TOKENS.warm` → `#FFF` (교번 배경 수정)
- [x] **책 보관함(/my) UI/UX 개선**
  - 에디토리얼 헤더 (로고 좌측, 로그아웃 pill 우측)
  - 정렬 탭: 최신순/오래된순/제목순
  - 책 카드: 이어쓰기 + 읽기 버튼 분리, 챕터 진행률 바 (완료/전체)
  - 빈 상태: CSS 책 아이콘 + 따뜻한 안내문 + 시작 CTA
- [x] **온보딩 튜토리얼**
  - `components/OnboardingModal.tsx` 신규 생성
  - localStorage `mystory_visited` 기반, 첫 방문에만 표시
  - 책 모양 아이콘 + 3단계 가이드 + "시작하기" CTA
  - `dynamic(() => import(...), { ssr: false })` 로드 (hydration 방지)
- [x] **인터뷰어 답변 Realtime (인터뷰어 화면)**
  - `app/interviewer/[id]/page.tsx`: Supabase Realtime 구독 추가
  - 저자가 user/ai 답변 시 인터뷰어 화면에 즉시 반영
  - 인터뷰어 본인 메시지(type=interviewer) 중복 방지
  - 헤더 "실시간 연결 중" 표시
- [x] **base64 사진 → Cloudinary 일괄 마이그레이션**
  - `GET /api/admin/migrate-photos`: 미처리 base64 사진 수 확인
  - `POST /api/admin/migrate-photos`: base64 사진 일괄 업로드 후 DB URL 갱신
  - 관리자 대시보드에 마이그레이션 카드 + 버튼 (로그인 시 대기 수 자동 표시)
- [x] **인터뷰어 모드 역할 분리**
  - `books` 테이블에 `interviewer_token uuid` 컬럼 추가 (Supabase MCP 마이그레이션)
  - `share_token` → 열람 전용 / `interviewer_token` → 질문 추가 권한
  - `/api/books/[id]/share`: `{ type: 'reader' | 'interviewer' }` 파라미터로 토큰 분리 생성/해제
  - `/api/interviewer/[id]`: `interviewer_token` 우선 검증, `share_token` 하위 호환
  - `/api/shared/[id]`: `interviewer_token`으로도 열람 허용 (인터뷰어 페이지 책 로드)
  - `/api/books/[id]/invite`: 서버에서 타입별 토큰 자동 조회 (클라이언트 토큰 전달 불필요)
  - `/book/page.tsx`: 열람 링크 / 인터뷰어 링크 버튼 각각 독립 생성·복사·해제

### Phase 10 (Claude Code — 2026-03-27)
- [x] **책 제목/저자 편집 UI** (`app/write/page.tsx` 사이드바)
  - 사이드바 상단에 책 제목+저자 표시 버튼 추가 (편집 아이콘 포함)
  - 클릭 시 인라인 제목/저자 입력창으로 전환 (`showTitleEdit` 상태)
  - 저장: `setTitle()` / `setAuthor()` 컨텍스트 메서드 호출 → 자동 DB 동기화
- [x] **챕터 완성 상태 자동화** (`components/write/ChatEditor.tsx`)
  - `handleAssemble()` 성공 후 `markChapterDone(chapterIdx)` 자동 호출 추가
  - "이야기 완성하기" → 산문 변환 + 챕터 완료 처리 일원화
- [x] **비회원 → 회원 데이터 이전** (`lib/book-context.tsx`)
  - 마이그레이션 useEffect: 챕터 있고 bookId 없으면 `/api/books` POST 자동 호출
  - bookId 설정 → 기존 2초 디바운스 자동 동기화가 챕터 전체 DB 업로드
- [x] **OGP 메타태그 전체 페이지 적용**
  - `app/layout.tsx`: `metadataBase` + og:title/description/image/url + twitter:card
  - `app/my/layout.tsx`: 신규 생성 (내 책 보관함 전용 OGP)
  - `app/book/layout.tsx`: 신규 생성 (책 미리보기 전용 OGP)
  - og:image: Pexels CDN 히어로 이미지 (1200×800)

---

## ⚠️ 설정 필요 항목 (개발 재개 전 확인)

### 1. Resend 이메일 서비스 ✅ 설정 완료
- `RESEND_API_KEY` Vercel 환경변수 설정 완료 (2026-03-18)
- 발신자 주소: 현재 `onboarding@resend.dev` (Resend 기본 주소, 테스트용)
- **추후 필요**: 자체 도메인 인증 → `RESEND_FROM_EMAIL` 환경변수 추가
  - Resend 대시보드 → Domains → 도메인 DNS 인증
  - `.env.local`에도 `RESEND_API_KEY` 추가 필요 (로컬 테스트용)

### 4. Supabase SQL 마이그레이션 (이미 실행 완료 — 확인용)
```sql
-- Phase 6
ALTER TABLE books ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
ALTER TABLE books ADD COLUMN IF NOT EXISTS share_token uuid;
-- Phase 8 (Supabase MCP로 실행 완료)
ALTER TABLE books ADD COLUMN IF NOT EXISTS interviewer_token uuid;
-- Phase 9 (Supabase MCP로 실행 완료)
CREATE TABLE IF NOT EXISTS site_config (id text PRIMARY KEY, data jsonb DEFAULT '{}', updated_at timestamptz DEFAULT now());
-- ✅ messages.type 체크 제약 수정 완료 (2026-03-23)
```

### 5. Supabase Realtime 설정 (Phase 7, 이미 완료)
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
RESEND_API_KEY=re_xxxx...  ← ✅ Vercel에 설정 완료, 로컬도 추가 필요
RESEND_FROM_EMAIL=         ← 미설정, 도메인 인증 후 추가 (없으면 onboarding@resend.dev 사용)
```

### Vercel (production) — 설정 완료 항목
- 위 모든 항목 + `NEXTAUTH_URL=https://mystory-khaki.vercel.app`
- `ADMIN_PASSWORD=strg1128!@` ✅ 설정 완료
- `RESEND_API_KEY` ✅ 설정 완료 (2026-03-18)
- `RESEND_FROM_EMAIL` ⚠️ 미설정 (현재 onboarding@resend.dev 사용)

---

## 🗃 데이터베이스 스키마

```sql
books (
  id uuid PK,
  user_id text,
  title text DEFAULT '나의 이야기',
  author text DEFAULT '',
  settings jsonb DEFAULT '{}',
  cover_template text DEFAULT 'classic',
  cover_photo_url text DEFAULT '',   ← Phase 5 추가 (표지 사진)
  cover_layout text DEFAULT 'topleft', ← Phase 5 추가 (표지 레이아웃)
  is_public boolean DEFAULT false,   ← Phase 6 추가
  share_token uuid,                  ← Phase 6 추가 (열람 전용)
  interviewer_token uuid,            ← Phase 8 추가 (질문 추가 권한)
  created_at, updated_at
)

chapters (
  id uuid PK,
  book_id uuid FK → books CASCADE,
  topic_id text, title text,
  sort_order int, is_custom bool,
  mode text DEFAULT 'chat',  -- CHECK: 'chat' | 'normal'
  prose text DEFAULT '', is_done bool
)

messages (
  id uuid PK,
  chapter_id uuid FK → chapters CASCADE,
  type text,   -- ✅ 체크 제약: 'ai'|'user'|'photo'|'system'|'interviewer'
  text text DEFAULT '', photo_url text, sort_order int
)
-- ※ Realtime 활성화됨 / RLS SELECT 정책 추가됨 (Phase 7)

site_config (
  id text PK,   -- 'landing' 키로 랜딩 CMS 설정 저장
  data jsonb DEFAULT '{}',
  updated_at timestamptz
)
-- ※ Phase 9 추가, RLS 공개 읽기 정책 적용됨

photos (
  id uuid PK,
  chapter_id uuid FK → chapters CASCADE,
  url text,    -- Cloudinary URL (base64 사진은 /api/admin/migrate-photos로 변환)
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

### Realtime 흐름 — 양방향 (Phase 7+8 완성)
```
[인터뷰어 → 저자]
인터뷰어가 /interviewer/[id]?token=xxx 에서 질문 전송
  → POST /api/interviewer/[bookId] → Supabase messages에 type='interviewer' INSERT
  → Supabase Realtime → write/page.tsx 구독 채널로 이벤트 수신
  → addMessage(chapterIdx, {source:'interviewer'}) → ChatEditor 보라색 메시지 표시
  → 다른 챕터이면 보라색 토스트 알림 (5초)

[저자 → 인터뷰어]
저자가 write/page.tsx에서 답변 입력 → Supabase messages INSERT (type='user'/'ai')
  → Supabase Realtime → interviewer/[id]/page.tsx 구독 채널로 이벤트 수신
  → setChapters() 업데이트 → 인터뷰어 화면에 즉시 반영
```

### 이메일 초대 흐름 (Phase 7+8 수정)
```
book/page.tsx → "✉ 초대" 버튼 (열람 또는 인터뷰어 링크 중 하나라도 있으면 표시)
  → 모달: 유형(열람/인터뷰어) 선택 + 이메일 입력
  → POST /api/books/[id]/invite { email, type }
  → 서버에서 type에 맞는 토큰 자동 조회 (share_token or interviewer_token)
  → Resend → HTML 이메일 발송
     - 열람: /shared/[bookId]?token=share_token
     - 인터뷰어: /interviewer/[bookId]?token=interviewer_token
```

### 공유 URL 체계 (Phase 8 역할 분리 완료)
| URL | 사용 토큰 | 접근 조건 |
|-----|----------|----------|
| `/shared/[bookId]` | 없음 | `is_public = true` |
| `/shared/[bookId]?token=xxx` | `share_token` | 비공개 가족 열람 |
| `/shared/[bookId]?token=xxx` | `interviewer_token` | 인터뷰어 페이지 책 로드용 |
| `/interviewer/[bookId]?token=xxx` | `interviewer_token` | 질문 추가 권한 |

> **하위 호환**: `interviewer_token`이 없는 기존 책은 `share_token`으로 인터뷰어 접근 허용

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
| `/admin` | 통계 카드 + 전체 책 목록 + 검색 + 마이그레이션 버튼 | ADMIN_PASSWORD |
| `/admin/settings` | STT 모드·API키·UI 설정 | ADMIN_PASSWORD |
| `/admin/landing` | 랜딩 CMS (이미지·문구 편집) ← Phase 9 | ADMIN_PASSWORD |
| `/api/admin/stats` | 서비스 통계 JSON | x-admin-password 헤더 |
| `/api/admin/settings` | 설정 GET/POST | x-admin-password 헤더 |
| `GET /api/admin/migrate-photos` | base64 사진 대기 수 확인 | x-admin-password 헤더 |
| `POST /api/admin/migrate-photos` | base64→Cloudinary 일괄 변환 | x-admin-password 헤더 |
| `GET/POST /api/admin/landing` | 랜딩 config 조회/저장 + ISR 재검증 ← Phase 9 | x-admin-password 헤더 |

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

### 온보딩 모달 동작
```
첫 방문: localStorage.mystory_visited 없음
  → OnboardingModal 표시 (dynamic import, ssr: false)
  → "시작하기" 클릭 → localStorage.mystory_visited='true' + scrollToStart()
  → "×" 클릭 or 배경 클릭 → localStorage.mystory_visited='true' + 닫힘

재방문: localStorage.mystory_visited='true' → 모달 미표시
```

---

## 🚧 다음 작업 목록 (우선순위 순)

> 상세 현황: `docs/mystory-progress-report.md` 참고

### 🔴 즉시 필요 (운영 안정화)
- [x] **messages.type 체크 제약 수정** ✅ 완료 (2026-03-23)
- [ ] **RESEND_API_KEY 로컬 추가** — `.env.local`에 Vercel과 동일한 키 추가
- [ ] **관리자 랜딩 CMS 초기 데이터 입력** — `/admin/landing`에서 "기본값 초기화" 클릭 → site_config 생성
- [ ] **Whisper STT end-to-end 검증** — 실제 음성 녹음 → 인식 → 입력 전 과정 테스트
- [ ] **base64 사진 마이그레이션 실행** — 관리자 대시보드 → 마이그레이션 버튼 클릭

### 🟡 단기 — UX 보완
- [x] **책 제목/저자 편집 UI** ✅ 완료 — write 사이드바 인라인 편집 (Phase 10)
- [x] **챕터 완성 상태 자동화** ✅ 완료 — handleAssemble 시 markChapterDone 자동 호출 (Phase 10)
- [x] **비회원 → 회원 전환 시 데이터 이전** ✅ 완료 — 로그인 시 DB 책 자동 생성 (Phase 10)
- [x] **OGP 메타태그 전체 페이지 적용** ✅ 완료 — 랜딩/my/book 모두 적용 (Phase 10)
- [ ] **Resend 발신자 도메인 인증** — `noreply@[커스텀도메인]` (Resend 대시보드 → Domains)
- [ ] **OpenAI quota 관리** — 소진 시 알림 + quota 충전
- [ ] **AI 토큰 최적화 1단계** — 방안 C: 오래된 메시지 80자 truncate (docs/token-optimization-strategies.md)
- [ ] **모바일 사진 업로드** — `capture="environment"` 속성으로 카메라 직접 촬영 연동
- [ ] **/book 페이지 제목/저자 편집** — 책 미리보기 화면에서도 제목 수정 가능하게

### 🟠 중기 — 기능 확장
- [ ] **결제 시스템** — Stripe 또는 토스페이 연동 (구독/단건 결제 모델)
- [ ] **AI 토큰 최적화** — `docs/token-optimization-strategies.md` 참고
  - 1단계: 방안 C (오래된 메시지 80자 truncate, 코드 5줄)
  - 2단계: 방안 A (슬라이딩 윈도우 + 요약 컨텍스트)
- [ ] **가족 초대 이메일 다중 발송** — 현재 1건 → 여러 명 동시 발송 UI
- [ ] **챕터 간 문맥 연결** — 전체 생애사 맥락을 AI가 요약·연결하는 기능
- [ ] **관리자 사용자 관리** — 회원 탈퇴·이메일 발송 기능

### 🟢 장기 — 사업화
- [ ] **POD 인쇄/제본 연동** — 외부 출판사 API → 실물 책 주문
- [ ] **오디오북 변환** — TTS로 완성된 책을 음성 파일로 변환
- [ ] **IP융복합 콘텐츠 제작** — 고양산업진흥원 사업계획서 기반 LED 전시 콘텐츠화
- [ ] **B2B 기관 납품 모드** — 실버타운·병원용 회상치료 세션 관리
- [ ] **다국어 지원** — 재외동포 시장 (영어·일어)
- [ ] **Supabase Auth 마이그레이션** — NextAuth → Supabase Auth 통합 검토

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
| DB | Supabase (PostgreSQL + Realtime 양방향) |
| 사진 저장 | Cloudinary (base64 마이그레이션 API 포함) |
| 이메일 | Resend (v6.9.4) — API 키 설정 완료, 발신자 도메인 미인증 |
| 이미지 압축 | Canvas API (lib/compress-image.ts) — 클라이언트 사이드 |
| 랜딩 CMS | Supabase site_config + ISR 온디맨드 재검증 |
| 배포 | Vercel |
| 음성 | Web Speech API (browser) + OpenAI Whisper STT |
| PDF | 브라우저 window.print() + CSS @media print |

---

## 📌 개발 원칙

- **코드탭 사용 금지** — Claude.ai 대화창 컨텍스트 누적 시 론 서로게이트 JSON 오류 발생
- **mystory-app.jsx** — 참조용 레거시, 실제 앱과 다름
- 모든 개발은 Claude Code (CLI)에서 `/mystory` 폴더를 직접 편집
- Vercel 환경변수 변경 후 반드시 재배포 (`vercel --prod`)
- preview 환경에서는 NextAuth hydration 오류 발생 — 기능 자체 문제 아님, 프로덕션에서 정상 동작

---

## 📚 참고 문서

| 파일 | 내용 |
|------|------|
| `docs/mystory-progress-report.md` | Phase별 전체 진행 현황 + 미완성 항목 체크리스트 |
| `docs/design-guide.md` | 디자인 시스템 가이드 (색상·타이포·애니메이션·레이아웃) |
| `docs/token-optimization-strategies.md` | AI 토큰 최적화 전략 (슬라이딩 윈도우·하이브리드·압축) |
| `docs/사업계획서_IP융복합콘텐츠제작지원_나의이야기.md` | 2026 고양산업진흥원 IP융복합 콘텐츠 제작 지원 사업계획서 |
| `docs/mystory-ux-review.md` | UX 점검 + 상세 계획 |
| `docs/mystory-dev-issues.md` | 관리자 STT 설정 API 상세 설계 |
| `config/settings.json` | STT·UI 서비스 설정 (관리자 페이지에서 수정) |
