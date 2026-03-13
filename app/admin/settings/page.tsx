'use client';

import { useState, useEffect } from 'react';
import { TOKENS } from '@/lib/design-tokens';

interface AdminSettings {
  stt: {
    mode: 'browser' | 'whisper' | 'off';
    whisperApiKey: string;
    whisperModel: string;
    language: string;
    maxDurationSec: number;
  };
  ui: {
    allowUserOverride: boolean;
    defaultFontScale: 'normal' | 'large';
  };
}

export default function AdminSettingsPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const fetchSettings = async (pw: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { 'x-admin-password': pw },
      });
      if (!res.ok) {
        setAuthError('비밀번호가 올바르지 않습니다');
        return;
      }
      const data = await res.json();
      setSettings(data);
      setAuthed(true);
      setAuthError('');
    } catch {
      setAuthError('서버 오류');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSettings(password);
  };

  const handleSave = async () => {
    if (!settings) return;
    setLoading(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaveMsg('저장되었습니다 ✓');
        setTimeout(() => setSaveMsg(''), 3000);
      } else {
        setSaveMsg('저장 실패');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: '10px 12px',
    border: `1px solid ${TOKENS.border}`,
    borderRadius: TOKENS.radiusSm,
    fontFamily: TOKENS.sans,
    fontSize: 14,
    background: TOKENS.card,
    color: TOKENS.text,
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontFamily: TOKENS.sans,
    color: TOKENS.muted,
    letterSpacing: 2,
    display: 'block',
    marginBottom: 6,
  };

  if (!authed) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: TOKENS.bg,
        }}
      >
        <div
          style={{
            background: TOKENS.card,
            border: `1px solid ${TOKENS.borderLight}`,
            borderRadius: 12,
            padding: '32px 28px',
            width: '100%',
            maxWidth: 360,
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4, fontFamily: TOKENS.serif }}>
            관리자 설정
          </h1>
          <p style={{ fontSize: 13, color: TOKENS.muted, fontFamily: TOKENS.sans, marginBottom: 24 }}>
            관리자 비밀번호를 입력하세요 (ADMIN_PASSWORD 환경변수)
          </p>
          <form onSubmit={handleLogin}>
            <label style={labelStyle}>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginBottom: 12 }}
              autoFocus
            />
            {authError && (
              <p style={{ color: '#c0392b', fontSize: 13, fontFamily: TOKENS.sans, marginBottom: 8 }}>
                {authError}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !password}
              style={{
                width: '100%',
                padding: '12px 0',
                background: TOKENS.dark,
                color: '#FAFAF9',
                border: 'none',
                borderRadius: TOKENS.radiusSm,
                fontSize: 14,
                fontFamily: TOKENS.sans,
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? '확인 중…' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: TOKENS.bg,
        padding: '2rem 1.25rem',
      }}
    >
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 400, fontFamily: TOKENS.serif }}>⚙ 서비스 설정</h1>
          <a
            href="/"
            style={{ fontSize: 13, color: TOKENS.muted, fontFamily: TOKENS.sans, marginLeft: 'auto' }}
          >
            ← 홈으로
          </a>
        </div>

        {/* STT Section */}
        <section
          style={{
            background: TOKENS.card,
            border: `1px solid ${TOKENS.borderLight}`,
            borderRadius: 12,
            padding: '24px 20px',
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: 13, letterSpacing: 2, color: TOKENS.muted, fontFamily: TOKENS.sans, marginBottom: 20 }}>
            음성 인식 (STT)
          </h2>

          {(['browser', 'whisper', 'off'] as const).map((mode) => (
            <label
              key={mode}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                marginBottom: 12,
                cursor: 'pointer',
                fontFamily: TOKENS.sans,
              }}
            >
              <input
                type="radio"
                name="sttMode"
                value={mode}
                checked={settings.stt.mode === mode}
                onChange={() => setSettings({ ...settings, stt: { ...settings.stt, mode } })}
                style={{ marginTop: 2 }}
              />
              <div>
                <div style={{ fontSize: 14, color: TOKENS.text }}>
                  {mode === 'browser' && '브라우저 내장 (무료, Web Speech API)'}
                  {mode === 'whisper' && 'Whisper AI (고정밀, OpenAI)'}
                  {mode === 'off' && '사용 안 함'}
                </div>
                {mode === 'whisper' && settings.stt.mode === 'whisper' && (
                  <div style={{ marginTop: 10 }}>
                    <label style={{ ...labelStyle, marginBottom: 4 }}>Whisper API Key</label>
                    <input
                      type="password"
                      value={settings.stt.whisperApiKey}
                      onChange={(e) =>
                        setSettings({ ...settings, stt: { ...settings.stt, whisperApiKey: e.target.value } })
                      }
                      placeholder="sk-proj-... (변경 시에만 입력)"
                      style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginBottom: 8 }}
                    />
                    <label style={{ ...labelStyle, marginBottom: 4 }}>최대 녹음 시간 (초)</label>
                    <input
                      type="number"
                      value={settings.stt.maxDurationSec}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          stt: { ...settings.stt, maxDurationSec: Number(e.target.value) },
                        })
                      }
                      style={{ ...inputStyle, width: 100 }}
                      min={10}
                      max={600}
                    />
                  </div>
                )}
              </div>
            </label>
          ))}
        </section>

        {/* UI Section */}
        <section
          style={{
            background: TOKENS.card,
            border: `1px solid ${TOKENS.borderLight}`,
            borderRadius: 12,
            padding: '24px 20px',
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 13, letterSpacing: 2, color: TOKENS.muted, fontFamily: TOKENS.sans, marginBottom: 20 }}>
            UI 설정
          </h2>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              fontFamily: TOKENS.sans,
              fontSize: 14,
              marginBottom: 16,
            }}
          >
            <input
              type="checkbox"
              checked={settings.ui.allowUserOverride}
              onChange={(e) =>
                setSettings({ ...settings, ui: { ...settings.ui, allowUserOverride: e.target.checked } })
              }
            />
            사용자가 음성 인식 모드를 개별적으로 변경할 수 있도록 허용
          </label>

          <div>
            <label style={labelStyle}>기본 글자 크기</label>
            <select
              value={settings.ui.defaultFontScale}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  ui: { ...settings.ui, defaultFontScale: e.target.value as 'normal' | 'large' },
                })
              }
              style={{ ...inputStyle }}
            >
              <option value="normal">일반</option>
              <option value="large">확대</option>
            </select>
          </div>
        </section>

        {/* Save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              padding: '14px 32px',
              background: TOKENS.dark,
              color: '#FAFAF9',
              border: 'none',
              borderRadius: TOKENS.radiusSm,
              fontSize: 14,
              fontFamily: TOKENS.sans,
              cursor: loading ? 'wait' : 'pointer',
              fontWeight: 500,
            }}
          >
            {loading ? '저장 중…' : '저장'}
          </button>
          {saveMsg && (
            <span style={{ fontSize: 14, color: saveMsg.includes('✓') ? '#27ae60' : '#c0392b', fontFamily: TOKENS.sans }}>
              {saveMsg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
