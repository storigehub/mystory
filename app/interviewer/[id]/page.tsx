'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { TOKENS } from '@/lib/design-tokens';
import { createBrowserClient } from '@/lib/supabase';

interface Message { id: string; type: string; text: string; sort_order: number; }
interface Chapter { id: string; title: string; sort_order: number; mode: string; messages: Message[]; }
interface Book { id: string; title: string; author: string; }

function PersonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function AIBadge() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function InterviewerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const bookId = params.id as string;
  const token = searchParams.get('token') ?? '';

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sent, setSent] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composingRef = useRef(false);

  /* 데이터 로드 */
  const load = () => {
    if (!token) { setError('토큰이 없습니다'); setLoading(false); return; }
    fetch(`/api/shared/${bookId}?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setBook(data.book);
        const sorted: Chapter[] = (data.chapters || [])
          .sort((a: Chapter, b: Chapter) => a.sort_order - b.sort_order);
        setChapters(sorted);
        if (sorted.length > 0 && !activeChapterId) setActiveChapterId(sorted[0].id);
      })
      .catch(() => setError('불러오는 중 오류가 발생했습니다'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [bookId, token]); // eslint-disable-line

  // ── Supabase Realtime: 저자 답변 실시간 수신 ──
  const chaptersRef = useRef<Chapter[]>([]);
  useEffect(() => { chaptersRef.current = chapters; }, [chapters]);

  useEffect(() => {
    if (!bookId || !token) return;

    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`interviewer-view-${bookId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { id: string; chapter_id: string; type: string; text: string; sort_order: number };
          // 인터뷰어 본인이 추가한 메시지는 이미 로컬에 반영되어 있음
          if (msg.type === 'interviewer') return;
          // 이 책의 챕터에 속한 메시지인지 확인
          const chapterExists = chaptersRef.current.some((c) => c.id === msg.chapter_id);
          if (!chapterExists) return;

          setChapters((prev) =>
            prev.map((c) =>
              c.id === msg.chapter_id
                ? { ...c, messages: [...c.messages, { id: msg.id, type: msg.type, text: msg.text, sort_order: msg.sort_order }] }
                : c
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bookId, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChapterId, chapters]);

  const activeChapter = chapters.find((c) => c.id === activeChapterId) ?? null;

  const sendQuestion = async () => {
    if (!question.trim() || !activeChapterId) return;
    setSending(true);
    setSendError('');
    try {
      const res = await fetch(`/api/interviewer/${bookId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, chapterId: activeChapterId, question: question.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '전송 실패');

      // 로컬 상태 즉시 반영
      const newMsg: Message = {
        id: Math.random().toString(36).slice(2),
        type: 'interviewer',
        text: question.trim(),
        sort_order: 9999,
      };
      setChapters((prev) =>
        prev.map((c) =>
          c.id === activeChapterId ? { ...c, messages: [...c.messages, newMsg] } : c
        )
      );
      setSent((prev) => ({ ...prev, [activeChapterId]: true }));
      setQuestion('');
      setTimeout(() => setSent((prev) => ({ ...prev, [activeChapterId]: false })), 3000);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : '전송 실패');
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TOKENS.sans, color: TOKENS.muted }}>
      불러오는 중…
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: TOKENS.sans }}>
      <p style={{ color: TOKENS.text }}>{error === '비공개 책입니다' || error === '유효하지 않은 토큰입니다' ? '유효하지 않은 링크입니다' : '책을 불러올 수 없습니다'}</p>
      <a href="/" style={{ fontSize: 13, color: TOKENS.muted, textDecoration: 'underline' }}>홈으로</a>
    </div>
  );

  return (
    <div style={{ minHeight: '100dvh', background: TOKENS.bg, fontFamily: TOKENS.serif, color: TOKENS.text, display: 'flex', flexDirection: 'column' }}>

      {/* ── 헤더 ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(250,250,248,0.97)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${TOKENS.borderLight}`,
        padding: '0 16px', height: 56,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
          <PersonIcon />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em' }}>인터뷰어 모드</div>
          <div style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans }}>
            {book?.title || '나의 이야기'} · {book?.author}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: '#7C3AED', fontFamily: TOKENS.sans, background: '#F5F3FF', padding: '4px 10px', borderRadius: 20, border: '1px solid #DDD6FE' }}>
          실시간 연결 중
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── 챕터 사이드바 ── */}
        <div style={{
          width: 200, flexShrink: 0,
          borderRight: `1px solid ${TOKENS.borderLight}`,
          background: TOKENS.card,
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '16px 16px 8px', fontSize: 10, color: TOKENS.muted, fontFamily: TOKENS.sans, letterSpacing: 3 }}>챕터 목록</div>
          {chapters.map((ch, i) => {
            const interviewerCount = ch.messages.filter((m) => m.type === 'interviewer').length;
            const isActive = ch.id === activeChapterId;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChapterId(ch.id)}
                style={{
                  width: '100%', padding: '12px 16px',
                  background: isActive ? '#F5F3FF' : 'transparent',
                  border: 'none',
                  borderLeft: isActive ? '3px solid #7C3AED' : '3px solid transparent',
                  textAlign: 'left', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: 3,
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: isActive ? '#7C3AED' : TOKENS.muted, fontFamily: TOKENS.sans, minWidth: 18 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ fontSize: 13, color: TOKENS.text, fontFamily: TOKENS.serif, lineHeight: 1.3, fontWeight: isActive ? 500 : 400 }}>
                    {ch.title}
                  </span>
                </div>
                {interviewerCount > 0 && (
                  <span style={{ fontSize: 10, color: '#7C3AED', fontFamily: TOKENS.sans, marginLeft: 24 }}>
                    질문 {interviewerCount}개 ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── 대화 뷰 ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {activeChapter ? (
            <>
              {/* 챕터 제목 */}
              <div style={{ padding: '14px 20px 10px', borderBottom: `1px solid ${TOKENS.borderLight}`, background: TOKENS.card }}>
                <p style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, letterSpacing: 2, margin: '0 0 2px' }}>현재 챕터</p>
                <h2 style={{ fontSize: 16, fontWeight: 500, margin: 0, letterSpacing: '-0.02em' }}>{activeChapter.title}</h2>
              </div>

              {/* 메시지 목록 */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                {activeChapter.messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: TOKENS.muted, fontFamily: TOKENS.sans, fontSize: 13 }}>
                    아직 대화가 없습니다.<br />아래에서 첫 질문을 남겨보세요.
                  </div>
                ) : (
                  activeChapter.messages
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((msg) => {
                      const isUser = msg.type === 'user';
                      const isInterviewer = msg.type === 'interviewer';
                      const isAI = msg.type === 'ai' || msg.type === 'assistant';

                      return (
                        <div key={msg.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: 8 }}>
                          {/* 질문 (AI / 인터뷰어) */}
                          {!isUser && (
                            <div style={{ display: 'flex', gap: 8, maxWidth: '80%' }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                background: isInterviewer ? '#7C3AED' : TOKENS.dark,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                              }}>
                                {isInterviewer ? <PersonIcon /> : <AIBadge />}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: 10, color: isInterviewer ? '#7C3AED' : TOKENS.muted, fontFamily: TOKENS.sans }}>
                                  {isInterviewer ? '인터뷰어' : 'AI'}
                                </span>
                                <div style={{
                                  background: isInterviewer ? '#F5F3FF' : TOKENS.card,
                                  border: isInterviewer ? '1px solid #DDD6FE' : `1px solid ${TOKENS.borderLight}`,
                                  borderRadius: '3px 14px 14px 14px',
                                  padding: '10px 14px', fontSize: 14, lineHeight: 1.7,
                                  fontFamily: TOKENS.serif, whiteSpace: 'pre-wrap',
                                }}>
                                  {msg.text}
                                </div>
                              </div>
                            </div>
                          )}
                          {/* 저자 답변 */}
                          {isUser && (
                            <div style={{
                              background: TOKENS.dark, color: '#FAFAF9',
                              borderRadius: '14px 3px 14px 14px',
                              padding: '10px 14px', maxWidth: '80%',
                              fontSize: 14, lineHeight: 1.7,
                              fontFamily: TOKENS.serif, whiteSpace: 'pre-wrap',
                            }}>
                              {msg.text}
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* ── 질문 입력창 ── */}
              <div style={{
                borderTop: `1px solid ${TOKENS.borderLight}`,
                padding: '12px 16px',
                background: TOKENS.card,
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {sent[activeChapterId] && (
                  <p style={{ fontSize: 12, color: '#7C3AED', fontFamily: TOKENS.sans, margin: 0 }}>
                    ✓ 질문이 전달됐습니다. 저자가 답변하면 실시간으로 표시됩니다.
                  </p>
                )}
                {sendError && (
                  <p style={{ fontSize: 12, color: '#e53e3e', fontFamily: TOKENS.sans, margin: 0 }}>{sendError}</p>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onCompositionStart={() => { composingRef.current = true; }}
                    onCompositionEnd={() => { composingRef.current = false; }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !composingRef.current) {
                        e.preventDefault();
                        sendQuestion();
                      }
                    }}
                    placeholder={`"${activeChapter.title}" 챕터에 질문을 남겨보세요…`}
                    rows={2}
                    style={{
                      flex: 1, resize: 'none', padding: '10px 14px',
                      border: `1.5px solid ${TOKENS.border}`, borderRadius: 12,
                      fontSize: 14, fontFamily: TOKENS.serif, outline: 'none',
                      background: TOKENS.bg, color: TOKENS.text,
                      lineHeight: 1.6,
                    }}
                  />
                  <button
                    onClick={sendQuestion}
                    disabled={sending || !question.trim()}
                    style={{
                      padding: '0 18px', borderRadius: 12,
                      background: sending || !question.trim() ? TOKENS.muted : '#7C3AED',
                      color: '#fff', border: 'none', cursor: sending || !question.trim() ? 'not-allowed' : 'pointer',
                      fontSize: 13, fontFamily: TOKENS.sans, fontWeight: 500,
                      minWidth: 64, transition: 'background 0.15s',
                    }}
                  >
                    {sending ? '…' : '전송'}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, margin: 0 }}>
                  Enter로 전송 · Shift+Enter 줄바꿈
                </p>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TOKENS.muted, fontFamily: TOKENS.sans }}>
              왼쪽에서 챕터를 선택해주세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
