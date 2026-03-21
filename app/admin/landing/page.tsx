'use client';

import { useState, useCallback, useRef } from 'react';

/* ── 타입 ── */
interface CardConfig {
  image: string;
  tag: string;
  title: string;
  desc: string;
}

interface HeroConfig {
  image: string;
  title: string;
  accentWord: string;
  subtitle: string;
  quote: string;
  quoteAuthor: string;
}

interface LandingConfig {
  hero: HeroConfig;
  pillars: CardConfig[];
  scenarios: CardConfig[];
}

/* ── 기본값 (현재 하드코딩된 값) ── */
const DEFAULT_CONFIG: LandingConfig = {
  hero: {
    image: 'https://images.pexels.com/photos/7363991/pexels-photo-7363991.jpeg?auto=compress&cs=tinysrgb&w=1200',
    title: '당신의 삶이\n한 권의 책이\n됩니다',
    accentWord: '한 권의 책',
    subtitle: '소중한 기억을 AI와의 대화로 이야기하세요.\n그 이야기가 가족과 함께할 책이 됩니다.',
    quote: '내 이야기를 글로 남길 수 있을 거라\n생각도 못 했는데, 정말 신기하네요.',
    quoteAuthor: '— 김순자 님 (78세), 인천',
  },
  pillars: [
    { image: 'https://images.pexels.com/photos/5637842/pexels-photo-5637842.jpeg?auto=compress&cs=tinysrgb&w=900', tag: '쉬운 대화', title: '말하듯 편하게,\nAI가 이끌어갑니다', desc: '글쓰기 실력은 필요 없습니다. AI가 질문하면 말씀하시듯 편하게 대답하기만 하면 됩니다.' },
    { image: 'https://images.pexels.com/photos/7626581/pexels-photo-7626581.jpeg?auto=compress&cs=tinysrgb&w=900', tag: '아름다운 책', title: '이야기가 한 권의\n책이 됩니다', desc: '나누신 이야기가 아름답게 정리되어 언제든 다시 읽을 수 있는 책으로 완성됩니다.' },
    { image: 'https://images.pexels.com/photos/6691742/pexels-photo-6691742.jpeg?auto=compress&cs=tinysrgb&w=900', tag: '가족과 공유', title: '소중한 이야기를\n가족과 나눕니다', desc: '링크 하나로 가족 모두가 읽을 수 있습니다. 멀리 사는 가족과도 함께 만들어갈 수 있어요.' },
  ],
  scenarios: [
    { image: 'https://images.pexels.com/photos/5637710/pexels-photo-5637710.jpeg?auto=compress&cs=tinysrgb&w=1200', tag: '선물', title: '부모님께 드리는\n가장 특별한 선물', desc: '평생의 이야기를 한 권의 책으로.\n자녀가 드릴 수 있는 가장 따뜻한 선물입니다.' },
    { image: 'https://images.pexels.com/photos/8055130/pexels-photo-8055130.jpeg?auto=compress&cs=tinysrgb&w=800', tag: '유산', title: '자녀에게 남기는\n소중한 이야기', desc: '내 삶의 지혜와 기억을 다음 세대에게.\n말로만 전하던 이야기를 영원히 남깁니다.' },
    { image: 'https://images.pexels.com/photos/5729053/pexels-photo-5729053.jpeg?auto=compress&cs=tinysrgb&w=800', tag: '기억', title: '잊고 싶지 않은\n소중한 순간들', desc: '결혼, 육아, 여행의 기억들.\n함께한 시간이 책이 되어 영원히 남습니다.' },
    { image: 'https://images.pexels.com/photos/5637704/pexels-photo-5637704.jpeg?auto=compress&cs=tinysrgb&w=800', tag: '역사', title: '우리 가족의\n역사를 기록합니다', desc: '뿌리와 이야기, 가족만의 문화까지.\n아름다운 책으로 대대로 전해집니다.' },
    { image: 'https://images.pexels.com/photos/5637738/pexels-photo-5637738.jpeg?auto=compress&cs=tinysrgb&w=800', tag: '성찰', title: '나를 돌아보는\n소중한 시간', desc: '바쁘게 살아온 나의 삶을 조용히 돌아보며\n인생의 의미와 지혜를 글로 남깁니다.' },
  ],
};

