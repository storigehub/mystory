'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useBook } from '@/lib/book-context';
import { TOKENS, FONT_SIZE_PRESETS } from '@/lib/design-tokens';
import ChatEditor from '@/components/write/ChatEditor';
import NormalEditor from '@/components/write/NormalEditor';
import { createBrowserClient } from '@/lib/supabase';

export default function WritePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { state, isSyncing, syncError, setChapterMode, setProse, setCurrentChapterIdx, markChapterDone, setFontSize, syncToDb, resetBook, setSTTMode, addMessage } = useBook();
  const [showSidebar, setShowSidebar] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [maxDurationSec, setMaxDurationSec] = useState(120);
  const [interviewerToast, setInterviewerToast] = useState<{ chapterTitle: string; text: string } | null>(null);

  // stale closure 방지용 ref
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  const addMessageRef = useRef(addMessage);
  useEffect(() => { addMessageRef.current = addMessage; }, [addMessage]);

  // 관리자 설정에서 STT 모드 로드
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.stt?.mode) setSTTMode(data.stt.mode);
        if (data.stt?.maxDurationSec) setMaxDurationSec(data.stt.maxDurationSec);
      })
      .catch(() => {}); // 실패 시 기본값 유지
  }, []);

  // ── Supabase Realtime: 인터뷰어 질문 실시간 수신 ──
  useEffect(() => {
    if (!state.bookId) return;

    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`interviewer-msgs-${state.bookId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: 'type=eq.interviewer' },
        (payload) => {
          const msg = payload.new as { id: string; chapter_id: string; text: string; sort_order: number };
          const chapters = stateRef.current.chapters;
          const chapterIdx = chapters.findIndex((ch) => ch.dbId === msg.chapter_id);
          if (chapterIdx === -1) return; // 이 책의 챕터가 아님

          addMessageRef.current(chapterIdx, {
            id: msg.id,
            type: 'assistant',
            source: 'interviewer',
            text: msg.text,
            timestamp: Date.now(),
          });

          // 현재 편집 중인 챕터가 아니면 토스트 알림
          const currentIdx = stateRef.current.currentChapterIdx;
          if (chapterIdx !== currentIdx) {
            setInterviewerToast({
              chapterTitle: chapters[chapterIdx].title,
              text: msg.text,
            });
            setTimeout(() => setInterviewerToast(null), 5000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.bookId]); // bookId가 바뀔 때만 재구독

  const currentChapter = state.chapters[state.currentChapterIdx];
  const doneCount = state.chapters.filter((c) => c.done).length;
  const progress = Math.round((doneCount / state.chapters.length) * 100) || 0;

  if (!currentChapter) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <p style={{ fontFamily: TOKENS.sans, color: TOKENS.muted }}>챕터 정보를 불러올 수 없습니다.</p>
        <button
          onClick={() => router.push('/toc')}
          style={{
            padding: '10px 20px',
            background: TOKENS.dark,
            color: '#fff',
            border: 'none',
            borderRadius: TOKENS.radiusSm,
            cursor: 'pointer',
            fontFamily: TOKENS.sans,
          }}
        >
          목차로 돌아가기
        </button>
      </div>
    );
  }

  const mode = currentChapter.mode || 'chat';

  // 모드 전환 핸들러 — 대화→일반 시 user 메시지를 prose로 자동 변환
  const handleSetMode = (newMode: 'chat' | 'normal') => {
    if (!currentChapter) return;
    if (newMode === 'normal' && !currentChapter.prose) {
      const userTexts = currentChapter.messages
        .filter((m) => m.type === 'user')
        .map((m) => m.text)
        .join('\n\n');
      if (userTexts) setProse(state.currentChapterIdx, userTexts);
    }
    setChapterMode(state.currentChapterIdx, newMode);
  };

  const handleFinish = () => {
    markChapterDone(state.currentChapterIdx);
    if (state.currentChapterIdx < state.chapters.length - 1) {
      setCurrentChapterIdx(state.currentChapterIdx + 1);
    } else {
      router.push('/book');
    }
    setShowFinish(false);
  };

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: mode === 'chat' ? TOKENS.warm : TOKENS.bg,
      }}
    >
      {/* 인터뷰어 질문 도착 토스트 */}
      {interviewerToast && (
        <div
          style={{
            position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
            zIndex: 500, maxWidth: 360, width: 'calc(100% - 32px)',
            background: '#7C3AED', color: '#fff',
            borderRadius: 12, padding: '12px 16px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}
        >
          <div style={{ fontSize: 11, opacity: 0.85, fontFamily: TOKENS.sans }}>
            인터뷰어 질문 도착 — {interviewerToast.chapterTitle}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5, fontFamily: TOKENS.serif }}>
            {interviewerToast.text.length > 60
              ? interviewerToast.text.slice(0, 60) + '…'
              : interviewerToast.text}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ flexShrink: 0, background: TOKENS.bg, borderBottom: `1px solid ${TOKENS.borderLight}` }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px 2px', gap: 6 }}>
          <button
            onClick={() => setShowSidebar(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: TOKENS.subtext,
              padding: 6,
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="목차 열기"
          >
            <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
              <path d="M1 1h18M1 8h18M1 15h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentChapter.title}
            </div>
            <div style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans }}>
              {String(state.currentChapterIdx + 1).padStart(2, '0')} / {String(state.chapters.length).padStart(2, '0')} · 전체 {progress}%
            </div>
          </div>

          <button
            onClick={() => setShowFinish(true)}
            style={{
              background: TOKENS.dark,
              color: '#FAFAF9',
              border: 'none',
              borderRadius: TOKENS.radiusSm,
              padding: '9px 16px',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: TOKENS.sans,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              minHeight: 40,
            }}
          >
            {state.currentChapterIdx < state.chapters.length - 1 ? '다음 장 →' : '완성하기'}
          </button>
        </div>

        {/* Mode tab */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 16px 10px' }}>
          <div style={{ display: 'flex', gap: 2, padding: 3, background: TOKENS.warm, borderRadius: 8, minWidth: 170 }}>
            {(['chat', 'normal'] as const).map((m) => {
              const isActive = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => handleSetMode(m)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer',
                    fontFamily: TOKENS.sans,
                    borderRadius: TOKENS.radiusSm,
                    background: isActive ? TOKENS.card : 'transparent',
                    color: isActive ? TOKENS.text : TOKENS.muted,
                    boxShadow: isActive ? TOKENS.shadowSm : 'none',
                    minHeight: 36,
                  }}
                >
                  {m === 'chat' ? '대화 모드' : '일반 모드'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Finish modal */}
      {showFinish && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,.3)',
            padding: 20,
          }}
        >
          <div
            style={{
              background: TOKENS.card,
              borderRadius: 12,
              padding: '28px 24px',
              maxWidth: 340,
              width: '100%',
              boxShadow: TOKENS.shadowLg,
              textAlign: 'center',
            }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 500, marginBottom: 8 }}>이 주제를 마칠까요?</h3>
            <p style={{ fontSize: 14, color: TOKENS.subtext, lineHeight: 1.7, marginBottom: 20, fontFamily: TOKENS.sans }}>
              "{currentChapter.title}" 작성을 마치고{' '}
              {state.currentChapterIdx < state.chapters.length - 1 ? '다음 주제로 넘어갑니다.' : '책을 완성합니다.'}
              <br />
              나중에 다시 돌아와 수정할 수 있습니다.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowFinish(false)}
                style={{
                  flex: 1, padding: 14, border: `1px solid ${TOKENS.border}`,
                  borderRadius: TOKENS.radiusSm, background: TOKENS.card,
                  fontSize: 14, fontFamily: TOKENS.sans, cursor: 'pointer', minHeight: 48,
                }}
              >
                더 작성하기
              </button>
              <button
                onClick={handleFinish}
                style={{
                  flex: 1, padding: 14, border: 'none',
                  borderRadius: TOKENS.radiusSm, background: TOKENS.dark, color: '#FAFAF9',
                  fontSize: 14, fontFamily: TOKENS.sans, fontWeight: 500, cursor: 'pointer', minHeight: 48,
                }}
              >
                {state.currentChapterIdx < state.chapters.length - 1 ? '다음 장으로' : '완성하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      {showSidebar && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}>
          <div
            style={{
              width: 'min(300px, 85vw)',
              background: TOKENS.card,
              height: '100%',
              boxShadow: '4px 0 24px rgba(0,0,0,.08)',
              padding: '24px 16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <label style={{ display: 'block', fontSize: 11, color: TOKENS.muted, marginBottom: 6, fontFamily: TOKENS.sans, letterSpacing: 2 }}>
              목차
            </label>
            <h3 style={{ fontSize: 16, fontWeight: 400, margin: '4px 0 6px' }}>전체 진행</h3>

            <div style={{ height: 6, background: TOKENS.borderLight, borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: TOKENS.accent, borderRadius: 3, transition: 'width .3s' }} />
            </div>
            <p style={{ fontSize: 12, color: TOKENS.muted, fontFamily: TOKENS.sans, marginBottom: 14 }}>
              {state.chapters.length}개 중 {doneCount}개 완료 ({progress}%)
            </p>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {state.chapters.map((ch, i) => (
                <button
                  key={ch.id}
                  onClick={() => { setCurrentChapterIdx(i); setShowSidebar(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '12px',
                    border: i === state.currentChapterIdx ? `1.5px solid ${TOKENS.dark}` : `1px solid ${TOKENS.borderLight}`,
                    borderRadius: TOKENS.radiusSm,
                    background: ch.done ? '#F0F9F0' : TOKENS.card,
                    cursor: 'pointer', marginBottom: 5, fontFamily: TOKENS.sans, fontSize: 14, textAlign: 'left', minHeight: 48,
                  }}
                >
                  <span style={{ fontSize: 11, color: TOKENS.muted, fontWeight: 600, minWidth: 20 }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ flex: 1, color: ch.done ? '#166534' : TOKENS.text }}>{ch.title}</span>
                  {ch.done && <span style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>완료</span>}
                </button>
              ))}
            </div>

            {/* Font size settings */}
            <div style={{ borderTop: `1px solid ${TOKENS.borderLight}`, paddingTop: 16, marginTop: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: TOKENS.muted, marginBottom: 6, fontFamily: TOKENS.sans, letterSpacing: 2 }}>
                글자 크기
              </label>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {Object.entries(FONT_SIZE_PRESETS).map(([key, preset]) => {
                  const isActive = state.fontSize === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setFontSize(key as 'normal' | 'large')}
                      style={{
                        flex: 1, padding: '10px 0',
                        border: `1.5px solid ${isActive ? TOKENS.dark : TOKENS.border}`,
                        borderRadius: TOKENS.radiusSm,
                        background: isActive ? TOKENS.dark : TOKENS.card,
                        color: isActive ? '#FAFAF9' : TOKENS.text,
                        cursor: 'pointer', fontFamily: TOKENS.sans, fontSize: 13, fontWeight: isActive ? 600 : 400,
                        minHeight: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                      }}
                    >
                      <span style={{ fontSize: key === 'large' ? 17 : 13, fontWeight: 600, lineHeight: 1 }}>가</span>
                      <span style={{ fontSize: 10, opacity: 0.7 }}>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 동기화 상태 */}
            <div
              style={{
                borderTop: `1px solid ${TOKENS.borderLight}`,
                paddingTop: 14,
                marginTop: 14,
              }}
            >
              {session ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: isSyncing ? '#F59E0B' : syncError ? '#EF4444' : '#22C55E',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 12, color: TOKENS.muted, fontFamily: TOKENS.sans }}>
                    {isSyncing ? '동기화 중...' : syncError ? '동기화 오류' : '저장됨'}
                  </span>
                  {!isSyncing && (
                    <button
                      onClick={syncToDb}
                      style={{
                        marginLeft: 'auto', background: 'none', border: 'none',
                        cursor: 'pointer', color: TOKENS.accent, fontSize: 12,
                        fontFamily: TOKENS.sans, padding: '2px 6px',
                      }}
                    >
                      수동 저장
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => signIn(undefined, { callbackUrl: '/write' })}
                  style={{
                    width: '100%', padding: '10px 0',
                    border: `1px solid ${TOKENS.accentBorder}`,
                    borderRadius: TOKENS.radiusSm, background: 'transparent',
                    color: TOKENS.accent, fontSize: 13,
                    fontFamily: TOKENS.sans, cursor: 'pointer',
                    marginBottom: 8, minHeight: 40,
                  }}
                >
                  ☁️ 로그인하고 클라우드 저장
                </button>
              )}
            </div>

            <button
              onClick={() => router.push('/book')}
              style={{
                width: '100%', padding: 14, background: TOKENS.dark, color: '#FAFAF9',
                border: 'none', borderRadius: TOKENS.radiusSm, marginTop: 6,
                cursor: 'pointer', fontFamily: TOKENS.sans, fontWeight: 500, fontSize: 14, minHeight: 48,
              }}
            >
              책 미리보기
            </button>

            {/* 로그인 시: 내 정보 + 로그아웃 */}
            {session && (
              <div style={{ borderTop: `1px solid ${TOKENS.borderLight}`, paddingTop: 12, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={() => { setShowSidebar(false); router.push('/my'); }}
                  style={{
                    width: '100%', padding: '12px 0',
                    border: `1px solid ${TOKENS.border}`,
                    borderRadius: TOKENS.radiusSm,
                    background: TOKENS.card,
                    color: TOKENS.text,
                    fontSize: 14, fontFamily: TOKENS.sans, cursor: 'pointer', minHeight: 48,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  👤 {session.user?.name || '내 정보'}
                </button>
                <button
                  onClick={async () => {
                    resetBook();
                    await signOut({ callbackUrl: '/' });
                  }}
                  style={{
                    width: '100%', padding: '12px 0',
                    border: 'none',
                    borderRadius: TOKENS.radiusSm,
                    background: '#f5ede3',
                    color: '#8c7a6a',
                    fontSize: 14, fontFamily: TOKENS.sans, cursor: 'pointer', minHeight: 48,
                  }}
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
          <div onClick={() => setShowSidebar(false)} style={{ flex: 1, background: 'rgba(0,0,0,.25)' }} />
        </div>
      )}

      {/* Main editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {mode === 'chat' ? (
          <ChatEditor chapter={currentChapter} chapterIdx={state.currentChapterIdx} maxDurationSec={maxDurationSec} />
        ) : (
          <NormalEditor chapter={currentChapter} chapterIdx={state.currentChapterIdx} maxDurationSec={maxDurationSec} />
        )}
      </div>
    </div>
  );
}
