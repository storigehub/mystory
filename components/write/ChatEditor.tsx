'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useBook, Chapter, Message } from '@/lib/book-context';
import { TOKENS, FONT_SIZE_PRESETS } from '@/lib/design-tokens';
import { getQuestions, REACTIONS, DEEP_FOLLOW, pick } from '@/lib/interview-questions';
import { useWhisperSTT } from '@/lib/use-whisper-stt';

const uid = () => Math.random().toString(36).slice(2, 10);

function AIIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

function PhotoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: TOKENS.dark,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          flexShrink: 0,
        }}
      >
        <AIIcon />
      </div>
      <div
        style={{
          background: TOKENS.card,
          borderRadius: '3px 16px 16px 16px',
          padding: '12px 18px',
          boxShadow: TOKENS.shadowSm,
        }}
      >
        <div style={{ display: 'flex', gap: 5, height: 18, alignItems: 'center' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: TOKENS.muted,
                animation: `dot 1.2s ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ChatEditorProps {
  chapter: Chapter;
  chapterIdx: number;
  maxDurationSec?: number;
}

export default function ChatEditor({ chapter, chapterIdx, maxDurationSec = 120 }: ChatEditorProps) {
  const { state, addMessage, setProse, setChapterMode, markChapterDone } = useBook();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [deepMode, setDeepMode] = useState(false);
  const [isListening, setIsListening] = useState(false); // browser STT
  const [transcript, setTranscript] = useState('');
  const [autoSendEnabled] = useState(state.autoSendAudio);
  const [isAssembling, setIsAssembling] = useState(false);
  const [assembleError, setAssembleError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  const questionIndexRef = useRef(chapter.messages.filter((m) => m.type === 'user').length);
  const isTypingRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const inputBeforeSTT = useRef('');
  const prevListeningRef = useRef(false);
  const sendFnRef = useRef<(() => void) | null>(null);

  const fontPreset = FONT_SIZE_PRESETS[state.fontSize];

  // ── Whisper STT ──
  const onWhisperTranscribed = useCallback(
    (text: string) => {
      setInput(text);
      if (autoSendEnabled) {
        // input state가 반영된 뒤(다음 렌더)에 auto-send
        setTimeout(() => sendFnRef.current?.(), 300);
      }
    },
    [autoSendEnabled]
  );

  const whisper = useWhisperSTT(state.sttMode === 'whisper', onWhisperTranscribed, maxDurationSec);

  // 복합 활성 상태 (UI용)
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
    r.onend = () => setIsListening(false);
    recognitionRef.current = r;
    return () => {
      try { r.abort(); } catch {}
    };
  }, [state.sttMode]);

  // Browser STT: transcript → input 동기화
  useEffect(() => {
    if (isListening && transcript) {
      const before = inputBeforeSTT.current;
      const sep = before && !before.endsWith(' ') ? ' ' : '';
      setInput(before + sep + transcript);
    }
  }, [transcript, isListening]);

  // Browser STT: 녹음 시작 시점 input 저장
  useEffect(() => {
    if (isListening && !prevListeningRef.current) {
      inputBeforeSTT.current = input;
    }
    prevListeningRef.current = isListening;
  }, [isListening]);

  // Browser STT: 녹음 종료 시 auto-send
  useEffect(() => {
    if (prevListeningRef.current && !isListening && autoSendEnabled) {
      setTimeout(() => sendFnRef.current?.(), 200);
    }
  }, [isListening, autoSendEnabled]);

  // ── 최초 AI 인사말 ──
  useEffect(() => {
    if (chapter.messages.length === 0) {
      questionIndexRef.current = 0;
      setIsTyping(true);
      isTypingRef.current = true;
      const timer = setTimeout(() => {
        const questions = getQuestions(chapter.tid);
        addMessage(chapterIdx, {
          id: uid(),
          type: 'assistant',
          text: `안녕하세요. "${chapter.title}" 이야기를 들려주세요.\n\n${questions[0]}`,
          timestamp: Date.now(),
        });
        questionIndexRef.current = 1;
        setIsTyping(false);
        isTypingRef.current = false;
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [chapter.id]);

  // Auto scroll
  useEffect(() => {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [chapter.messages.length, isTyping]);

  const callAI = useCallback(
    async (userText: string, isDeep: boolean): Promise<string> => {
      try {
        const messages = chapter.messages.map((m) => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.text,
        }));
        messages.push({ role: 'user', content: userText });

        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            topicTitle: chapter.title,
            topicId: chapter.tid,
          }),
        });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        return data.text || '이야기를 계속해주세요.';
      } catch (e) {
        console.warn('AI API failed, using fallback:', e);
        const questions = getQuestions(chapter.tid);
        if (isDeep) {
          return `${pick(REACTIONS)}\n\n${pick(DEEP_FOLLOW)}`;
        }
        const qIdx = questionIndexRef.current;
        const nextQ = qIdx < questions.length ? questions[qIdx] : questions[questions.length - 1];
        return `${pick(REACTIONS)}\n\n${nextQ}`;
      }
    },
    [chapter]
  );

  // ── 이야기 완성하기 (산문 변환) ──
  const handleAssemble = useCallback(async () => {
    if (isAssembling) return;
    setIsAssembling(true);
    setAssembleError(null);

    try {
      const res = await fetch('/api/ai/assemble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chapter.messages,
          chapterTitle: chapter.title,
          userName: state.author || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '산문 변환 실패');
      }

      // 산문 저장 후 normal 모드로 전환
      setProse(chapterIdx, data.prose);
      setChapterMode(chapterIdx, 'normal');
    } catch (err: any) {
      setAssembleError(err.message || '이야기 완성에 실패했습니다.');
    } finally {
      setIsAssembling(false);
    }
  }, [isAssembling, chapter, state.author, chapterIdx, setProse, setChapterMode]);

  const send = useCallback(() => {
    if (isTypingRef.current) return;
    if (isListening) {
      try { recognitionRef.current?.stop(); } catch {}
      setIsListening(false);
    }
    const text = input.trim();
    if (!text) return;

    addMessage(chapterIdx, { id: uid(), type: 'user', text, timestamp: Date.now() });
    setInput('');
    inputBeforeSTT.current = '';
    setIsTyping(true);
    isTypingRef.current = true;

    const isDeep = deepMode;
    if (!isDeep) questionIndexRef.current += 1;
    setDeepMode(false);

    callAI(text, isDeep).then((aiText) => {
      addMessage(chapterIdx, { id: uid(), type: 'assistant', text: aiText, timestamp: Date.now() });
      setIsTyping(false);
      isTypingRef.current = false;
    });
  }, [input, isListening, deepMode, chapterIdx, addMessage, callAI]);

  sendFnRef.current = send;

  // ── 마이크 버튼 ──
  const toggleVoice = () => {
    if (state.sttMode === 'browser') {
      if (!recognitionRef.current) return;
      if (isListening) {
        try { recognitionRef.current.stop(); } catch {}
        setIsListening(false);
      } else {
        setTranscript('');
        try { recognitionRef.current.start(); setIsListening(true); } catch {}
      }
    } else if (state.sttMode === 'whisper') {
      whisper.toggleRecording();
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      addMessage(chapterIdx, {
        id: uid(),
        type: 'photo',
        text: ev.target?.result as string,
        timestamp: Date.now(),
      });
      setIsTyping(true);
      isTypingRef.current = true;
      setTimeout(() => {
        addMessage(chapterIdx, {
          id: uid(),
          type: 'assistant',
          text: '소중한 사진이네요.\n\n이 사진은 언제, 어디서 찍은 건가요?',
          timestamp: Date.now(),
        });
        setIsTyping(false);
        isTypingRef.current = false;
      }, 1200);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing || composingRef.current) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const questions = getQuestions(chapter.tid);
  const userMsgCount = chapter.messages.filter((m) => m.type === 'user').length;
  const answeredQ = Math.min(userMsgCount, questions.length);

  // 녹음 상태 표시 텍스트
  const voiceStatusText = whisper.isTranscribing
    ? '전사 중...'
    : whisper.isRecording
      ? '녹음 중... (클릭하면 중지)'
      : '음성 인식 중...';

  return (
    <>
      {/* Message list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          overscrollBehavior: 'contain',
        }}
      >
        {/* Question progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 4px 8px' }}>
          <span style={{ fontSize: 12, color: TOKENS.muted, fontFamily: TOKENS.sans, whiteSpace: 'nowrap' }}>
            질문 {answeredQ}/{questions.length}
          </span>
          <div
            style={{
              flex: 1,
              height: 4,
              background: TOKENS.borderLight,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min((answeredQ / questions.length) * 100, 100)}%`,
                background: TOKENS.accent,
                borderRadius: 2,
                transition: 'width .3s',
              }}
            />
          </div>
        </div>

        {/* Messages */}
        {chapter.messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.type === 'user' || msg.type === 'photo' ? 'flex-end' : 'flex-start',
              animation: 'fadeIn .3s ease',
            }}
          >
            {msg.type === 'assistant' && (
              <div style={{ display: 'flex', gap: 8, maxWidth: '85%' }}>
                <div
                  title={msg.source === 'interviewer' ? '인터뷰어 질문' : 'AI 질문'}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: msg.source === 'interviewer' ? '#7C3AED' : TOKENS.dark,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, color: '#fff',
                  }}
                >
                  {msg.source === 'interviewer' ? <PersonIcon /> : <AIIcon />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {msg.source === 'interviewer' && (
                    <span style={{ fontSize: 10, color: '#7C3AED', fontFamily: TOKENS.sans, letterSpacing: 1 }}>
                      인터뷰어
                    </span>
                  )}
                  <div
                    style={{
                      background: msg.source === 'interviewer' ? '#F5F3FF' : TOKENS.card,
                      borderRadius: '3px 16px 16px 16px',
                      padding: '12px 14px',
                      fontSize: fontPreset.chat,
                      lineHeight: 1.8,
                      boxShadow: TOKENS.shadowSm,
                      whiteSpace: 'pre-wrap',
                      border: msg.source === 'interviewer' ? '1px solid #DDD6FE' : 'none',
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            )}

            {msg.type === 'user' && (
              <div
                style={{
                  background: TOKENS.dark,
                  borderRadius: '16px 3px 16px 16px',
                  padding: '12px 14px',
                  maxWidth: '80%',
                  fontSize: fontPreset.chat,
                  lineHeight: 1.8,
                  whiteSpace: 'pre-wrap',
                  color: '#FAFAF9',
                }}
              >
                {msg.text}
              </div>
            )}

            {msg.type === 'photo' && (
              <div
                style={{
                  borderRadius: '16px 3px 16px 16px',
                  overflow: 'hidden',
                  maxWidth: '70%',
                  boxShadow: TOKENS.shadowLg,
                }}
              >
                <img src={msg.text} alt="첨부 사진" style={{ width: '100%', display: 'block' }} />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && <TypingIndicator />}

        <div ref={endRef} />
      </div>

      {/* "More" + "이야기 완성하기" buttons */}
      {!isTyping && userMsgCount > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            padding: '6px 12px',
            borderTop: `1px solid ${TOKENS.borderLight}`,
            background: TOKENS.bg,
            flexShrink: 0,
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => setDeepMode(true)}
            style={{
              padding: '8px 16px',
              border: `1px solid ${deepMode ? TOKENS.accent : TOKENS.border}`,
              borderRadius: 20,
              background: deepMode ? TOKENS.accentBg : TOKENS.card,
              color: deepMode ? TOKENS.accent : TOKENS.subtext,
              fontSize: 13,
              fontFamily: TOKENS.sans,
              cursor: 'pointer',
              minHeight: 36,
            }}
          >
            {deepMode ? '추가 이야기 입력 중...' : '이 질문에 더 이야기하기'}
          </button>

          {/* 이야기 완성하기 버튼 (3개 이상 답변 시 활성화) */}
          {userMsgCount >= 3 && (
            <button
              onClick={handleAssemble}
              disabled={isAssembling}
              style={{
                padding: '8px 16px',
                border: `1px solid ${TOKENS.dark}`,
                borderRadius: 20,
                background: isAssembling ? TOKENS.borderLight : TOKENS.dark,
                color: isAssembling ? TOKENS.muted : '#FAFAF9',
                fontSize: 13,
                fontFamily: TOKENS.sans,
                cursor: isAssembling ? 'wait' : 'pointer',
                minHeight: 36,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {isAssembling ? (
                <>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                  이야기 정리 중...
                </>
              ) : (
                '✍️ 이야기 완성하기'
              )}
            </button>
          )}
        </div>
      )}

      {/* Assemble error */}
      {assembleError && (
        <div
          style={{
            padding: '8px 16px',
            background: '#FEF2F2',
            borderTop: '1px solid #FECACA',
            fontSize: 12,
            color: '#DC2626',
            fontFamily: TOKENS.sans,
            flexShrink: 0,
          }}
        >
          {assembleError}
        </div>
      )}

      {/* Voice status indicator */}
      {isVoiceActive && (
        <div
          style={{
            padding: '10px 16px',
            background: whisper.isTranscribing ? '#EFF6FF' : '#FEF2F2',
            borderTop: `1px solid ${whisper.isTranscribing ? '#BFDBFE' : '#FECACA'}`,
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
            {voiceStatusText}
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
            borderTop: '1px solid #FECACA',
            fontSize: 12,
            color: '#DC2626',
            fontFamily: TOKENS.sans,
            flexShrink: 0,
          }}
        >
          {whisper.error}
        </div>
      )}

      {/* Input area */}
      <div
        className="sa-b"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 6,
          padding: '8px 10px 12px',
          background: TOKENS.bg,
          borderTop: `1px solid ${TOKENS.borderLight}`,
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

        {/* Photo button */}
        <button
          onClick={() => fileRef.current?.click()}
          aria-label="사진 첨부"
          style={{
            width: 44,
            height: 44,
            border: `1px solid ${TOKENS.border}`,
            borderRadius: '50%',
            background: TOKENS.card,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: TOKENS.subtext,
            flexShrink: 0,
          }}
        >
          <PhotoIcon />
        </button>

        {/* Mic button */}
        {state.sttMode !== 'off' && (
          <button
            onClick={toggleVoice}
            aria-label="음성 녹음"
            disabled={whisper.isTranscribing}
            style={{
              width: 44,
              height: 44,
              border: `1px solid ${isVoiceActive ? '#FECACA' : TOKENS.border}`,
              borderRadius: '50%',
              background: isVoiceActive ? '#FEF2F2' : TOKENS.card,
              cursor: whisper.isTranscribing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isVoiceActive ? '#DC2626' : TOKENS.subtext,
              flexShrink: 0,
            }}
          >
            <MicIcon />
          </button>
        )}

        {/* Text input */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { composingRef.current = true; }}
          onCompositionEnd={() => { setTimeout(() => { composingRef.current = false; }, 50); }}
          placeholder="이야기를 들려주세요..."
          aria-label="답변 입력"
          rows={1}
          style={{
            flex: 1,
            padding: '11px 14px',
            border: `1px solid ${TOKENS.border}`,
            borderRadius: 20,
            fontSize: Math.max(16, fontPreset.input),
            fontFamily: TOKENS.serif,
            resize: 'none',
            outline: 'none',
            lineHeight: 1.5,
            maxHeight: 120,
            minHeight: 44,
            background: TOKENS.card,
          }}
        />

        {/* Send button */}
        <button
          onClick={send}
          disabled={!input.trim() || isTyping}
          aria-label="전송"
          style={{
            width: 44,
            height: 44,
            border: 'none',
            borderRadius: '50%',
            background: input.trim() && !isTyping ? TOKENS.dark : '#D6D3D1',
            color: '#fff',
            cursor: input.trim() && !isTyping ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <SendIcon />
        </button>
      </div>
    </>
  );
}