/* ── 스타일 상수 ── */
const S = {
  page: { fontFamily: "'Noto Sans KR', system-ui, sans-serif", background: '#F7F5F3', minHeight: '100dvh', color: '#1A1816' } as React.CSSProperties,
  container: { maxWidth: 900, margin: '0 auto', padding: '24px 20px 80px' } as React.CSSProperties,
  heading: { fontSize: 22, fontWeight: 600, marginBottom: 8 } as React.CSSProperties,
  section: { background: '#FFF', borderRadius: 16, padding: '28px 24px', marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' } as React.CSSProperties,
  sectionTitle: { fontSize: 16, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: '#A0522D' } as React.CSSProperties,
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#8B7B6B', marginBottom: 6, letterSpacing: 0.5 } as React.CSSProperties,
  input: { width: '100%', padding: '10px 14px', border: '1px solid #E0D8D0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: "'Noto Sans KR', system-ui" } as React.CSSProperties,
  textarea: { width: '100%', padding: '10px 14px', border: '1px solid #E0D8D0', borderRadius: 10, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: "'Noto Sans KR', system-ui", boxSizing: 'border-box', minHeight: 72 } as React.CSSProperties,
  btn: { padding: '12px 28px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Noto Sans KR', system-ui" } as React.CSSProperties,
  imgPreview: { width: 120, height: 80, objectFit: 'cover', borderRadius: 10, border: '1px solid #E0D8D0', flexShrink: 0 } as React.CSSProperties,
  cardEditor: { border: '1px solid #EDE8E2', borderRadius: 14, padding: '20px 18px', marginBottom: 14, background: '#FAFAF8' } as React.CSSProperties,
  uploadBtn: { padding: '8px 16px', borderRadius: 8, border: '1px solid #A0522D', background: '#FFF', color: '#A0522D', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' } as React.CSSProperties,
};

/* ── 이미지 업로드 훅 ── */
function useImageUpload(onUrl: (url: string) => void) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/photo', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || '업로드 실패');
      onUrl(json.url);
    } catch (err) {
      alert(err instanceof Error ? err.message : '업로드 실패');
    } finally {
      setUploading(false);
    }
  }, [onUrl]);

  return { fileRef, uploading, handleFile };
}

