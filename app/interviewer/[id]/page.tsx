'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { TOKENS } from '@/lib/design-tokens';
import { createBrowserClient } from '@/lib/supabase';

const PURPLE = '#7C3AED';
const PURPLE_BG = '#F5F3FF';
const PURPLE_BORDER = '#DDD6FE';
const ACCENT = '#A0522D';

interface Message { id: string; type: string; text: string; sort_order: number; }
interface Chapter { id: string; title: string; sort_order: number; mode: string; messages: Message[]; }
interface Book { id: string; title: string; author: string; }

function PersonIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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

  /* 온보딩 */
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('mystory_interviewer_seen')) {
      setShowOnboarding(true);
    }
  }, []);
  const dismissOnboarding = () => {
    localStorage.setItem('mystory_interviewer_seen', '1');
    setShowOnboarding(false);
  };

  /* 모바일 감지 */
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composingRef = useRef(false);

  /* 데이터 로드 */
  useEffect(() => {
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
  }, [bookId, token]); // eslint-disable-line

  /* Supabase Realtime */
  const chaptersRef = useRef<Chapter[]>([]);
  useEffect(() => { chaptersRef.current = chapters; }, [chapters]);

  useEffect(() => {
    if (!bookId || !token) return;
    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`interviewer-view-${bookId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as { id: string; chapter_id: string; type: string; text: string; sort_order: number };
        if (msg.type === 'interviewer') return;
        const chapterExists = chaptersRef.current.some((c) => c.id === msg.chapter_id);
        if (!chapterExists) return;
        setChapters((prev) =>
          prev.map((c) =>
            c.id === msg.chapter_id
              ? { ...c, messages: [...c.messages, { id: msg.id, type: msg.type, text: msg.text, sort_order: msg.sort_order }] }
              : c
          )
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bookId, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChapterId, chapters]);

  const activeChapter = chapters.find((c) => c.id === activeChapterId) ?? null;

  const sendQuestion = async () => {
    if (!question.trim() || !activeChapterId) return;
    setSending(true); setSendError('');
    try {
      const res = await fetch(`/api/interviewer/${bookId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, chapterId: activeChapterId, question: question.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '전송 실패');
      const newMsg: Message = { id: Math.random().toString(36).slice(2), type: 'interviewer', text: question.trim(), sort_order: 9999 };
      setChapters((prev) => prev.map((c) => c.id === activeChapterId ? { ...c, messages: [...c.messages, newMsg] } : c));
      setSent((prev) => ({ ...prev, [activeChapterId]: true }));
      setQuestion('');
      setTimeout(() => setSent((prev) => ({ ...prev, [activeChapterId]: false })), 3000);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : '전송 실패');
    } finally {
      setSending(false);
    }
  };

  /* ── 로딩 ── */
  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: TOKENS.bg }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: `2px solid ${PURPLE_BORDER}`, borderTopColor: PURPLE, animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ fontSize: 13, color: TOKENS.muted, fontFamily: TOKENS.sans }}>불러오는 중…</p>
    </div>
  );

  /* ── 에러 ── */
  if (error) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, background: TOKENS.bg, padding: 24 }}>
      <div style={{ width: 60, height: 60, borderRadius: 16, background: PURPLE_BG, border: `1px solid ${PURPLE_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 17, fontFamily: TOKENS.serif, color: TOKENS.text, marginBottom: 6 }}>
          {error === '비공개 책입니다' || error === '유효하지 않은 토큰입니다' ? '유효하지 않은 링크입니다' : '책을 불러올 수 없습니다'}
        </p>
        <p style={{ fontSize: 13, color: TOKENS.muted, fontFamily: TOKENS.sans }}>링크가 만료되었거나 권한이 없습니다</p>
      </div>
      <a href="/" style={{ padding: '11px 28px', background: PURPLE, color: '#fff', borderRadius: 40, fontSize: 14, fontFamily: TOKENS.sans, fontWeight: 500, textDecoration: 'none' }}>홈으로</a>
    </div>
  );

  /* ══════════════════════════════════════ */
  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: TOKENS.bg, fontFamily: TOKENS.serif, color: TOKENS.text }}>

      {/* ── 온보딩 모달 ── */}
      {showOnboarding && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) dismissOnboarding(); }}>
          <div style={{
            background: TOKENS.card, borderRadius: '20px 20px 0 0',
            padding: '28px 24px max(28px, env(safe-area-inset-bottom))',
            width: '100%', maxWidth: 480,
            boxShadow: '0 -12px 48px rgba(0,0,0,0.18)',
            animation: 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: TOKENS.border, margin: '0 auto 22px' }} />

            {/* 아이콘 */}
            <div style={{ width: 52, height: 52, borderRadius: 14, background: PURPLE_BG, border: `1px solid ${PURPLE_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>

            <h3 style={{ fontSize: 19, fontWeight: 400, fontFamily: TOKENS.serif, textAlign: 'center', marginBottom: 10, color: TOKENS.text, letterSpacing: '-0.02em' }}>
              인터뷰어로 초대받으셨군요!
            </h3>
            <p style={{ fontSize: 14, color: TOKENS.muted, fontFamily: TOKENS.sans, lineHeight: 1.75, textAlign: 'center', marginBottom: 24, wordBreak: 'keep-all' }}>
              저자에게 궁금한 것들을 질문해보세요.<br />
              입력한 질문은 저자의 글쓰기 화면에<br />
              <strong style={{ color: TOKENS.text }}>실시간으로 전달</strong>됩니다.
            </p>

            {/* 사용법 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {[
                { icon: '①', text: '챕터를 선택하고 질문을 입력하세요' },
                { icon: '②', text: '저자가 답변하면 여기서 실시간으로 볼 수 있어요' },
                { icon: '③', text: '여러 챕터에 자유롭게 질문할 수 있어요' },
              ].map((item) => (
                <div key={item.icon} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: TOKENS.bg, borderRadius: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: PURPLE, fontFamily: TOKENS.sans, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, color: TOKENS.subtext, fontFamily: TOKENS.sans, lineHeight: 1.6 }}>{item.text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={dismissOnboarding}
              style={{
                width: '100%', padding: '15px 0',
                background: PURPLE, color: '#fff',
                border: 'none', borderRadius: 40,
                fontSize: 15, fontFamily: TOKENS.sans, fontWeight: 600,
                cursor: 'pointer', boxShadow: `0 6px 20px ${PURPLE}44`,
              }}
            >
              질문 시작하기
            </button>
          </div>
        </div>
      )}

      {/* ── 헤더 ── */}
      <header style={{
        flexShrink: 0, background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${PURPLE_BORDER}`,
        padding: '0 16px', height: 56,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {/* 아바타 */}
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
          <PersonIcon size={15} />
        </div>

        {/* 제목 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', color: TOKENS.text, fontFamily: TOKENS.sans }}>
            인터뷰어 모드
          </div>
          {book && (
            <div style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {book.title} · {book.author}
            </div>
          )}
        </div>

        {/* 실시간 배지 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: PURPLE_BG, border: `1px solid ${PURPLE_BORDER}`, borderRadius: 20, flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', animation: 'pulse 2s infinite' }} />
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
          <span style={{ fontSize: 11, color: PURPLE, fontFamily: TOKENS.sans, whiteSpace: 'nowrap' }}>
            {isMobile ? '연결 중' : '실시간 연결 중'}
          </span>
        </div>
      </header>

      {/* ── 메인 레이아웃 ── */}
      <div className="interviewer-layout" style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* 챕터 사이드바 / 모바일 칩 바 */}
        <div
          className="interviewer-sidebar"
          style={{
            width: isMobile ? '100%' : 210,
            height: isMobile ? 'auto' : '100%',
            flexShrink: 0,
            borderRight: isMobile ? 'none' : `1px solid ${TOKENS.borderLight}`,
            borderBottom: isMobile ? `1px solid ${TOKENS.borderLight}` : 'none',
            background: TOKENS.card,
            overflowY: isMobile ? 'hidden' : 'auto',
            overflowX: isMobile ? 'auto' : 'hidden',
            display: 'flex',
            flexDirection: isMobile ? 'row' : 'column',
            padding: isMobile ? '10px 12px' : '0',
            gap: isMobile ? 6 : 0,
          }}
        >
          {/* 데스크탑 레이블 */}
          {!isMobile && (
            <div className="interviewer-sidebar-label" style={{ padding: '16px 16px 8px', fontSize: 10, color: TOKENS.muted, fontFamily: TOKENS.sans, letterSpacing: 3, textTransform: 'uppercase' }}>
              챕터 목록
            </div>
          )}

          {chapters.map((ch, i) => {
            const interviewerCount = ch.messages.filter((m) => m.type === 'interviewer').length;
            const isActive = ch.id === activeChapterId;

            if (isMobile) {
              /* 모바일 칩 */
              return (
                <button
                  key={ch.id}
                  className="interviewer-chip"
                  onClick={() => setActiveChapterId(ch.id)}
                  style={{
                    flexShrink: 0,
                    padding: '7px 14px',
                    borderRadius: 20,
                    border: `1.5px solid ${isActive ? PURPLE : TOKENS.border}`,
                    background: isActive ? PURPLE_BG : TOKENS.card,
                    color: isActive ? PURPLE : TOKENS.subtext,
                    fontSize: 13,
                    fontFamily: TOKENS.sans,
                    fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700 }}>{String(i + 1).padStart(2, '0')}</span>
                  {ch.title}
                  {interviewerCount > 0 && (
                    <span style={{ fontSize: 10, background: PURPLE, color: '#fff', borderRadius: 10, padding: '1px 6px', fontWeight: 700 }}>
                      {interviewerCount}
                    </span>
                  )}
                </button>
              );
            }

            /* 데스크탑 항목 */
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChapterId(ch.id)}
                style={{
                  width: '100%', padding: '12px 16px',
                  background: isActive ? PURPLE_BG : 'transparent',
                  border: 'none',
                  borderLeft: `3px solid ${isActive ? PURPLE : 'transparent'}`,
                  textAlign: 'left', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: 3,
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 10, color: isActive ? PURPLE : TOKENS.muted, fontFamily: TOKENS.sans, minWidth: 18, fontWeight: 600 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ fontSize: 13, color: TOKENS.text, fontFamily: TOKENS.serif, lineHeight: 1.3, fontWeight: isActive ? 500 : 400, flex: 1 }}>
                    {ch.title}
                  </span>
                  {interviewerCount > 0 && (
                    <span style={{ fontSize: 10, background: PURPLE, color: '#fff', borderRadius: 10, padding: '1px 6px', fontWeight: 700, flexShrink: 0 }}>
                      {interviewerCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── 대화 뷰 ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {activeChapter ? (
            <>
              {/* 챕터 제목 바 (데스크탑만) */}
              {!isMobile && (
                <div style={{ padding: '13px 20px 11px', borderBottom: `1px solid ${TOKENS.borderLight}`, background: TOKENS.card, flexShrink: 0 }}>
                  <p style={{ fontSize: 10, color: TOKENS.muted, fontFamily: TOKENS.sans, letterSpacing: 2, margin: '0 0 2px', textTransform: 'uppercase' }}>현재 챕터</p>
                  <h2 style={{ fontSize: 16, fontWeight: 500, margin: 0, letterSpacing: '-0.02em', fontFamily: TOKENS.serif }}>{activeChapter.title}</h2>
                </div>
              )}

              {/* 메시지 목록 */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* 빈 상태 */}
                {activeChapter.messages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: PURPLE_BG, border: `1px solid ${PURPLE_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    </div>
                    <p style={{ fontSize: 14, color: TOKENS.text, fontFamily: TOKENS.serif, margin: 0 }}>아직 대화가 없습니다</p>
                    <p style={{ fontSize: 12, color: TOKENS.muted, fontFamily: TOKENS.sans, margin: 0, lineHeight: 1.6 }}>
                      아래에서 첫 번째 질문을 남겨보세요.<br />저자에게 실시간으로 전달됩니다.
                    </p>
                  </div>
                )}

                {activeChapter.messages
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((msg) => {
                    const isUser = msg.type === 'user';
                    const isInterviewer = msg.type === 'interviewer';
                    const isPhoto = msg.type === 'photo';

                    if (isPhoto) return null;

                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: 8 }}>
                        {/* AI / 인터뷰어 (왼쪽) */}
                        {!isUser && (
                          <div style={{ display: 'flex', gap: 9, maxWidth: '82%' }}>
                            {/* 아바타 */}
                            <div style={{
                              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                              background: isInterviewer ? PURPLE : TOKENS.dark,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                              alignSelf: 'flex-end',
                              boxShadow: isInterviewer ? `0 2px 8px ${PURPLE}44` : undefined,
                            }}>
                              {isInterviewer ? (
                                <PersonIcon size={13} />
                              ) : (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                                </svg>
                              )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <span style={{ fontSize: 10, color: isInterviewer ? PURPLE : TOKENS.muted, fontFamily: TOKENS.sans, fontWeight: isInterviewer ? 600 : 400 }}>
                                {isInterviewer ? '내 질문' : 'AI 인터뷰어'}
                              </span>
                              <div style={{
                                background: isInterviewer ? PURPLE_BG : TOKENS.card,
                                border: `1px solid ${isInterviewer ? PURPLE_BORDER : TOKENS.borderLight}`,
                                borderRadius: isInterviewer ? '3px 16px 16px 16px' : '3px 14px 14px 14px',
                                padding: '10px 14px',
                                fontSize: 14, lineHeight: 1.7,
                                fontFamily: TOKENS.serif, whiteSpace: 'pre-wrap',
                                color: isInterviewer ? '#4C1D95' : TOKENS.text,
                                boxShadow: isInterviewer ? `0 2px 8px ${PURPLE}18` : undefined,
                              }}>
                                {msg.text}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 저자 답변 (오른쪽) */}
                        {isUser && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '82%', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: 10, color: TOKENS.muted, fontFamily: TOKENS.sans }}>저자 답변</span>
                            <div style={{
                              background: TOKENS.dark, color: '#FAFAF9',
                              borderRadius: '16px 3px 16px 16px',
                              padding: '10px 14px',
                              fontSize: 14, lineHeight: 1.7,
                              fontFamily: TOKENS.serif, whiteSpace: 'pre-wrap',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                            }}>
                              {msg.text}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                <div ref={messagesEndRef} />
              </div>

              {/* ── 질문 입력창 ── */}
              <div
                className="interviewer-input-bar sa-b-input"
                style={{
                  borderTop: `1px solid ${TOKENS.borderLight}`,
                  padding: `12px 14px max(12px, env(safe-area-inset-bottom))`,
                  background: TOKENS.card,
                  flexShrink: 0,
                }}
              >
                {/* 전송 성공 */}
                {sent[activeChapterId ?? ''] && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '8px 12px', background: PURPLE_BG, borderRadius: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <p style={{ fontSize: 12, color: PURPLE, fontFamily: TOKENS.sans, margin: 0 }}>
                      질문이 전달됐습니다. 저자가 답변하면 실시간으로 표시됩니다.
                    </p>
                  </div>
                )}
                {sendError && (
                  <p style={{ fontSize: 12, color: '#e53e3e', fontFamily: TOKENS.sans, margin: '0 0 8px' }}>{sendError}</p>
                )}

                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
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
                    placeholder={isMobile ? `${activeChapter.title}에 질문하기…` : `"${activeChapter.title}" 챕터에 질문을 남겨보세요…`}
                    rows={isMobile ? 2 : 2}
                    style={{
                      flex: 1, resize: 'none', padding: '10px 14px',
                      border: `1.5px solid ${PURPLE_BORDER}`,
                      borderRadius: 14,
                      fontSize: 14, fontFamily: TOKENS.serif, outline: 'none',
                      background: PURPLE_BG, color: TOKENS.text,
                      lineHeight: 1.6,
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = PURPLE)}
                    onBlur={(e) => (e.target.style.borderColor = PURPLE_BORDER)}
                  />
                  <button
                    onClick={sendQuestion}
                    disabled={sending || !question.trim()}
                    style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: sending || !question.trim() ? TOKENS.light : PURPLE,
                      color: '#fff', border: 'none',
                      cursor: sending || !question.trim() ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'background 0.2s',
                      boxShadow: !sending && question.trim() ? `0 4px 12px ${PURPLE}44` : undefined,
                    }}
                  >
                    {sending ? (
                      <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    )}
                  </button>
                </div>
                {!isMobile && (
                  <p style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, margin: '6px 0 0' }}>
                    Enter로 전송 · Shift+Enter 줄바꿈
                  </p>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TOKENS.muted, fontFamily: TOKENS.sans, fontSize: 14 }}>
              {isMobile ? '위에서 챕터를 선택하세요' : '왼쪽에서 챕터를 선택하세요'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
