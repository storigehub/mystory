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
      <div style={{ flexShrink: 0, background: '#FAFAF8', borderBottom: `1px solid ${TOKENS.borderLight}` }}>
        {/* 상단 진행 바 */}
        <div style={{ height: 2, background: TOKENS.borderLight }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: `linear-gradient(90deg, ${TOKENS.accent}, #C9A96E)`,
            transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px 4px', gap: 8 }}>
          <button
            onClick={() => setShowSidebar(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: TOKENS.subtext, padding: 6, minWidth: 44, minHeight: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, transition: 'background 0.15s',
            }}
            aria-label="목차 열기"
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = TOKENS.warm; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
              <path d="M1 1h16M1 7h16M1 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 15, fontFamily: TOKENS.serif, fontWeight: 400,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              letterSpacing: '-0.01em', color: TOKENS.text,
            }}>
              {currentChapter.title}
            </div>
            <div style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, marginTop: 1 }}>
              {String(state.currentChapterIdx + 1).padStart(2, '0')} / {String(state.chapters.length).padStart(2, '0')}
              <span style={{ margin: '0 5px', opacity: 0.4 }}>·</span>
              {progress}% 완료
            </div>
          </div>

          <button
            onClick={() => setShowFinish(true)}
            style={{
              background: TOKENS.dark, color: '#FAFAF9', border: 'none',
              borderRadius: 40, padding: '9px 18px', fontSize: 13,
              cursor: 'pointer', fontFamily: TOKENS.sans, fontWeight: 500,
              whiteSpace: 'nowrap', flexShrink: 0,
              boxShadow: '0 2px 10px rgba(26,24,22,0.15)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
          >
            {state.currentChapterIdx < state.chapters.length - 1 ? '다음 장 →' : '완성하기'}
          </button>
        </div>

        {/* Mode 탭 */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 16px 10px' }}>
          <div style={{
            display: 'flex', gap: 2, padding: 3,
            background: TOKENS.warm, borderRadius: 10,
            border: `1px solid ${TOKENS.borderLight}`,
          }}>
            {(['chat', 'normal'] as const).map((m) => {
              const isActive = mode === m;
              return (
                <button key={m} onClick={() => handleSetMode(m)} style={{
                  padding: '8px 20px', border: 'none', fontSize: 13,
                  fontWeight: isActive ? 500 : 400, cursor: 'pointer',
                  fontFamily: TOKENS.sans, borderRadius: 8,
                  background: isActive ? '#FFF' : 'transparent',
                  color: isActive ? TOKENS.text : TOKENS.muted,
                  boxShadow: isActive ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
                  minHeight: 34, transition: 'all 0.18s',
                }}>
                  {m === 'chat' ? '대화 모드' : '일반 모드'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Finish modal */}
      {showFinish && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          background: 'rgba(26,24,22,0.5)', backdropFilter: 'blur(4px)',
        }} onClick={(e) => { if (e.target === e.currentTarget) setShowFinish(false); }}>
          <div style={{
            background: '#FFF', borderRadius: '20px 20px 0 0',
            padding: '32px 28px max(32px, env(safe-area-inset-bottom))',
            width: '100%', maxWidth: 480,
            boxShadow: '0 -8px 40px rgba(0,0,0,0.12)',
            animation: 'fadeUp 0.3s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <div style={{ width: 36, height: 3, background: TOKENS.border, borderRadius: 2, margin: '0 auto 28px' }} />
            <h3 style={{
              fontFamily: TOKENS.serif, fontSize: 20, fontWeight: 300,
              marginBottom: 10, letterSpacing: '-0.025em', color: TOKENS.text,
            }}>이 주제를 마칠까요?</h3>
            <p style={{ fontSize: 14, color: TOKENS.subtext, lineHeight: 1.75, marginBottom: 24, fontFamily: TOKENS.sans, wordBreak: 'keep-all' }}>
              "{currentChapter.title}" 작성을 마치고{' '}
              {state.currentChapterIdx < state.chapters.length - 1 ? '다음 주제로 넘어갑니다.' : '책을 완성합니다.'}<br />
              나중에 다시 돌아와 수정할 수 있습니다.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowFinish(false)} style={{
                flex: 1, padding: '14px 0', border: `1px solid ${TOKENS.border}`,
                borderRadius: 12, background: TOKENS.warm, fontSize: 14,
                fontFamily: TOKENS.sans, cursor: 'pointer', color: TOKENS.subtext,
              }}>더 작성하기</button>
              <button onClick={handleFinish} style={{
                flex: 1, padding: '14px 0', border: 'none', borderRadius: 12,
                background: TOKENS.dark, color: '#FAFAF9', fontSize: 14,
                fontFamily: TOKENS.sans, fontWeight: 500, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(26,24,22,0.2)',
              }}>
                {state.currentChapterIdx < state.chapters.length - 1 ? '다음 장으로' : '완성하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      {showSidebar && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}>
          <div style={{
            width: 'min(300px, 85vw)', background: '#FAFAF8',
            height: '100%', boxShadow: '6px 0 32px rgba(0,0,0,0.1)',
            padding: '0', overflowY: 'auto', display: 'flex', flexDirection: 'column',
            borderRight: `1px solid ${TOKENS.borderLight}`,
          }}>
            {/* 사이드바 헤더 */}
            <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${TOKENS.borderLight}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <p style={{ fontSize: 9, letterSpacing: 3, color: TOKENS.accent, textTransform: 'uppercase', fontFamily: TOKENS.sans, fontWeight: 600 }}>
                  Table of Contents
                </p>
                <button onClick={() => setShowSidebar(false)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: TOKENS.muted, fontSize: 18, lineHeight: 1, padding: '2px 4px',
                }}>×</button>
              </div>
              {/* 진행률 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: TOKENS.muted, fontFamily: TOKENS.sans }}>전체 진행</span>
                <span style={{ fontSize: 12, color: TOKENS.accent, fontFamily: TOKENS.sans, fontWeight: 500 }}>
                  {doneCount}/{state.chapters.length} 완료
                </span>
              </div>
              <div style={{ height: 4, background: TOKENS.borderLight, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${progress}%`,
                  background: `linear-gradient(90deg, ${TOKENS.accent}, #C9A96E)`,
                  borderRadius: 4, transition: 'width 0.5s ease',
                }} />
              </div>
            </div>

            {/* 챕터 목록 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
              {state.chapters.map((ch, i) => (
                <button key={ch.id} onClick={() => { setCurrentChapterIdx(i); setShowSidebar(false); }} style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  padding: '11px 12px',
                  border: i === state.currentChapterIdx
                    ? `1.5px solid ${TOKENS.accent}`
                    : `1px solid transparent`,
                  borderRadius: 10,
                  background: i === state.currentChapterIdx
                    ? '#FBF7F2'
                    : ch.done ? '#F7FDF7' : 'transparent',
                  cursor: 'pointer', marginBottom: 3, fontFamily: TOKENS.sans,
                  fontSize: 13.5, textAlign: 'left', minHeight: 44,
                  transition: 'background 0.15s, border-color 0.15s',
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, minWidth: 22,
                    color: i === state.currentChapterIdx ? TOKENS.accent : TOKENS.muted,
                    fontFamily: TOKENS.sans,
                  }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ flex: 1, color: ch.done ? '#2d7a3a' : TOKENS.text, lineHeight: 1.4 }}>{ch.title}</span>
                  {ch.done && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6" fill="#e8f5e9"/>
                      <path d="M4 7l2 2 4-4" stroke="#2d7a3a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* 글자 크기 */}
            <div style={{ padding: '14px 20px', borderTop: `1px solid ${TOKENS.borderLight}` }}>
              <p style={{ fontSize: 9, letterSpacing: 2.5, color: TOKENS.muted, textTransform: 'uppercase', fontFamily: TOKENS.sans, marginBottom: 10 }}>글자 크기</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {Object.entries(FONT_SIZE_PRESETS).map(([key, preset]) => {
                  const isActive = state.fontSize === key;
                  return (
                    <button key={key} onClick={() => setFontSize(key as 'normal' | 'large')} style={{
                      flex: 1, padding: '10px 0',
                      border: `1.5px solid ${isActive ? TOKENS.accent : TOKENS.border}`,
                      borderRadius: 10,
                      background: isActive ? '#FBF7F2' : '#FFF',
                      color: isActive ? TOKENS.accent : TOKENS.subtext,
                      cursor: 'pointer', fontFamily: TOKENS.sans, fontSize: 12,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                      transition: 'all 0.15s',
                    }}>
                      <span style={{ fontSize: key === 'large' ? 18 : 14, fontWeight: 500, lineHeight: 1 }}>가</span>
                      <span style={{ fontSize: 10 }}>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 동기화 + 액션 */}
            <div style={{ padding: '14px 20px 20px', borderTop: `1px solid ${TOKENS.borderLight}` }}>
              {session ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: isSyncing ? '#F59E0B' : syncError ? '#EF4444' : '#22C55E',
                  }} />
                  <span style={{ fontSize: 12, color: TOKENS.muted, fontFamily: TOKENS.sans }}>
                    {isSyncing ? '동기화 중…' : syncError ? '동기화 오류' : '저장됨'}
                  </span>
                  {!isSyncing && (
                    <button onClick={syncToDb} style={{
                      marginLeft: 'auto', background: 'none', border: 'none',
                      cursor: 'pointer', color: TOKENS.accent, fontSize: 12,
                      fontFamily: TOKENS.sans, padding: '2px 6px',
                    }}>수동 저장</button>
                  )}
                </div>
              ) : (
                <button onClick={() => signIn(undefined, { callbackUrl: '/write' })} style={{
                  width: '100%', padding: '11px 0', marginBottom: 10,
                  border: `1px solid ${TOKENS.accentBorder}`, borderRadius: 10,
                  background: '#FBF7F2', color: TOKENS.accent, fontSize: 13,
                  fontFamily: TOKENS.sans, cursor: 'pointer',
                }}>클라우드 저장을 위해 로그인</button>
              )}

              <button onClick={() => router.push('/book')} style={{
                width: '100%', padding: '13px 0', background: TOKENS.dark, color: '#FAFAF9',
                border: 'none', borderRadius: 10, cursor: 'pointer',
                fontFamily: TOKENS.sans, fontWeight: 500, fontSize: 14,
                boxShadow: '0 3px 12px rgba(26,24,22,0.18)', marginBottom: 8,
              }}>책 미리보기</button>

              {session && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setShowSidebar(false); router.push('/my'); }} style={{
                    flex: 1, padding: '11px 0',
                    border: `1px solid ${TOKENS.border}`, borderRadius: 10,
                    background: '#FFF', color: TOKENS.text, fontSize: 13,
                    fontFamily: TOKENS.sans, cursor: 'pointer',
                  }}>{session.user?.name?.split(' ')[0] || '내 책'}</button>
                  <button onClick={async () => { resetBook(); await signOut({ callbackUrl: '/' }); }} style={{
                    flex: 1, padding: '11px 0',
                    border: 'none', borderRadius: 10,
                    background: TOKENS.warm, color: TOKENS.muted, fontSize: 13,
                    fontFamily: TOKENS.sans, cursor: 'pointer',
                  }}>로그아웃</button>
                </div>
              )}
            </div>
          </div>
          <div onClick={() => setShowSidebar(false)} style={{ flex: 1, background: 'rgba(26,24,22,0.3)', backdropFilter: 'blur(2px)' }} />
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
