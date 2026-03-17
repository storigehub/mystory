# 나의이야기 (My Story) — Claude Code 인계 문서

> **최종 업데이트**: 2026-03-17
> **작성 환경**: Claude Code (CLI) — claude-sonnet-4-6
> ⚠️ Claude.ai 코드탭에서 개발하던 내용을 Claude Code로 이전 완료. 앞으로 모든 개발은 Claude Code에서 진행.

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

---

## 📁 실제 앱 파일 구조 (`/mystory`)

```
app/
├── page.tsx               ← 랜딩 (책 제목/저자 입력, 이어쓰기)
├── select/page.tsx        ← 주제 선택 (72개 카드, 10개 카테고리)
├── toc/page.tsx           ← 목차 편집 (순서 변경/삭제)
├── write/page.tsx         ← 글쓰기 (ChatEditor + NormalEditor + Sidebar)
├── book/page.tsx          ← 책 미리보기 (읽기/FlipBook + 공유/PDF)
├── my/page.tsx            ← 마이페이지 (책 보관함, 공유 상태 배지)
├── login/page.tsx         ← 로그인 (이메일/Google/Kakao + 비회원)
├── shared/[id]/page.tsx   ← 공개 책 읽기 (인증 불필요, 토큰 지원)
├── interviewer/[id]/page.tsx ← 인터뷰어 전용 페이지 (질문 추가)
├── admin/page.tsx         ← 관리자 대시보드
└── api/
    ├── ai/
    │   ├── chat/route.ts           ← GPT-4o-mini 인터뷰어 (론 서로게이트 sanitize 포함)
    │   ├── assemble/route.ts       ← 대화→산문 자동 변환
    │   └── whisper/transcribe/route.ts ← Whisper STT 프록시
    ├── auth/[...nextauth]/route.ts ← NextAuth.js
    ├── books/route.ts              ← GET 목록(is_public, share_token 포함) / POST 생성
    ├── books/[id]/route.ts         ← GET/PUT(is_public 지원)/DELETE
    ├── books/[id]/sync/route.ts    ← 전체 상태 동기화 (interviewer 타입 보존)
    ├── books/[id]/share/route.ts   ← POST 가족토큰 생성 / DELETE 해제
    ├── shared/[id]/route.ts        ← 공개 조회 (is_public OR ?token= 일치)
    ├── interviewer/[id]/route.ts   ← 인터뷰어 질문 추가 (토큰 인증)
    ├── upload/photo/route.ts       ← Cloudinary 사진 업로드
    ├── profile/route.ts            ← 닉네임 GET/PUT
    ├── settings/route.ts           ← 사용자 설정
    └── admin/settings/route.ts     ← 관리자 설정 (비밀번호 인증)

components/
├── write/
│   ├── ChatEditor.tsx    ← AI 대화 인터뷰 (인터뷰어 메시지 보라색 구분)
│   └── NormalEditor.tsx  ← 자유 글쓰기 (Cloudinary 업로드)
└── book/
    ├── FlipBook.tsx      ← react-pageflip 페이지 넘기기
    └── PrintBook.tsx     ← PDF 인쇄 전용 레이아웃 (인라인 사진, 페이지번호)

lib/
├── book-context.tsx      ← Context API 상태 관리 (Message.source 필드 추가됨)
├── supabase.ts           ← Supabase 클라이언트
├── auth-helpers.ts       ← NextAuth 세션 헬퍼
├── design-tokens.ts      ← 디자인 토큰
└── interview-questions.ts ← 질문 풀
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

### Phase 6 (Claude Code에서 개발 — 2026-03-17)
- [x] **이모지 론 서로게이트 버그 수정** — chat/route.ts에 sanitize 함수 추가
- [x] **챕터 읽기 네비게이션** — IntersectionObserver 현재 챕터 감지, 이전/다음 버튼, 플로팅 TOC
- [x] **Cloudinary 이전** — 사진 base64→Cloudinary URL, /api/upload/photo 라우트
- [x] **책 공유 URL** — is_public 토글, /shared/[id] 공개 읽기 페이지
- [x] **가족 공유 링크** — share_token UUID, /api/books/[id]/share, 토큰 기반 비공개 공유
- [x] **PDF 내보내기 개선** — 일반 사용자 PDF 저장(A5), 인라인 사진 배치, 페이지번호, print-color-adjust
- [x] **인터뷰어 모드** — /interviewer/[id] 페이지, 챕터별 질문 추가, ChatEditor 보라색 구분

---

## ⚠️ Supabase 마이그레이션 — 미실행 시 오류 발생

아래 SQL을 **Supabase SQL Editor에서 반드시 실행**해야 Phase 6 기능이 동작한다:

```sql
-- 책 공개/비공개
ALTER TABLE books ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- 가족 공유 토큰
ALTER TABLE books ADD COLUMN IF NOT EXISTS share_token uuid;
```

> 실행 여부 확인: Supabase 대시보드 → Table Editor → books 테이블에서 컬럼 존재 여부 확인

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
ADMIN_PASSWORD=...
```

### Vercel (production) — 설정 완료 (16개)
- 위 모든 항목 + `NEXTAUTH_URL=https://mystory-khaki.vercel.app`

---

## 🗃 데이터베이스 스키마

```sql
books (
  id uuid PK,
  user_id uuid FK → users,
  title text,
  author text,
  cover_template text DEFAULT 'classic',
  is_public boolean DEFAULT false,   ← Phase 6 추가 (마이그레이션 필요)
  share_token uuid,                  ← Phase 6 추가 (마이그레이션 필요)
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
  type text,   -- 'user' | 'ai' | 'photo' | 'interviewer'  ← interviewer Phase 6 추가
  text text, sort_order int
)

photos (
  id uuid PK,
  chapter_id uuid FK → chapters CASCADE,
  url text,    -- Cloudinary URL (이전: base64 직접 저장)
  caption text, sort_order int,
  is_featured bool DEFAULT false
)
```

