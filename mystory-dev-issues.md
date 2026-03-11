# 나의이야기 — 개발 이슈: 관리자 STT 설정 API

## 이슈 개요

| 항목 | 내용 |
|------|------|
| **이슈 ID** | MYSTORY-DEV-001 |
| **유형** | 기능 개발 (Feature) |
| **우선순위** | Medium |
| **예상 공수** | 3~5일 |
| **선행 조건** | Next.js 환경 구축, DB 스키마 확정 |
| **현재 상태** | 대기 (Backlog) |

---

## 배경

현재 프로토타입에서 STT(음성→텍스트) 모드를 프론트엔드 상태값(`useState`)으로 관리하고 있음.
이 방식은 개발/테스트에는 충분하지만, 실서비스에서는 다음 한계가 있음:

- 사용자가 새로고침하면 설정이 초기화됨
- 관리자가 전체 서비스의 STT 모드를 일괄 변경할 수 없음
- Whisper API 키를 안전하게 관리할 수 없음 (프론트엔드 노출 위험)

---

## 현재 구현 (방법 1 — 프론트엔드)

```
┌─────────────────────────────────┐
│  App (useState: sttMode)        │
│  ├─ "browser" → Web Speech API  │
│  ├─ "whisper" → 비활성 (추후)   │
│  └─ "off"     → 녹음 버튼 숨김  │
│                                 │
│  사이드바 → VOICE INPUT 설정 UI │
└─────────────────────────────────┘
```

- 설정 위치: 글쓰기 화면 사이드바(≡) > VOICE INPUT 섹션
- 저장: React 상태 (휘발성)
- 적용 범위: 해당 세션의 현재 사용자만

---

## 목표 구현 (방법 2 — 백엔드 관리자 API)

### 아키텍처

```
┌──────────────────┐     ┌─────────────────────────┐
│  관리자 대시보드  │────▶│  POST /api/admin/settings│
│  (STT 모드 선택) │     │  GET  /api/admin/settings│
└──────────────────┘     └────────┬────────────────┘
                                  │
                        ┌─────────▼─────────┐
                        │  DB / settings.json │
                        │  { sttMode, ... }   │
                        └─────────┬─────────┘
                                  │
┌──────────────────┐     ┌────────▼────────────────┐
│  사용자 클라이언트 │◀───│  GET /api/settings       │
│  (자동 반영)      │     │  (공개 설정 조회)        │
└──────────────────┘     └─────────────────────────┘
```

### API 엔드포인트

#### 1. `GET /api/settings` (공개)
사용자 클라이언트가 서비스 설정을 조회합니다.

```json
// Response
{
  "stt": {
    "mode": "browser",          // "browser" | "whisper" | "off"
    "whisperModel": "whisper-1", // whisper 모드일 때만 유효
    "language": "ko"
  },
  "ui": {
    "allowUserOverride": true    // 사용자가 개별적으로 모드 변경 가능 여부
  }
}
```

#### 2. `GET /api/admin/settings` (인증 필요)
관리자가 전체 설정을 조회합니다.

```json
// Response
{
  "stt": {
    "mode": "browser",
    "whisperApiKey": "sk-****...****",  // 마스킹 처리
    "whisperModel": "whisper-1",
    "language": "ko",
    "maxDurationSec": 120
  },
  "ui": {
    "allowUserOverride": true,
    "defaultFontScale": "normal"
  }
}
```

#### 3. `POST /api/admin/settings` (인증 필요)
관리자가 설정을 변경합니다.

```json
// Request Body
{
  "stt": {
    "mode": "whisper",
    "whisperApiKey": "sk-proj-abc123...",
    "language": "ko"
  }
}
```

```json
// Response
{ "success": true, "updated": ["stt.mode", "stt.whisperApiKey"] }
```

### DB 스키마 (PostgreSQL 예시)

```sql
CREATE TABLE service_settings (
  id          SERIAL PRIMARY KEY,
  category    VARCHAR(50) NOT NULL,       -- 'stt', 'ui', 'general'
  key         VARCHAR(100) NOT NULL,      -- 'mode', 'whisperApiKey' 등
  value       TEXT NOT NULL,
  encrypted   BOOLEAN DEFAULT false,      -- API 키 등 암호화 여부
  updated_at  TIMESTAMP DEFAULT now(),
  updated_by  VARCHAR(100),               -- 관리자 식별
  UNIQUE(category, key)
);
```

대안으로 소규모 서비스에서는 `settings.json` 파일로도 충분:

