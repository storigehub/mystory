'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useBook } from '@/lib/book-context';
import { TOKENS } from '@/lib/design-tokens';

/* ─── 타입 ─── */
interface BookSummary {
  id: string;
  title: string;
  author: string;
  created_at: string;
  updated_at: string;
  chapter_count: number;
  is_public: boolean;
  share_token: string | null;
}

interface ChapterSummary {
  id: string;
  title: string;
  sort_order: number;
  is_done: boolean;
  mode: 'chat' | 'normal';
}

/* ─── 날짜 포맷 ─── */
function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  if (diff < 7) return `${diff}일 전`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/* ─── 책 표지 미니 썸네일 (CSS gradient) ─── */
const COVER_GRADIENTS = [
  `linear-gradient(160deg, #3D3530, #2C2824)`,
  `linear-gradient(160deg, #1a2a4a, #0d1b2e)`,
  `linear-gradient(160deg, #704214, #9B6A2F)`,
  `linear-gradient(160deg, #4a3728, #2c1f16)`,
  `linear-gradient(160deg, #2d4a3e, #1a2d26)`,
];

function coverGradient(title: string) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) & 0xffff;
  return COVER_GRADIENTS[hash % COVER_GRADIENTS.length];
}

/* ─── 메인 컴포넌트 ─── */
export default function MyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { resetBook, restoreFromDb, setCurrentChapterIdx } = useBook();

  const [nickname, setNickname] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameError, setNicknameError] = useState('');

  const [books, setBooks] = useState<BookSummary[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);

  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [chaptersMap, setChaptersMap] = useState<Record<string, ChapterSummary[]>>({});
  const [chaptersLoading, setChaptersLoading] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<BookSummary | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [copiedBookId, setCopiedBookId] = useState<string | null>(null);

  const copyBookLink = (book: BookSummary) => {
    const base = `${window.location.origin}/shared/${book.id}`;
    const url = book.share_token ? `${base}?token=${book.share_token}` : base;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedBookId(book.id);
      setTimeout(() => setCopiedBookId(null), 2000);
    });
  };

  /* ── 비로그인 리다이렉트 ── */
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  /* ── 닉네임 로드 ── */
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        const name = data.nickname || session?.user?.name || '';
        setNickname(name);
        setNicknameInput(name);
      })
      .catch(() => {});
  }, [status, session]);

  /* ── 책 목록 로드 ── */
  const loadBooks = useCallback(async () => {
    setBooksLoading(true);
    try {
      const res = await fetch('/api/books');
      const data = await res.json();
      setBooks(data.books ?? []);
    } catch {
      setBooks([]);
    } finally {
      setBooksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') loadBooks();
  }, [status, loadBooks]);

  /* ── 닉네임 저장 ── */
  const saveNickname = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) { setNicknameError('닉네임을 입력해주세요'); return; }
    if (trimmed.length > 20) { setNicknameError('20자 이내로 입력해주세요'); return; }
    setNicknameSaving(true);
    setNicknameError('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: trimmed }),
      });
      if (!res.ok) throw new Error();
      setNickname(trimmed);
      setIsEditingNickname(false);
    } catch {
      setNicknameError('저장에 실패했습니다. 다시 시도해주세요');
    } finally {
      setNicknameSaving(false);
    }
  };

  /* ── 챕터 목록 로드 ── */
  const toggleChapters = async (bookId: string) => {
    if (expandedBook === bookId) { setExpandedBook(null); return; }
    setExpandedBook(bookId);
    if (chaptersMap[bookId]) return;
    setChaptersLoading(bookId);
    try {
      const res = await fetch(`/api/books/${bookId}`);
      const data = await res.json();
      const sorted = (data.chapters || []).sort(
        (a: ChapterSummary, b: ChapterSummary) => a.sort_order - b.sort_order
      );
      setChaptersMap((prev) => ({ ...prev, [bookId]: sorted }));
    } catch {
      setChaptersMap((prev) => ({ ...prev, [bookId]: [] }));
    } finally {
      setChaptersLoading(null);
    }
  };

  const continueBook = async (bookId: string) => {
    const ok = await restoreFromDb(bookId);
    if (ok) router.push('/write');
  };

  const continueChapter = async (bookId: string, chapterIdx: number) => {
    const ok = await restoreFromDb(bookId);
    if (ok) { setCurrentChapterIdx(chapterIdx); router.push('/write'); }
  };

  const deleteBook = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/books/${deleteTarget.id}`, { method: 'DELETE' });
      setBooks((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteConfirmed(false);
    } catch {
      alert('삭제에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    resetBook();
    await signOut({ callbackUrl: '/' });
  };

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: TOKENS.bg }}>
        <p style={{ fontSize: 16, color: TOKENS.muted, fontFamily: TOKENS.sans }}>잠시만요...</p>
      </div>
    );
  }
  if (status === 'unauthenticated') return null;

  const email = session?.user?.email ?? '';

  return (
    <div style={{ minHeight: '100vh', background: TOKENS.bg, fontFamily: TOKENS.serif, color: TOKENS.text }}>

      {/* ── 헤더 ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${TOKENS.borderLight}`,
        display: 'flex', alignItems: 'center', padding: '0 20px', height: 52,
        gap: 12,
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: TOKENS.subtext, fontSize: 14, cursor: 'pointer', fontFamily: TOKENS.sans, padding: '8px 0', minHeight: 44 }}
        >
          ← 뒤로
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>
          나의이야기
        </span>
        <button
          onClick={handleLogout}
          style={{ background: 'none', border: `1px solid ${TOKENS.border}`, borderRadius: TOKENS.radiusSm, color: TOKENS.muted, fontSize: 13, cursor: 'pointer', fontFamily: TOKENS.sans, padding: '6px 12px', minHeight: 36 }}
        >
          로그아웃
        </button>
      </header>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 80px' }}>

        {/* ── 프로필 ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '20px 24px',
          background: TOKENS.card,
          borderRadius: 12,
          border: `1px solid ${TOKENS.borderLight}`,
          boxShadow: TOKENS.shadowLg,
          marginBottom: 32,
        }}>
          {/* 아바타 */}
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: `linear-gradient(135deg, ${TOKENS.accent}, #c8924a)`,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 600, flexShrink: 0,
          }}>
            {(nickname || email).slice(0, 1).toUpperCase()}
          </div>

          {/* 이름/이메일 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {isEditingNickname ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveNickname(); }}
                  placeholder="닉네임 (최대 20자)"
                  maxLength={20}
                  autoFocus
                  style={{
                    border: `1.5px solid ${TOKENS.accent}`, borderRadius: TOKENS.radiusSm,
                    padding: '8px 12px', fontSize: 16, outline: 'none',
                    fontFamily: TOKENS.serif, color: TOKENS.text,
                  }}
                />
                {nicknameError && <p style={{ fontSize: 12, color: '#e53e3e', margin: 0, fontFamily: TOKENS.sans }}>{nicknameError}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveNickname} disabled={nicknameSaving}
                    style={{ background: TOKENS.dark, color: '#fff', border: 'none', borderRadius: TOKENS.radiusSm, padding: '8px 16px', fontSize: 13, fontFamily: TOKENS.sans, cursor: 'pointer', minHeight: 36 }}>
                    {nicknameSaving ? '저장 중…' : '저장'}
                  </button>
                  <button onClick={() => { setIsEditingNickname(false); setNicknameInput(nickname); setNicknameError(''); }}
                    style={{ background: 'transparent', color: TOKENS.muted, border: `1px solid ${TOKENS.border}`, borderRadius: TOKENS.radiusSm, padding: '8px 16px', fontSize: 13, fontFamily: TOKENS.sans, cursor: 'pointer', minHeight: 36 }}>
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 17, fontWeight: 600, color: TOKENS.text }}>{nickname || '닉네임 없음'}</span>
                  <button onClick={() => setIsEditingNickname(true)}
                    style={{ background: 'none', border: 'none', color: TOKENS.muted, fontSize: 13, cursor: 'pointer', fontFamily: TOKENS.sans, padding: '2px 6px' }}>
                    ✏ 수정
                  </button>
                </div>
                <p style={{ fontSize: 13, color: TOKENS.muted, margin: 0, fontFamily: TOKENS.sans }}>{email}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── 내 책 보관함 헤더 ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, letterSpacing: '-0.02em' }}>내 책 보관함</h2>
          <button
            onClick={() => router.push('/')}
            style={{
              background: TOKENS.dark, color: '#FAFAF9',
              border: 'none', borderRadius: TOKENS.radiusSm,
              padding: '8px 16px', fontSize: 13, fontFamily: TOKENS.sans,
              fontWeight: 500, cursor: 'pointer', minHeight: 36,
            }}
          >
            + 새 책 만들기
          </button>
        </div>

        {/* ── 책 목록 ── */}
        {booksLoading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: TOKENS.muted, fontFamily: TOKENS.sans, fontSize: 14 }}>
            불러오는 중…
          </div>
        ) : books.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            background: TOKENS.card, borderRadius: 12,
            border: `1px solid ${TOKENS.borderLight}`,
          }}>
            <p style={{ fontSize: 16, color: TOKENS.muted, marginBottom: 20, fontFamily: TOKENS.sans }}>
              아직 작성한 책이 없습니다
            </p>
            <button
              onClick={() => router.push('/')}
              style={{ background: TOKENS.dark, color: '#FAFAF9', border: 'none', borderRadius: TOKENS.radiusSm, padding: '12px 24px', fontSize: 15, fontFamily: TOKENS.sans, cursor: 'pointer', minHeight: 48 }}
            >
              첫 번째 책 시작하기
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {books.map((book) => {
              const isExpanded = expandedBook === book.id;
              const grad = coverGradient(book.title);

              return (
                <div key={book.id} style={{
                  background: TOKENS.card,
                  borderRadius: 12,
                  border: `1px solid ${TOKENS.borderLight}`,
                  boxShadow: TOKENS.shadowLg,
                  overflow: 'hidden',
                }}>
                  {/* ── 책 카드 본문 ── */}
                  <div style={{ display: 'flex', gap: 0 }}>
                    {/* 왼쪽: 표지 썸네일 */}
                    <div style={{
                      width: 96, flexShrink: 0,
                      background: grad,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      padding: '20px 10px', minHeight: 130,
                      color: 'rgba(255,255,255,0.9)',
                    }}>
                      <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.3)', marginBottom: 10 }} />
                      <p style={{
                        fontSize: 11, fontWeight: 400, lineHeight: 1.4,
                        textAlign: 'center', wordBreak: 'keep-all',
                        letterSpacing: '-0.01em', maxWidth: 72,
                      }}>
                        {book.title}
                      </p>
                      <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.3)', marginTop: 10 }} />
                    </div>

                    {/* 오른쪽: 책 정보 + 액션 */}
                    <div style={{ flex: 1, padding: '18px 18px 14px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                      {/* 제목 */}
                      <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0, lineHeight: 1.3, letterSpacing: '-0.02em', color: TOKENS.text }}>
                        {book.title}
                      </h3>

                      {/* 저자 · 날짜 */}
                      <p style={{ fontSize: 13, color: TOKENS.muted, margin: 0, fontFamily: TOKENS.sans }}>
                        {book.author || '저자 미상'} · {formatDate(book.updated_at)} 수정
                      </p>

                      {/* 챕터 통계 + 공유 상태 */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 11, color: TOKENS.accent, fontFamily: TOKENS.sans,
                          background: '#fbf7f0', borderRadius: 20, padding: '3px 10px',
                          border: `1px solid ${TOKENS.accentBorder}`,
                        }}>
                          {book.chapter_count}개 챕터
                        </span>
                        {book.is_public && (
                          <span style={{ fontSize: 11, fontFamily: TOKENS.sans, background: '#F0FDF4', color: '#16A34A', borderRadius: 20, padding: '3px 10px', border: '1px solid #BBF7D0' }}>
                            공개
                          </span>
                        )}
                        {book.share_token && (
                          <span style={{ fontSize: 11, fontFamily: TOKENS.sans, background: '#EFF6FF', color: '#1D4ED8', borderRadius: 20, padding: '3px 10px', border: '1px solid #BFDBFE' }}>
                            가족 공유
                          </span>
                        )}
                      </div>

                      {/* 액션 버튼 */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => continueBook(book.id)}
                          style={{
                            background: TOKENS.dark, color: '#FAFAF9',
                            border: 'none', borderRadius: TOKENS.radiusSm,
                            padding: '8px 16px', fontSize: 13, fontFamily: TOKENS.sans,
                            fontWeight: 500, cursor: 'pointer', minHeight: 36,
                          }}
                        >
                          이어쓰기
                        </button>
                        <button
                          onClick={() => toggleChapters(book.id)}
                          style={{
                            background: 'transparent', color: TOKENS.subtext,
                            border: `1px solid ${TOKENS.border}`, borderRadius: TOKENS.radiusSm,
                            padding: '8px 14px', fontSize: 13, fontFamily: TOKENS.sans,
                            cursor: 'pointer', minHeight: 36,
                          }}
                        >
                          목차 {isExpanded ? '▲' : '▼'}
                        </button>
                        {(book.is_public || book.share_token) && (
                          <button
                            onClick={() => copyBookLink(book)}
                            style={{
                              background: copiedBookId === book.id ? '#EFF6FF' : 'transparent',
                              color: copiedBookId === book.id ? '#1D4ED8' : TOKENS.subtext,
                              border: `1px solid ${copiedBookId === book.id ? '#BFDBFE' : TOKENS.border}`,
                              borderRadius: TOKENS.radiusSm,
                              padding: '8px 14px', fontSize: 13, fontFamily: TOKENS.sans,
                              cursor: 'pointer', minHeight: 36, transition: 'all 0.15s',
                            }}
                          >
                            {copiedBookId === book.id ? '복사됨' : '링크 복사'}
                          </button>
                        )}
                        <button
                          onClick={() => { setDeleteTarget(book); setDeleteConfirmed(false); }}
                          style={{
                            background: 'transparent', color: '#c0392b',
                            border: `1px solid #f5c6c0`, borderRadius: TOKENS.radiusSm,
                            padding: '8px 14px', fontSize: 13, fontFamily: TOKENS.sans,
                            cursor: 'pointer', minHeight: 36,
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── 챕터 목록 (아코디언) ── */}
                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${TOKENS.borderLight}` }}>
                      {chaptersLoading === book.id ? (
                        <div style={{ padding: '16px 20px', color: TOKENS.muted, fontFamily: TOKENS.sans, fontSize: 13 }}>
                          불러오는 중…
                        </div>
                      ) : (chaptersMap[book.id] || []).length === 0 ? (
                        <div style={{ padding: '16px 20px', color: TOKENS.muted, fontFamily: TOKENS.sans, fontSize: 13 }}>
                          챕터가 없습니다.
                        </div>
                      ) : (
                        (chaptersMap[book.id] || []).map((ch, idx) => (
                          <button
                            key={ch.id}
                            onClick={() => continueChapter(book.id, idx)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 14,
                              padding: '13px 20px', width: '100%',
                              background: idx % 2 === 0 ? TOKENS.card : TOKENS.bg,
                              border: 'none', borderBottom: `1px solid ${TOKENS.borderLight}`,
                              cursor: 'pointer', textAlign: 'left',
                              fontFamily: TOKENS.serif, minHeight: 52,
                            }}
                          >
                            <span style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, minWidth: 24, fontWeight: 600 }}>
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span style={{ flex: 1, fontSize: 15, color: TOKENS.text, lineHeight: 1.4 }}>
                              {ch.title}
                            </span>
                            <span style={{
                              fontSize: 11, padding: '3px 9px', borderRadius: 12, fontFamily: TOKENS.sans, fontWeight: 500,
                              ...(ch.is_done
                                ? { background: '#e8f5e9', color: '#2e7d32' }
                                : { background: '#fff8e8', color: '#b45309' }
                              ),
                            }}>
                              {ch.is_done ? '완료' : '작성 중'}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 삭제 확인 모달 (바텀 시트) ── */}
      {deleteTarget && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 env(safe-area-inset-bottom)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div style={{
            background: TOKENS.card, borderRadius: '16px 16px 0 0',
            padding: '28px 24px 32px', width: '100%', maxWidth: 480,
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{ width: 36, height: 4, background: TOKENS.border, borderRadius: 2, margin: '0 auto' }} />
            <h2 style={{ fontSize: 19, fontWeight: 600, margin: 0, color: TOKENS.text }}>책을 삭제할까요?</h2>
            <p style={{ fontSize: 15, color: TOKENS.subtext, lineHeight: 1.6, margin: 0, fontFamily: TOKENS.sans }}>
              「{deleteTarget.title}」을 삭제하면 모든 챕터와 내용이 사라집니다.<br />이 작업은 되돌릴 수 없습니다.
            </p>

            {!deleteConfirmed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                <button onClick={() => setDeleteConfirmed(true)}
                  style={{ padding: '14px', background: '#fdf0ee', color: '#c0392b', border: `1px solid #f5c6c0`, borderRadius: TOKENS.radiusSm, fontSize: 16, fontFamily: TOKENS.sans, cursor: 'pointer', minHeight: 52 }}>
                  네, 삭제하겠습니다
                </button>
                <button onClick={() => setDeleteTarget(null)}
                  style={{ padding: '14px', background: TOKENS.warm, color: TOKENS.muted, border: 'none', borderRadius: TOKENS.radiusSm, fontSize: 16, fontFamily: TOKENS.sans, cursor: 'pointer', minHeight: 52 }}>
                  취소
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                <p style={{ fontSize: 14, color: '#c0392b', margin: 0, fontFamily: TOKENS.sans }}>
                  ⚠️ 정말 삭제합니다. 아래 버튼을 한 번 더 눌러주세요.
                </p>
                <button onClick={deleteBook} disabled={deleting}
                  style={{ padding: '14px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: TOKENS.radiusSm, fontSize: 17, fontFamily: TOKENS.sans, fontWeight: 600, cursor: deleting ? 'wait' : 'pointer', minHeight: 52 }}>
                  {deleting ? '삭제 중…' : '최종 삭제'}
                </button>
                <button onClick={() => { setDeleteTarget(null); setDeleteConfirmed(false); }}
                  style={{ padding: '14px', background: TOKENS.warm, color: TOKENS.muted, border: 'none', borderRadius: TOKENS.radiusSm, fontSize: 16, fontFamily: TOKENS.sans, cursor: 'pointer', minHeight: 52 }}>
                  취소
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
