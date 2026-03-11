# 📊 mystory (배포 폴더) — 현재 상태 및 다음 단계

## 현재 상태 (2026-03-11)

### ✅ 완료된 것
```
mystory/ (프로덕션 Next.js 프로젝트)
├── 기본 구조
│   ├── Next.js 14 App Router 설정 ✅
│   ├── TailwindCSS + PostCSS 설정 ✅
│   ├── TypeScript 설정 ✅
│   └── Vercel 배포 설정 ✅
│
├── 페이지 (기본 구조만)
│   ├── app/page.tsx (존재, 내용 미정)
│   ├── app/layout.tsx ✅
│   └── tsconfig.json ✅
│
├── 라이브러리
│   ├── lib/supabase.ts ✅ (클라이언트/서버 팩토리)
│   ├── lib/database.types.ts ✅ (Supabase 타입)
│   ├── lib/ai-client.ts ✅ (OpenAI 기본)
│   ├── lib/constants.ts ✅
│   └── lib/db.ts ✅
│
├── API 라우트
│   ├── app/api/ai/chat/route.ts ✅ (스켈레톤 구현)
│   │   └── OpenAI 기본 연동됨
│   └── app/api/ai/transcribe/route.ts ❌ (미생성)
│
├── 컴포넌트 (기본 구조)
│   ├── components/ui/ (Shadcn/ui 기본)
│   ├── components/chat/ (미작성)
│   ├── components/editor/ (미작성)
│   └── components/layout/ (미작성)
│
├── 배포
│   ├── package.json ✅ (필수 패키지)
│   ├── next.config.js ✅
│   ├── vercel.json ✅
│   └── .env.example ❌ (미생성 - 생성 예정)
│
└── 문서
    └── README.md ✅ (Supabase + Vercel 배포 가이드)
```

### 📦 현재 의존성
```json
{
  "dependencies": {
    "next": "14.2.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "openai": "^4.67.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "tailwindcss": "^3.4.13",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47"
  }
}
```

---

## 📋 Next.js 프로젝트 확인 사항

### 1. 로컬 개발 환경 설정
```bash
# 프로젝트 폴더
cd /Users/yohan/Documents/claude/mystory

# 의존성 설치 (아직 안 했으면)
npm install

# 개발 서버 시작
npm run dev
# → http://localhost:3000에서 확인
```

### 2. 환경변수 설정
현재: `.env.example` 없음

**필요한 환경변수** (.env.local 또는 .env):
```
# OpenAI
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0...
SUPABASE_SERVICE_ROLE_KEY=eyJ0...

# NextAuth.js (Phase 3c에서)
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

### 3. 빌드 검증
```bash
npm run build
# → .next 폴더 생성되고 오류 없으면 OK
```

---

## 🚀 Phase 3 시작 전 준비 사항

### Before Phase 3a (프론트엔드 컴포넌트화)
1. [ ] `npm install` 실행 및 node_modules 확인
2. [ ] `npm run dev` → localhost:3000 접속 확인
3. [ ] mystory-handoff/mystory-app.jsx 분석 (UI 구조, 상태 이해)
4. [ ] mystory-handoff/mystory-ux-review.md 읽기 (디자인 기준)
5. [ ] `PHASE-3-ROADMAP.md` 재확인

### Before Phase 3b (백엔드 모듈 통합)
6. [ ] `lib/ai/` 폴더 생성
7. [ ] mystory-handoff/src/modules/ai → lib/ai 복사
8. [ ] 모듈 import 경로 확인 및 수정

### Before Phase 3c (DB + 인증)
9. [ ] Supabase 가입 및 프로젝트 생성
10. [ ] Supabase 환경변수 .env.local에 설정
11. [ ] `lib/supabase-schema.sql` 적용 (README.md 참고)
12. [ ] NextAuth.js 패키지 추가

---

## 📁 mystory 폴더 정리

### 현재 불필요한 파일
```
mystory/
├── mystory-dev-issues.md (← mystory-handoff와 중복)
└── (다른 건 다 필요함)
```

**액션**:
- [ ] mystory-dev-issues.md 삭제 (mystory-handoff에서 참고)

### 추가 필요한 파일
```
신규 생성:
- .env.example (환경변수 템플릿)
- middleware.ts (인증 보호 - Phase 3c)
- app/providers.tsx (Context/Zustand 공급자 - Phase 3a)
```

---

## 🔧 초기 설정 체크리스트

- [ ] **npm install** 실행
  ```bash
  cd /Users/yohan/Documents/claude/mystory
  npm install
  ```

- [ ] **개발 서버 실행 확인**
  ```bash
  npm run dev
  # → http://localhost:3000 접속 가능한지 확인
  ```

- [ ] **빌드 확인**
  ```bash
  npm run build
  # → 성공적으로 .next 폴더 생성되는지 확인
  ```

- [ ] **.env.local 생성** (Phase 3c 전까지는 선택)
  ```
  OPENAI_API_KEY=...
  OPENAI_MODEL=gpt-4
  ```

- [ ] **TypeScript 타입 확인**
  ```bash
  npx tsc --noEmit
  # → 오류 없으면 OK
  ```

---

## 📚 참고 문서

| 문서 | 위치 | 용도 |
|------|------|------|
| PHASE-3-ROADMAP.md | 이 폴더 | Phase 3 상세 계획 |
| mystory-app.jsx | mystory-handoff | 프론트엔드 UI 참고 |
| mystory-ux-review.md | mystory-handoff | 디자인/UX 기준 |
| CLAUDE.md | mystory-handoff | 기술 결정 기록 |
| mystory-progress-report.md | mystory-handoff | 완성된 기능 목록 |

---

## 다음 세션 계획

### Session 1 (초기 설정)
1. `npm install` 및 개발 환경 확인
2. mystory-handoff 문서 읽기 (CLAUDE.md, mystory-ux-review.md)
3. 프론트엔드 구조 분석 (mystory-app.jsx)

### Session 2+ (Phase 3a)
1. Landing 페이지 구현
2. SelectPage 컴포넌트
3. WritePage 컴포넌트
4. BookPage 컴포넌트
5. 전역 상태 관리 설정

### Session 3 (Phase 3b)
1. 모듈 마이그레이션 (src/modules → lib/ai)
2. API 라우트 구현

### Session 4 (Phase 3c)
1. Supabase 스키마 적용
2. NextAuth.js 설정
3. 인증 보호

### Session 5 (Phase 4)
1. 배포 및 최적화

---

## 🎯 주요 원칙

1. **mystory**: 프로덕션 코드만 유지
   - 깨끗한 구조
   - 배포 가능한 상태 유지

2. **mystory-handoff**: 개발 참고 자료
   - 문서는 유지
   - 모듈은 필요 부분만 복사
   - 프로토타입은 읽기 전용

3. **점진적 마이그레이션**
   - mystory-app.jsx 전체 복사 X
   - 컴포넌트 단위로 분해하며 개선
   - 기존 모듈은 검증 후 통합

---

**작성일**: 2026-03-11
**상태**: Phase 3 시작 전 준비 완료
**다음 액션**: npm install + 개발 환경 확인