```json
// /config/settings.json
{
  "stt": { "mode": "browser", "whisperApiKey": "", "language": "ko" },
  "ui": { "allowUserOverride": true, "defaultFontScale": "normal" }
}
```

### 프론트엔드 연동

```typescript
// hooks/useServiceSettings.ts
export function useServiceSettings() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(setSettings)
      .catch(() => {
        // 기본값 폴백
        setSettings({ stt: { mode: "browser" }, ui: { allowUserOverride: true } });
      });
  }, []);

  return settings;
}
```

```typescript
// App에서 사용
const settings = useServiceSettings();
const sttMode = settings?.stt?.mode || "browser";
// allowUserOverride가 false면 사이드바 설정 UI 숨김
```

### 관리자 대시보드 UI (간략)

```
┌─────────────────────────────────────────────────┐
│  ⚙ 서비스 설정                                  │
│                                                  │
│  ─── 음성 인식 (STT) ───                        │
│  ○ 브라우저 내장 (무료)                          │
│  ○ Whisper AI (고정밀)                           │
│    └ API Key: [sk-proj-*****] [변경]             │
│    └ 최대 녹음: [120]초                          │
│  ○ 사용 안 함                                    │
│                                                  │
│  □ 사용자가 개별 변경 허용                       │
│                                                  │
│  ─── 글자 크기 ───                               │
│  기본 모드: [일반 ▾]                             │
│                                                  │
│  [저장]                                          │
└─────────────────────────────────────────────────┘
```

---

## 세부 작업 (Task Breakdown)

| # | 작업 | 예상 | 비고 |
|---|------|------|------|
| 1 | DB 스키마 or settings.json 구조 확정 | 0.5일 | 소규모→JSON, 확장→DB |
| 2 | `GET /api/settings` 구현 | 0.5일 | 캐싱 적용 권장 |
| 3 | `GET/POST /api/admin/settings` 구현 | 1일 | 인증 미들웨어 포함 |
| 4 | API 키 암호화 저장/복호화 로직 | 0.5일 | AES-256 or 환경변수 |
| 5 | 관리자 대시보드 UI | 1일 | /admin/settings 페이지 |
| 6 | 프론트엔드 `useServiceSettings` 연동 | 0.5일 | 폴백 로직 포함 |
| 7 | Whisper API 프록시 구현 | 1일 | `/api/stt/whisper` 엔드포인트 |

---

## Whisper 모드 연동 시 추가 구현

Whisper 모드를 활성화하려면 백엔드 프록시가 필요합니다:

```
[브라우저 녹음] → MediaRecorder (webm/wav)
     ↓
[POST /api/stt/whisper] → body: FormData(audio file)
     ↓
[백엔드] → OpenAI Whisper API 호출 (API 키는 서버에만 보관)
     ↓
[Response] → { text: "인식된 텍스트..." }
```

```typescript
// /api/stt/whisper/route.ts
export async function POST(req: NextRequest) {
  const settings = await getSettings();
  if (settings.stt.mode !== 'whisper') {
    return NextResponse.json({ error: 'Whisper mode is disabled' }, { status: 403 });
  }

  const formData = await req.formData();
  const audio = formData.get('audio') as File;

  const whisperForm = new FormData();
  whisperForm.append('file', audio);
  whisperForm.append('model', settings.stt.whisperModel || 'whisper-1');
  whisperForm.append('language', settings.stt.language || 'ko');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${decrypt(settings.stt.whisperApiKey)}` },
    body: whisperForm,
  });

  const data = await res.json();
  return NextResponse.json({ text: data.text });
}
```

---

## 관련 파일

| 파일 | 설명 |
|------|------|
| `mystory-app.jsx` | 현재 프로토타입 (방법1 구현 완료) |
| `mystory-source.tar.gz` | 백엔드 소스 (agent, flow-engine 등) |

---

## 비고

- **방법 1 (현재)**: 프로토타입/데모에 충분. Web Speech API는 Chrome 33+, Safari 14.1+에서 지원
- **방법 2 (이 이슈)**: 실서비스 배포 시 필수. 관리자가 UI에서 설정 변경, Whisper API 키 안전 보관
- Web Speech API의 한국어 인식 품질은 Chrome에서 양호, Safari에서도 사용 가능하나 정확도 차이 있음
- 어르신 사용자 특성상 음성 입력이 핵심 기능이므로 STT 품질 모니터링 체계도 함께 고려 필요
