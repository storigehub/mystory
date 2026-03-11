# 나의이야기 (My Story)

어르신 대상 AI 기반 자서전 제작 웹 플랫폼

## 배포 방법

### 1단계: Supabase 설정

1. [supabase.com](https://supabase.com) 가입
2. "New Project" → 프로젝트 이름: `mystory` → 비밀번호 설정 → Create
3. 좌측 메뉴 "SQL Editor" 클릭
4. `lib/supabase-schema.sql` 파일 내용 전체 복사 → 붙여넣기 → Run
5. 좌측 "Settings" → "API" → 아래 두 값 복사:
   - `Project URL` → NEXT_PUBLIC_SUPABASE_URL
   - `anon public` 키 → NEXT_PUBLIC_SUPABASE_ANON_KEY
   - `service_role` 키 → SUPABASE_SERVICE_ROLE_KEY

### 2단계: GitHub에 코드 올리기

1. [github.com](https://github.com) 로그인
2. 우측 상단 "+" → "New repository" → 이름: `mystory` → Create
3. zip 파일을 풀고, 모든 파일을 GitHub에 드래그앤드롭 업로드
   - 또는 git CLI: `git init && git add . && git commit -m "init" && git remote add origin ... && git push`

### 3단계: Vercel 배포

1. [vercel.com](https://vercel.com) → GitHub 계정으로 로그인
2. "Import Project" → GitHub의 `mystory` 저장소 선택
3. "Environment Variables" 에 아래 입력:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase에서 복사한 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `OPENAI_API_KEY` | sk-proj-... (본인 키) |
| `OPENAI_MODEL` | gpt-4 |

4. "Deploy" 클릭 → 2~3분 후 자동 배포 완료
5. 배포된 URL (예: `mystory-xxx.vercel.app`) 접속하여 확인

## 기술 스택

- Next.js 14 (App Router)
- TypeScript
- Supabase (PostgreSQL + Auth)
- OpenAI GPT-4
- Tailwind CSS
- Vercel (배포)
