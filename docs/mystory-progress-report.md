# 나의이야기(My Story) — 전체 개발 현황 리포트

> **최종 업데이트**: 2026-03-27
> **현재 버전**: Phase 10 완료 (MVP 배포 운영 중)
> **서비스 URL**: https://mystory-khaki.vercel.app

---

## 1. 프로젝트 개요

어르신·중장년 대상 AI 기반 자서전 제작 플랫폼.
AI와의 대화 인터뷰 또는 자유 글쓰기로 인생 이야기를 챕터별로 작성하고,
한 권의 책으로 완성해 가족과 공유하는 웹 서비스.

**핵심 가치**: 글쓰기가 익숙하지 않은 누구라도 말하듯 편하게 자신의 생애를 기록할 수 있도록

---

## 2. 최초 요청사항 vs. 현재 구현 상태

### 2-1. 핵심 기능 체크

| 최초 요청 | 구현 상태 | 비고 |
|---------|---------|------|
| AI 대화 인터뷰로 생애사 기록 | ✅ 완료 | GPT-4o-mini, 72개 주제 |
| 자유 글쓰기 모드 | ✅ 완료 | NormalEditor |
| 음성 인식 입력 | ✅ 완료 | Web Speech API + Whisper STT |
| 사진 첨부 | ✅ 완료 | Cloudinary, Canvas 압축 |
| 한 권의 책으로 완성 | ✅ 완료 | FlipBook + 스크롤 리더 |
| PDF 내보내기 | ✅ 완료 | A5 고정, 인라인 사진, 페이지번호 |
| 가족 공유 | ✅ 완료 | 공개URL + 비공개 토큰 |
| 가족 인터뷰어 협업 | ✅ 완료 | 실시간 양방향 Realtime |
| 이메일 초대 | ✅ 완료 | Resend (API 키 설정 완료) |
| 회원 인증 (Google/Kakao) | ✅ 완료 | NextAuth.js |
| 비회원 모드 | ✅ 완료 | localStorage 임시 저장 |
| 마이페이지(책 보관함) | ✅ 완료 | 정렬·진행률 바 |
| 관리자 대시보드 | ✅ 완료 | 통계·설정·CMS |
| 온보딩 모달 | ✅ 완료 | 첫 방문자 가이드 |
| 랜딩 페이지 CMS | ✅ 완료 | ISR + Supabase site_config |

### 2-2. UX 개선 요구사항 체크 (mystory-ux-review.md 기준)

| UX 개선 항목 | 구현 상태 | 비고 |
|-----------|---------|------|
| 랜딩 한글 라벨 ("책 제목", "지은이") | ✅ 완료 | |
| 서비스 3단계 안내 (HOW IT WORKS) | ✅ 완료 | 아웃라인 원 + 워터마크 숫자 |
| 이어서 작성하기 버튼 | ✅ 완료 | 랜딩 상단 |
| 주제 선택 추천 프리셋 5개 | ✅ 완료 | "처음이세요?" 섹션 |
| 선택 카운터 표시 | ✅ 완료 | |
| 대화 모드 진행률 표시 | ✅ 완료 | write/page.tsx 진행률 바 |
| 인터뷰어 보조 사용 지원 | ✅ 완료 | /interviewer/[id] 전용 페이지 |
| 세션 저장 / 이어쓰기 | ✅ 완료 | Supabase 2초 디바운스 자동 저장 |
| 가족 역할 분리 (열람/인터뷰어) | ✅ 완료 | share_token / interviewer_token |
| 텍스트 크기 설정 (일반/확대) | ✅ 완료 | admin/settings |
| 책 표지 템플릿 | ✅ 완료 | 6종 디자인 + 사진 커버 6레이아웃 |
| OGP 메타태그 (공유 썸네일) | ✅ 완료 | 랜딩/my/book/shared 전 페이지 적용 |
| 주제 선택 첫 카테고리 자동 펼침 | ✅ 완료 | |

---

## 3. Phase별 완료 이력

### Phase 1~3 (Claude.ai 코드탭 — 2026-02 ~ 03-11)
- 랜딩, 주제 선택(72개), 목차 편집, 대화/일반 모드 전환
- Web Speech API 음성인식, Next.js 14 App Router 마이그레이션
- Supabase CRUD + 2초 디바운스 자동 동기화
- NextAuth.js (이메일/Google/Kakao OAuth), 로그인 페이지, 비회원 모드

### Phase 4~5 (Claude.ai 코드탭 — 2026-03-11)
- Vercel 배포 완료, Google/Kakao OAuth 운영 설정
- 마이페이지(/my) 책 보관함, FlipBook 페이지 넘기기 애니메이션
- Brunch 스타일 스크롤 리더, PDF 내보내기 (A4/A5/B5/B6)
- 대표사진(isFeatured) 챕터 배경 히어로 이미지, 표지 저장

