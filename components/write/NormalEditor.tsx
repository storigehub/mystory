'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useBook, Chapter } from '@/lib/book-context';
import { TOKENS, FONT_SIZE_PRESETS } from '@/lib/design-tokens';
import { getHint } from '@/lib/interview-questions';
import { useWhisperSTT } from '@/lib/use-whisper-stt';

const uid = () => Math.random().toString(36).slice(2, 10);

function PhotoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 10a7 7 0 0014 0M12 18v4m-3 0h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface NormalEditorProps {
  chapter: Chapter;
  chapterIdx: number;
}

export default function NormalEditor({ chapter, chapterIdx }: NormalEditorProps) {
  const { state, setProse, addPhoto, removePhoto, updatePhotoCaption } = useBook();
  const [showGuide, setShowGuide] = useState(!chapter.prose?.length);
  const [isListening, setIsListening] = useState(false); // browser STT
  const [transcript, setTranscript] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const prevTranscriptRef = useRef('');
  const chapterIdxRef = useRef(chapterIdx);

  const fontPreset = FONT_SIZE_PRESETS[state.fontSize];
  const hint = getHint(chapter.tid);

  useEffect(() => {
    chapterIdxRef.current = chapterIdx;
  }, [chapterIdx]);

  // Auto-grow textarea on mount
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.max(350, ta.scrollHeight) + 'px';
    }
  }, [chapter.id]);

  // ── Whisper STT ──
  const onWhisperTranscribed = useCallback(
    (text: string) => {
      const current = chapter.prose || '';
      const sep = current && !current.endsWith('\n') ? '\n\n' : '';
      setProse(chapterIdxRef.current, current + sep + text);
      if (showGuide) setShowGuide(false);
      // 커서 이동
      setTimeout(() => {
        const ta = textareaRef.current;
        if (ta) {
          ta.focus();
          ta.selectionStart = ta.selectionEnd = ta.value.length;
          ta.style.height = 'auto';
          ta.style.height = Math.max(350, ta.scrollHeight) + 'px';
        }
      }, 50);
    },
    [chapter.prose, setProse, showGuide]
  );

  const whisper = useWhisperSTT(state.sttMode === 'whisper', onWhisperTranscribed);

  // 복합 활성 상태
  const isVoiceActive = isListening || whisper.isRecording || whisper.isTranscribing;

  // ── Browser STT 초기화 ──
  useEffect(() => {
    if (state.sttMode !== 'browser') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = 'ko-KR';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e: any) => {
      let final = '';
      let interim = '';
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      setTranscript(final + interim);
    };
    r.onerror = (e: any) => {
      if (e.error !== 'aborted') console.warn('STT:', e.error);
      setIsListening(false);
    };
    r.onend = () => {
      setIsListening(false);
    };
    recognitionRef.current = r;
    return () => { try { r.abort(); } catch {} };
  }, [state.sttMode]);

  // Browser STT: 녹음 종료 시 텍스트 추가
  useEffect(() => {
    if (!isListening && transcript && transcript !== prevTranscriptRef.current) {
      const text = transcript.trim();
      if (text) {
        const current = chapter.prose || '';
        const sep = current && !current.endsWith('\n') ? '\n\n' : '';
        setProse(chapterIdxRef.current, current + sep + text);
        if (showGuide) setShowGuide(false);
        setTimeout(() => {
          const ta = textareaRef.current;
          if (ta) {
            ta.focus();
            ta.selectionStart = ta.selectionEnd = ta.value.length;
          }
        }, 50);
      }
      prevTranscriptRef.current = transcript;
    }
  }, [isListening, transcript]);

  const toggleVoice = () => {
    if (state.sttMode === 'browser') {
      if (!recognitionRef.current) return;
      if (isListening) {
        try { recognitionRef.current.stop(); } catch {}
        setIsListening(false);
      } else {
        setTranscript('');
        prevTranscriptRef.current = '';
        try { recognitionRef.current.start(); setIsListening(true); } catch {}
      }
    } else if (state.sttMode === 'whisper') {
      whisper.toggleRecording();
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setProse(chapterIdxRef.current, e.target.value);
    if (showGuide) setShowGuide(false);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.max(350, ta.scrollHeight) + 'px';
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      addPhoto(chapterIdxRef.current, {
        id: uid(),
        data: ev.target?.result as string,
        caption: '',
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const toolBtnStyle = (active?: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 12px',
    border: `1px solid ${active ? '#FECACA' : TOKENS.border}`,
    borderRadius: TOKENS.radiusSm,
    background: active ? '#FEF2F2' : TOKENS.card,
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: TOKENS.sans,
    color: active ? '#991B1B' : TOKENS.subtext,
    minHeight: 40,
  });

  // 녹음 버튼 라벨
  const micLabel = whisper.isTranscribing
    ? '전사 중...'
    : isVoiceActive
      ? '중지'
      : '녹음';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: TOKENS.bg,
          borderBottom: `1px solid ${TOKENS.borderLight}`,
          flexShrink: 0,
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onFileSelect}
          style={{ display: 'none' }}
        />
        <button onClick={() => fileRef.current?.click()} style={toolBtnStyle()}>
          <PhotoIcon />
          <span>사진</span>
        </button>
        {state.sttMode !== 'off' && (
          <button
            onClick={toggleVoice}
            disabled={whisper.isTranscribing}
            style={toolBtnStyle(isVoiceActive)}
          >
            <MicIcon />
            <span>{micLabel}</span>
          </button>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans }}>
          {(chapter.prose || '').length}자
        </span>
        {!showGuide && (
          <button
            onClick={() => setShowGuide(true)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 12,
              color: TOKENS.muted,
              cursor: 'pointer',
              fontFamily: TOKENS.sans,
              padding: '6px 8px',
              minHeight: 36,
            }}
          >
            도움말
          </button>
        )}
      </div>

      {/* Recording indicator */}
      {isVoiceActive && (
        <div
          style={{
            padding: '10px 16px',
            background: whisper.isTranscribing ? '#EFF6FF' : '#FEF2F2',
            borderBottom: `1px solid ${whisper.isTranscribing ? '#BFDBFE' : '#FECACA'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontFamily: TOKENS.sans,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: whisper.isTranscribing ? '#3B82F6' : '#DC2626',
              animation: 'pulse 1s infinite',
            }}
          />
          <span style={{ fontSize: 13, color: whisper.isTranscribing ? '#1E40AF' : '#991B1B' }}>
            {whisper.isTranscribing
              ? '전사 중... 잠시만 기다려주세요.'
              : whisper.isRecording
                ? 'Whisper 녹음 중... (녹음 버튼을 누르면 중지)'
                : '음성 인식 중...'}
          </span>
          {isListening && transcript && (
            <span
              style={{
                fontSize: 12,
                color: TOKENS.subtext,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              "{transcript}"
            </span>
          )}
        </div>
      )}

      {/* Whisper error */}
      {whisper.error && (
        <div
          style={{
            padding: '8px 16px',
            background: '#FEF2F2',
            borderBottom: '1px solid #FECACA',
            fontSize: 12,
            color: '#DC2626',
            fontFamily: TOKENS.sans,
          }}
        >
          {whisper.error}
        </div>
      )}

      {/* Writing area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {/* Chapter header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <p
              style={{
                fontSize: 11,
                color: TOKENS.muted,
                fontFamily: TOKENS.sans,
                letterSpacing: 3,
                marginBottom: 6,
              }}
            >
              챕터
            </p>
            <h2 style={{ fontSize: 'clamp(1.2rem, 5vw, 1.4rem)', fontWeight: 400 }}>
              {chapter.title}
            </h2>
            <div
              style={{
                width: 32,
                height: 1,
                background: TOKENS.accent,
                margin: '12px auto 0',
                opacity: 0.6,
              }}
            />
          </div>

          {/* Guide hint */}
          {showGuide && (
            <div
              style={{
                background: TOKENS.accentBg,
                border: `1px solid ${TOKENS.accentBorder}`,
                borderRadius: 10,
                padding: '14px 16px',
                marginBottom: 20,
                position: 'relative',
              }}
            >
              <button
                onClick={() => setShowGuide(false)}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 10,
                  background: 'none',
                  border: 'none',
                  fontSize: 16,
                  color: TOKENS.muted,
                  cursor: 'pointer',
                  minWidth: 32,
                  minHeight: 32,
                }}
              >
                ×
              </button>
              <p
                style={{
                  fontSize: 14,
                  color: TOKENS.accent,
                  lineHeight: 1.8,
                  fontFamily: TOKENS.sans,
                  marginBottom: 8,
                }}
              >
                이 주제에 대한 기억과 이야기를 자유롭게 적어주세요.
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: TOKENS.subtext,
                  fontFamily: TOKENS.sans,
                  fontStyle: 'italic',
                }}
              >
                이렇게 시작해보세요: "{hint}"
              </p>
            </div>
          )}

          {/* Photos */}
          {(chapter.photos || []).map((photo) => (
            <div
              key={photo.id}
              style={{
                background: TOKENS.card,
                borderRadius: TOKENS.radiusSm,
                overflow: 'hidden',
                border: `1px solid ${TOKENS.borderLight}`,
                marginBottom: 16,
                boxShadow: TOKENS.shadowSm,
              }}
            >
              <div style={{ position: 'relative' }}>
                <img
                  src={photo.data}
                  alt=""
                  style={{ width: '100%', display: 'block', maxHeight: 280, objectFit: 'cover' }}
                />
                <button
                  onClick={() => removePhoto(chapterIdxRef.current, photo.id)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,.4)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                  }}
                >
                  ×
                </button>
              </div>
              <input
                value={photo.caption || ''}
                onChange={(e) => updatePhotoCaption(chapterIdxRef.current, photo.id, e.target.value)}
                placeholder="사진 설명..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: 'none',
                  borderTop: `1px solid ${TOKENS.borderLight}`,
                  fontSize: 14,
                  fontFamily: TOKENS.sans,
                  outline: 'none',
                  color: TOKENS.subtext,
                }}
              />
            </div>
          ))}

          {/* Main textarea */}
          <textarea
            ref={textareaRef}
            value={chapter.prose ?? ''}
            onChange={onChange}
            placeholder={hint}
            aria-label="이야기 작성"
            style={{
              width: '100%',
              minHeight: 350,
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: fontPreset.prose,
              lineHeight: fontPreset.lineHeight,
              color: TOKENS.text,
              fontFamily: TOKENS.serif,
              background: 'transparent',
              caretColor: TOKENS.accent,
            }}
          />
        </div>
      </div>
    </div>
  );
}