---

## 🔑 핵심 로직 / 주의사항

### 이모지 & JSON 오류
- `app/api/ai/chat/route.ts` — `sanitize()` 함수로 론 서로게이트 제거
- Claude.ai 대화창이 컨텍스트 누적으로 같은 오류 발생 시 → **새 대화 시작**으로 해결 (코드 문제 아님)

### 사진 업로드 흐름
```
사용자 파일 선택
  → NormalEditor.onFileSelect()
  → POST /api/upload/photo (FormData)
  → Cloudinary 업로드
  → URL 반환 → photo.data 에 저장
  → Supabase sync → photos.url 컬럼에 저장
```

### 공유 URL 체계
| URL | 접근 조건 |
|-----|----------|
| `/shared/[bookId]` | `is_public = true` |
| `/shared/[bookId]?token=xxx` | `share_token` 일치 (비공개 책 가족 공유) |
| `/interviewer/[bookId]?token=xxx` | `share_token` 일치 (질문 추가 권한) |

### 인터뷰어 메시지 흐름
```
인터뷰어 페이지에서 질문 입력
  → POST /api/interviewer/[bookId] {token, chapterId, question}
  → Supabase messages 테이블에 type='interviewer' 저장
  → 저자가 /write 열면 restoreFromDb() 호출
  → book-context: type='interviewer' → {type:'assistant', source:'interviewer'}
  → ChatEditor: source==='interviewer' 이면 보라색 아이콘/배경 표시
```

### Message.source 필드 (Phase 6 추가)
```typescript
// lib/book-context.tsx
interface Message {
  type: 'user' | 'assistant' | 'photo';
  source?: 'ai' | 'interviewer';  // ← 추가됨
}
// DB 'ai' → { type: 'assistant', source: 'ai' }
// DB 'interviewer' → { type: 'assistant', source: 'interviewer' }
```

### sync/route.ts 메시지 타입 변환
```typescript
// assistant 저장 시: source 따라 분기
type: m.type === 'assistant'
  ? (m.source === 'interviewer' ? 'interviewer' : 'ai')
  : m.type
```

### 한글 IME 처리
모든 텍스트 입력창에 `composingRef` + `onCompositionStart/End` 패턴 필수.
Enter 전송 로직: `if (e.key === 'Enter' && !e.shiftKey && !composingRef.current)`

---

## 🚧 다음 작업 목록 (우선순위 순)

### 즉시 필요
- [ ] **Supabase SQL 마이그레이션 실행** (위 SQL 2개 — 아직 미실행이면 공유/인터뷰어 기능 오류)

### 단기
- [ ] **Whisper STT 연동 완성** — 현재 route 있으나 실제 연결 검증 필요
- [ ] **인터뷰어 모드 실시간화** — 현재 비동기(저자가 다음에 열면 보임). Supabase Realtime으로 즉시 알림 구현
- [ ] **OpenAI quota 충전** — 현재 소진 상태, 로컬 질문 풀로 자동 폴백 중

### 중기
- [ ] **관리자 대시보드 완성** — STT 설정, 사용자 관리 (mystory-dev-issues.md 참조)
- [ ] **사진 S3/Cloudinary 마이그레이션 완성** — 기존 base64로 저장된 이전 사진들 처리
- [ ] **온보딩 튜토리얼** — 첫 방문자 가이드

### 장기
- [ ] **POD 인쇄 연동** — 외부 출판사 API 연동
- [ ] **가족 초대 이메일** — 현재 링크 공유 방식 → 이메일 발송 (Resend 등)
- [ ] **인터뷰어 모드 역할 분리** — 소유자/읽기전용/인터뷰어 권한 체계

---

## 🛠 개발 환경 실행

```bash
cd /Users/yohan/Documents/claude/mystory
npm run dev   # localhost:3000
```

```bash
# 배포 (main 브랜치 push → Vercel 자동 배포)
git add .
git commit -m "..."
git push origin main
```

---

## ⚙️ 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) + TypeScript |
| 상태 관리 | Context API + localStorage + Supabase 2초 디바운스 동기화 |
| AI | OpenAI GPT-4o-mini + 로컬 질문 풀 폴백 |
| 인증 | NextAuth.js v4 (이메일/Google/Kakao) |
| DB | Supabase (PostgreSQL) |
| 사진 저장 | Cloudinary (Phase 6 이전 완료) |
| 배포 | Vercel + Supabase |
| 음성 | Web Speech API (browser) + Whisper STT (optional) |
| PDF | 브라우저 window.print() + CSS @media print |

---

## 📌 Claude.ai 코드탭 관련 주의사항

- **코드탭은 더 이상 사용하지 않는다** — 대화 컨텍스트가 길어지면 론 서로게이트 JSON 오류 발생
- **mystory-app.jsx** (이 폴더의 프로토타입)는 참조용 레거시. 실제 앱 코드와 다름
- 모든 개발은 Claude Code (이 CLI)에서 `/mystory` 폴더를 직접 편집

---

## 📚 참고 문서 (이 폴더 내)

- `mystory-progress-report.md` — Phase별 전체 진행 현황
- `mystory-ux-review.md` — UX 점검 + Phase 3, 4 상세 계획
- `mystory-dev-issues.md` — 관리자 STT 설정 API 상세 설계