### Phase 6 (Claude Code — 2026-03-17)
- 이모지 론 서로게이트 버그 수정 (sanitize 함수)
- 챕터 읽기 네비게이션 (IntersectionObserver, 이전/다음, 플로팅 TOC)
- Cloudinary 이전 (사진 base64 → URL), 책 공유 URL (is_public)
- 가족 공유 링크 (share_token), PDF 내보내기 고도화
- 인터뷰어 모드 (/interviewer/[id], 챕터별 질문, 보라색 UI)

### Phase 7 (Claude Code — 2026-03-17)
- Whisper STT 연동 완성 (maxDurationSec, 자동 중지)
- 인터뷰어 Realtime — 저자 화면 실시간 반영, 챕터 다른 경우 토스트
- 관리자 대시보드 (통계 4개, 전체 책 목록, 검색)
- 가족 이메일 초대 (Resend, 유형 선택)

### Phase 8 (Claude Code — 2026-03-19)
- 랜딩 페이지 전면 리디자인 (HOW IT WORKS, FOR WHOM 배경)
- 마이페이지 UI/UX 개선 (에디토리얼 헤더, 정렬 탭, 진행률 바, 빈 상태)
- 온보딩 튜토리얼 모달 (localStorage, 3단계 가이드)
- 인터뷰어 답변 Realtime (인터뷰어 화면 실시간)
- base64 → Cloudinary 일괄 마이그레이션 API
- 인터뷰어 모드 역할 분리 (share_token / interviewer_token 독립)

### Phase 9 (Claude Code — 2026-03-19~21)
- 사진 업로드 500 에러 수정 (lib/compress-image.ts — Canvas 압축)
- 랜딩 이미지 전면 교체 (Pexels CDN, 한국인/아시아인 사진)
- FOR WHOM 5-카드 비대칭 그리드
- 관리자 랜딩 CMS (Supabase site_config, 이미지·문구 편집)
- 랜딩 ISR + 온디맨드 재검증 (Server Component, 깜빡임 제거)
- 스크롤 애니메이션 강화 (reveal-left/right/blur, GPU 가속, 5단계 delay)
- messages.type 체크 제약 수정 (SQL 실행 — 'interviewer' 타입 추가)

### 문서화 (2026-03-24)
- docs/design-guide.md 신규 작성
- docs/token-optimization-strategies.md 신규 작성
- docs/사업계획서_IP융복합콘텐츠제작지원_나의이야기.md 신규 작성

### Phase 10 (Claude Code — 2026-03-27)
- [x] **책 제목/저자 편집 UI** — 사이드바 상단에 인라인 편집 UI 추가 (write/page.tsx)
  - 책 제목+저자 버튼 → 클릭 시 제목/저자 입력창 전환
  - 저장: `setTitle()` / `setAuthor()` 호출, 취소: 원래 값 유지
- [x] **챕터 완성 상태 자동화** — ChatEditor.tsx `handleAssemble` 성공 시 `markChapterDone()` 자동 호출
  - "이야기 완성하기" 클릭 → 산문 변환 + 챕터 완료 처리 일원화
- [x] **비회원 → 회원 데이터 이전** — book-context.tsx 마이그레이션 useEffect 개선
  - 로그인 시 챕터 있고 bookId 없으면 `/api/books` POST → DB 책 자동 생성
  - bookId 설정 후 기존 2초 디바운스 자동 동기화가 챕터 전체 DB 업로드
- [x] **OGP 메타태그 전체 페이지 적용**
  - `app/layout.tsx`: og:title / og:description / og:image / og:url / twitter:card 추가
  - `app/my/layout.tsx`: 신규 생성 — 내 책 보관함 전용 OGP
  - `app/book/layout.tsx`: 신규 생성 — 책 미리보기 전용 OGP
  - og:image: Pexels 히어로 이미지 CDN URL (1200×800)

---

## 4. 미완성 / 보완 필요 항목

### 4-1. 즉시 처리 필요 🔴

| 항목 | 상태 | 내용 |
|------|------|------|
| RESEND_API_KEY 로컬 추가 | ❌ 미완 | .env.local에 Vercel과 동일한 키 추가 (로컬 이메일 테스트) |
| 관리자 랜딩 CMS 초기 데이터 입력 | ❌ 미완 | /admin/landing → "기본값 초기화" 클릭으로 site_config 생성 필요 |
| Whisper STT end-to-end 검증 | ❌ 미완 | 실제 음성 녹음 → 인식 → 입력 전 과정 테스트 필요 |
| base64 사진 마이그레이션 실행 | ❌ 미완 | 관리자 대시보드 로그인 후 마이그레이션 버튼 클릭 |

### 4-2. 단기 기능 보완 🟡