/* ── 카드 편집기 컴포넌트 ── */
function CardEditor({ card, index, label, onChange }: {
  card: CardConfig;
  index: number;
  label: string;
  onChange: (idx: number, field: keyof CardConfig, value: string) => void;
}) {
  const onUrl = useCallback((url: string) => onChange(index, 'image', url), [index, onChange]);
  const { fileRef, uploading, handleFile } = useImageUpload(onUrl);

  return (
    <div style={S.cardEditor}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: '#5A4A3A' }}>
        {label} #{index + 1} — {card.tag || '(태그 없음)'}
      </div>

      {/* 이미지 */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
        {card.image && (
          <img src={card.image} alt="" style={S.imgPreview} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        )}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={S.label}>이미지 URL</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{ ...S.input, flex: 1 }}
              value={card.image}
              onChange={(e) => onChange(index, 'image', e.target.value)}
              placeholder="https://..."
            />
            <button
              style={S.uploadBtn}
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? '...' : '업로드'}
            </button>
            <input
              ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
        </div>
      </div>

      {/* 텍스트 필드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px 12px', alignItems: 'start' }}>
        <label style={{ ...S.label, marginBottom: 0, paddingTop: 10 }}>태그</label>
        <input style={S.input} value={card.tag} onChange={(e) => onChange(index, 'tag', e.target.value)} />
        <label style={{ ...S.label, marginBottom: 0, paddingTop: 10 }}>제목</label>
        <textarea style={{ ...S.textarea as React.CSSProperties, minHeight: 56 }} value={card.title} onChange={(e) => onChange(index, 'title', e.target.value)} placeholder="줄바꿈은 Enter로" />
        <label style={{ ...S.label, marginBottom: 0, paddingTop: 10 }}>설명</label>
        <textarea style={S.textarea as React.CSSProperties} value={card.desc} onChange={(e) => onChange(index, 'desc', e.target.value)} />
      </div>
    </div>
  );
}

/* ── 메인 페이지 ── */
export default function AdminLandingPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [config, setConfig] = useState<LandingConfig>(structuredClone(DEFAULT_CONFIG));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [loaded, setLoaded] = useState(false);
  const pwRef = useRef(password);
  pwRef.current = password;

  /* ── 로그인 + 기존 설정 로드 ── */
  const handleLogin = async () => {
    try {
      const res = await fetch('/api/admin/landing', {
        headers: { 'x-admin-password': password },
      });
      if (!res.ok) { setMessage('비밀번호가 틀립니다'); return; }
      const json = await res.json();
      setAuthenticated(true);
      setMessage('');
      if (json.config) {
        // 기존 설정 병합 (없는 필드는 기본값 유지)
        setConfig(prev => ({
          hero: { ...prev.hero, ...json.config.hero },
          pillars: json.config.pillars?.length ? json.config.pillars : prev.pillars,
          scenarios: json.config.scenarios?.length ? json.config.scenarios : prev.scenarios,
        }));
      }
      setLoaded(true);
    } catch {
      setMessage('서버 오류');
    }
  };

  /* ── 저장 ── */
  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/landing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': pwRef.current,
        },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error('저장 실패');
      setMessage('저장 완료!');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  /* ── 초기화 ── */
  const handleReset = () => {
    if (confirm('모든 설정을 기본값으로 되돌립니까?')) {
      setConfig(structuredClone(DEFAULT_CONFIG));
      setMessage('기본값으로 초기화됨 (저장하려면 저장 버튼을 누르세요)');
    }
  };

  /* ── 히어로 필드 변경 ── */
  const setHeroField = (field: keyof HeroConfig, value: string) => {
    setConfig(prev => ({ ...prev, hero: { ...prev.hero, [field]: value } }));
  };

  /* ── 카드 필드 변경 ── */
  const setPillarField = useCallback((idx: number, field: keyof CardConfig, value: string) => {
    setConfig(prev => {
      const next = [...prev.pillars];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, pillars: next };
    });
  }, []);

  const setScenarioField = useCallback((idx: number, field: keyof CardConfig, value: string) => {
    setConfig(prev => {
      const next = [...prev.scenarios];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, scenarios: next };
    });
  }, []);

  /* ── 히어로 이미지 업로드 ── */
  const heroOnUrl = useCallback((url: string) => setHeroField('image', url), []);
  const heroUpload = useImageUpload(heroOnUrl);

  /* ── 로그인 화면 ── */
  if (!authenticated) {
    return (
      <div style={S.page}>
        <div style={{ ...S.container, maxWidth: 400, paddingTop: 120 }}>
          <h1 style={{ ...S.heading, textAlign: 'center', marginBottom: 32 }}>랜딩 페이지 관리</h1>
          <div style={S.section}>
            <label style={S.label}>관리자 비밀번호</label>
            <input
              type="password" style={S.input} value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="비밀번호를 입력하세요"
              autoFocus
            />
            <button
              style={{ ...S.btn, width: '100%', marginTop: 14, background: '#1A1816', color: '#FFF' }}
              onClick={handleLogin}
            >로그인</button>
            {message && <p style={{ color: '#C53030', fontSize: 13, marginTop: 10, textAlign: 'center' }}>{message}</p>}
          </div>
          <p style={{ textAlign: 'center', marginTop: 14 }}>
            <a href="/admin" style={{ fontSize: 13, color: '#8B7B6B' }}>← 관리자 대시보드</a>
          </p>
        </div>
      </div>
    );
  }

  /* ── 관리 화면 ── */
  return (
    <div style={S.page}>
      <div style={S.container}>
        {/* 상단 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={S.heading}>랜딩 페이지 관리</h1>
            <p style={{ fontSize: 13, color: '#8B7B6B' }}>히어로, WHY, FOR WHOM 섹션의 이미지와 문구를 편집합니다</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {message && (
              <span style={{
                fontSize: 13, fontWeight: 500,
                color: message.includes('완료') || message.includes('초기화') ? '#38A169' : '#C53030',
              }}>{message}</span>
            )}
            <button style={{ ...S.btn, background: '#FFF', color: '#8B7B6B', border: '1px solid #E0D8D0' }} onClick={handleReset}>
              초기화
            </button>
            <button style={{ ...S.btn, background: '#A0522D', color: '#FFF' }} onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </div>

        <p style={{ marginBottom: 24 }}>
          <a href="/admin" style={{ fontSize: 13, color: '#A0522D', textDecoration: 'underline' }}>← 관리자 대시보드</a>
        </p>

        {/* ━━━━ 히어로 섹션 ━━━━ */}
        <div style={S.section}>
          <div style={S.sectionTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="8" cy="8" r="2"/><path d="m21 15-5-5L5 21"/></svg>
            히어로 섹션
          </div>

          {/* 히어로 이미지 */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
            {config.hero.image && (
              <img src={config.hero.image} alt="" style={{ ...S.imgPreview, width: 180, height: 120 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <div style={{ flex: 1 }}>
              <label style={S.label}>히어로 이미지 URL</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...S.input, flex: 1 }} value={config.hero.image} onChange={(e) => setHeroField('image', e.target.value)} placeholder="https://..." />
                <button style={S.uploadBtn} onClick={() => heroUpload.fileRef.current?.click()} disabled={heroUpload.uploading}>
                  {heroUpload.uploading ? '...' : '업로드'}
                </button>
                <input ref={heroUpload.fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && heroUpload.handleFile(e.target.files[0])} />
              </div>
            </div>
          </div>

          {/* 히어로 텍스트 */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px 14px', alignItems: 'start' }}>
            <label style={{ ...S.label, marginBottom: 0, paddingTop: 10 }}>메인 타이틀</label>
            <textarea style={{ ...S.textarea as React.CSSProperties, minHeight: 70 }} value={config.hero.title} onChange={(e) => setHeroField('title', e.target.value)} placeholder="당신의 삶이&#10;한 권의 책이&#10;됩니다" />

            <label style={{ ...S.label, marginBottom: 0, paddingTop: 10 }}>강조 문구</label>
            <div>
              <input style={S.input} value={config.hero.accentWord} onChange={(e) => setHeroField('accentWord', e.target.value)} placeholder="한 권의 책" />
              <p style={{ fontSize: 11, color: '#9C8F85', marginTop: 4 }}>타이틀 중 이 문구가 시에나 색상으로 강조됩니다</p>
            </div>

            <label style={{ ...S.label, marginBottom: 0, paddingTop: 10 }}>부제</label>
            <textarea style={S.textarea as React.CSSProperties} value={config.hero.subtitle} onChange={(e) => setHeroField('subtitle', e.target.value)} />

            <label style={{ ...S.label, marginBottom: 0, paddingTop: 10 }}>인용구</label>
            <textarea style={S.textarea as React.CSSProperties} value={config.hero.quote} onChange={(e) => setHeroField('quote', e.target.value)} />

            <label style={{ ...S.label, marginBottom: 0, paddingTop: 10 }}>인용구 출처</label>
            <input style={S.input} value={config.hero.quoteAuthor} onChange={(e) => setHeroField('quoteAuthor', e.target.value)} />
          </div>
        </div>

        {/* ━━━━ WHY MYSTORY 섹션 ━━━━ */}
        <div style={S.section}>
          <div style={S.sectionTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
            WHY MYSTORY — 포토 카드 (3장)
          </div>
          {config.pillars.map((p, i) => (
            <CardEditor key={i} card={p} index={i} label="WHY 카드" onChange={setPillarField} />
          ))}
        </div>

        {/* ━━━━ FOR WHOM 섹션 ━━━━ */}
        <div style={S.section}>
          <div style={S.sectionTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            FOR WHOM — 대상 카드 (5장)
          </div>
          {config.scenarios.map((s, i) => (
            <CardEditor key={i} card={s} index={i} label="대상 카드" onChange={setScenarioField} />
          ))}
        </div>

        {/* 하단 저장 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
          <button style={{ ...S.btn, background: '#A0522D', color: '#FFF' }} onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