| 항목 | 우선순위 | 상태 | 설명 |
|------|---------|------|------|
| 책 제목/저자 편집 기능 | 높음 | ✅ 완료 | write 사이드바에 인라인 편집 UI 추가 (Phase 10) |
| 챕터 완성 상태 명확화 | 높음 | ✅ 완료 | handleAssemble 성공 시 markChapterDone 자동 호출 (Phase 10) |
| OGP 메타태그 전체 적용 | 중간 | ✅ 완료 | 랜딩/my/book 모두 적용 (Phase 10) |
| 비회원 → 회원 전환 시 데이터 이전 | 중간 | ✅ 완료 | 로그인 시 DB 책 자동 생성 + 동기화 (Phase 10) |
| Resend 발신자 도메인 인증 | 중간 | ❌ 미완 | 현재 onboarding@resend.dev → 자체 도메인 인증 필요 |
| OpenAI quota 관리 | 중간 | ❌ 미완 | 소진 시 로컬 질문풀 폴백 중 → quota 충전 또는 사용량 모니터링 |
| 모바일 사진 업로드 UX | 낮음 | ❌ 미완 | 카메라 직접 촬영 연동 (capture="environment" 속성) |
| /book 페이지 내 제목/저자 편집 | 낮음 | ❌ 미완 | 책 미리보기 화면에서도 직접 제목 수정 가능하게 |

### 4-3. 중기 개발 과제 🟠

| 항목 | 설명 |
|------|------|
| 결제 시스템 | 사업화를 위한 Stripe/토스페이 연동 — 구독/단건 결제 모델 |
| AI 토큰 최적화 | docs/token-optimization-strategies.md 참고 — 방안 C(압축) 먼저 적용 |
| 가족 초대 이메일 다중 발송 | 현재 1건씩 → 여러 명 동시 발송 UI |
| 챕터 간 문맥 연결 | 각 챕터 독립적 → 전체 생애사 맥락 연결 AI 요약 |
| 관리자 사용자 관리 | 현재 책 목록만 → 회원 탈퇴·강제 삭제·이메일 발송 기능 |
| 책 완성 알림 (Push/Email) | 챕터 완성·가족 활동 알림 |
| 인쇄/제본 서비스 연동 (POD) | 외부 출판사 API 연동 — 실물 책 주문 |

### 4-4. 장기 개발 과제 🟢

| 항목 | 설명 |
|------|------|
| Supabase Auth 마이그레이션 | NextAuth → Supabase Auth 통합 검토 |
| 다국어 지원 | 한국어 외 영어·일어 (재외동포 시장) |
| AI 인터뷰 품질 고도화 | 슬라이딩 윈도우 + 요약 컨텍스트 (token-optimization-strategies.md 방안 A) |
| 회상치료(RT) 전문 프로그램 | 실버타운·병원 B2B — 구조화된 세션 관리 |
| 생애사 → 오디오북 변환 | TTS로 완성된 책을 음성으로 변환 |
| 생애사 → LED/전시 콘텐츠 | IP융복합 사업계획서 기반 고양시 연계 |

---

## 5. 현재 알려진 버그 / 이슈

| 이슈 | 심각도 | 현황 |
|------|--------|------|
| NextAuth hydration 경고 (preview 환경) | 낮음 | suppressHydrationWarning 추가 완료, 프로덕션 정상 |
| 비회원 모드 Supabase 저장 불가 | 중간 | 설계상 의도적 — localStorage만 사용, 안내 문구 추가 필요 |
| Whisper STT 미검증 | 높음 | API 연동 완료, 실제 음성 테스트 필요 |
| OpenAI quota 소진 시 폴백 | 중간 | 로컬 질문풀로 폴백되나 AI 반응 품질 저하 |

---

## 6. 기술 스택 현황

| 영역 | 기술 | 버전/상태 |
|------|------|----------|
| 프레임워크 | Next.js (App Router) + TypeScript | 14.x |
| 인증 | NextAuth.js v4 (이메일/Google/Kakao) | 운영 중 |
| DB | Supabase (PostgreSQL + Realtime) | 운영 중 |
| 이미지 | Cloudinary | 운영 중 |
| AI | OpenAI GPT-4o-mini + Whisper | 연동 완료 |
| 이메일 | Resend | API 키 설정 완료 |
| 배포 | Vercel (자동 배포 main 브랜치) | 운영 중 |
| 상태관리 | Context API + localStorage | — |
| 이미지압축 | Canvas API (lib/compress-image.ts) | 운영 중 |
| ISR/CDN | Vercel Edge Network | 운영 중 |

---

## 7. 배포 정보

| 항목 | 값 |
|------|-----|
| 프로덕션 URL | https://mystory-khaki.vercel.app |
| GitHub | https://github.com/storigehub/mystory (main → 자동 배포) |
| Supabase | https://newfsanyqkcxmtfqacfe.supabase.co |
| Vercel 프로젝트 | yohans-projects-de3234df/mystory |
| 총 커밋 수 | 46개 (Phase 1 ~ Phase 10) |
