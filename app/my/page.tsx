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
  if (diff < 30) return `${Math.floor(diff / 7)}주 전`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/* ─── 책 표지 그라디언트 ─── */
const COVER_GRADIENTS = [
  `linear-gradient(160deg, #3D3530 0%, #2C2824 100%)`,
  `linear-gradient(160deg, #1E2D4A 0%, #0d1b2e 100%)`,
  `linear-gradient(160deg, #704214 0%, #9B6A2F 100%)`,
  `linear-gradient(160deg, #3a2e28 0%, #1e1710 100%)`,
  `linear-gradient(160deg, #2d4a3e 0%, #1a2d26 100%)`,
  `linear-gradient(160deg, #3a2840 0%, #1e1228 100%)`,
];

function coverGradient(title: string) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) & 0xffff;
  return COVER_GRADIENTS[hash % COVER_GRADIENTS.length];
}

type SortKey = 'updated' | 'created' | 'title';

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
  const [sortKey, setSortKey] = useState<SortKey>('updated');

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

  /* ── 정렬된 책 목록 ── */
  const sortedBooks = [...books].sort((a, b) => {
    if (sortKey === 'updated') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    if (sortKey === 'created') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return a.title.localeCompare(b.title, 'ko');
  });

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
        <p style={{ fontSize: 14, color: TOKENS.muted, fontFamily: TOKENS.sans, letterSpacing: 1 }}>···</p>
      </div>
    );
  }
  if (status === 'unauthenticated') return null;

  const email = session?.user?.email ?? '';

  return (
    <div style={{ minHeight: '100vh', background: TOKENS.bg, fontFamily: TOKENS.sans, color: TOKENS.text }}>

      {/* ━━━━ 헤더 ━━━━ */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(250,250,248,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${TOKENS.borderLight}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 60,
      }}>
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: TOKENS.serif, fontSize: 16, fontWeight: 400,
            letterSpacing: '-0.02em', color: TOKENS.text,
          }}
        >
          나의이야기
        </button>
        <button
          onClick={handleLogout}
          style={{
            background: 'transparent', border: `1px solid ${TOKENS.border}`,
            borderRadius: 40, padding: '7px 16px',
            fontSize: 12, cursor: 'pointer', color: TOKENS.subtext,
            fontFamily: TOKENS.sans, fontWeight: 400,
          }}
        >
          로그아웃
        </button>
      </header>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px 100px' }}>

        {/* ━━━━ 프로필 ━━━━ */}
        <div style={{ marginBottom: 44 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* 아바타 */}
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: `linear-gradient(135deg, ${TOKENS.accent}, #c8924a)`,
              color: '#fff', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 20, fontWeight: 500,
              flexShrink: 0, fontFamily: TOKENS.serif,
            }}>
              {(nickname || email).slice(0, 1).toUpperCase()}
            </div>

            {/* 이름 */}
            <div style={{ flex: 1 }}>
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
                      border: `1.5px solid ${TOKENS.accent}`, borderRadius: 8,
                      padding: '8px 12px', fontSize: 15, outline: 'none',
                      fontFamily: TOKENS.sans, color: TOKENS.text, background: '#FFF',
                    }}
                  />
                  {nicknameError && <p style={{ fontSize: 12, color: '#e53e3e', margin: 0 }}>{nicknameError}</p>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveNickname} disabled={nicknameSaving}
                      style={{ background: TOKENS.dark, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>
                      {nicknameSaving ? '저장 중…' : '저장'}
                    </button>
                    <button onClick={() => { setIsEditingNickname(false); setNicknameInput(nickname); setNicknameError(''); }}
                      style={{ background: 'transparent', color: TOKENS.muted, border: `1px solid ${TOKENS.border}`, borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 500, color: TOKENS.text, fontFamily: TOKENS.serif }}>{nickname || '이름 없음'}</span>
                    <button onClick={() => setIsEditingNickname(true)}
                      style={{ background: 'none', border: 'none', color: TOKENS.muted, fontSize: 11, cursor: 'pointer', padding: '2px 4px', letterSpacing: 0.5 }}>
                      수정
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: TOKENS.muted, margin: '2px 0 0', letterSpacing: 0.3 }}>{email}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ━━━━ 보관함 헤더 ━━━━ */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: 3, color: TOKENS.accent, textTransform: 'uppercase', marginBottom: 6, fontWeight: 500 }}>
              My Library
            </p>
            <h2 style={{ fontFamily: TOKENS.serif, fontSize: 22, fontWeight: 300, margin: 0, letterSpacing: '-0.025em', color: TOKENS.text }}>
              내 책 보관함
              {books.length > 0 && (
                <span style={{ fontSize: 14, color: TOKENS.muted, fontFamily: TOKENS.sans, fontWeight: 300, marginLeft: 10 }}>
                  {books.length}권
                </span>
              )}
            </h2>
          </div>

          <button
            onClick={() => router.push('/')}
            style={{
              background: TOKENS.dark, color: '#FAFAF9', border: 'none',
              borderRadius: 40, padding: '9px 20px',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              letterSpacing: '0.01em', flexShrink: 0,
            }}
          >
            + 새 책
          </button>
        </div>

        {/* ━━━━ 정렬 탭 ━━━━ */}
        {books.length > 1 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {([
              { key: 'updated', label: '최근 수정순' },
              { key: 'created', label: '최근 생성순' },
              { key: 'title', label: '이름순' },
            ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSortKey(key)}
                style={{
                  background: sortKey === key ? TOKENS.dark : 'transparent',
                  color: sortKey === key ? '#FAFAF9' : TOKENS.subtext,
                  border: `1px solid ${sortKey === key ? TOKENS.dark : TOKENS.border}`,
                  borderRadius: 40, padding: '6px 14px',
                  fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                  fontWeight: sortKey === key ? 500 : 400,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ━━━━ 책 목록 ━━━━ */}
        {booksLoading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 12, color: TOKENS.muted, letterSpacing: 2 }}>···</p>
          </div>
        ) : books.length === 0 ? (
          /* ── 빈 상태 ── */
          <div style={{
            textAlign: 'center', padding: '72px 24px',
            background: '#FFF', borderRadius: 20,
            border: `1px solid ${TOKENS.borderLight}`,
          }}>
            {/* 책 아이콘 */}
            <div style={{ marginBottom: 28 }}>
              <div style={{
                width: 72, height: 88, margin: '0 auto',
                background: `linear-gradient(160deg, #8B7355, #6B5535)`,
                borderRadius: '4px 8px 8px 4px',
                position: 'relative',
                boxShadow: '3px 3px 12px rgba(0,0,0,0.15)',
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 8,
                  background: 'rgba(0,0,0,0.2)', borderRadius: '4px 0 0 4px',
                }} />
                <div style={{
                  position: 'absolute', inset: '16px 12px',
                  display: 'flex', flexDirection: 'column', gap: 5,
                  justifyContent: 'center',
                }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ height: 1, background: 'rgba(255,255,255,0.25)', borderRadius: 1 }} />
                  ))}
                </div>
              </div>
            </div>

            <h3 style={{
              fontFamily: TOKENS.serif, fontSize: 20, fontWeight: 300,
              color: TOKENS.text, marginBottom: 10, letterSpacing: '-0.02em',
            }}>
              첫 번째 책을 만들어보세요
            </h3>
            <p style={{
              fontSize: 13.5, color: TOKENS.subtext, lineHeight: 1.75,
              marginBottom: 32, wordBreak: 'keep-all', fontWeight: 300,
            }}>
              AI와의 대화로 당신의 이야기를<br />한 권의 책으로 완성할 수 있어요.
            </p>
            <button
              onClick={() => router.push('/')}
              style={{
                background: TOKENS.dark, color: '#FAFAF9', border: 'none',
                borderRadius: 40, padding: '14px 32px',
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
                letterSpacing: '0.01em',
              }}
            >
              이야기 시작하기
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedBooks.map((book) => {
              const isExpanded = expandedBook === book.id;
              const grad = coverGradient(book.title);
              const doneCount = (chaptersMap[book.id] || []).filter(c => c.is_done).length;
              const totalCount = chaptersMap[book.id]?.length ?? book.chapter_count;

              return (
                <div
                  key={book.id}
                  style={{
                    background: '#FFF', borderRadius: 18,
                    border: `1px solid ${TOKENS.borderLight}`,
                    overflow: 'hidden',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
                    transition: 'box-shadow 0.25s, transform 0.25s',
                  }}
                >
                  {/* ── 카드 본문 ── */}
                  <div style={{ display: 'flex' }}>

                    {/* 책 표지 */}
                    <div
                      style={{
                        width: 96, flexShrink: 0,
                        background: grad,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '20px 8px', minHeight: 152,
                        position: 'relative', cursor: 'pointer',
                      }}
                      onClick={() => router.push(`/book?id=${book.id}`)}
                    >
                      {/* 책 등 */}
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: 'rgba(0,0,0,0.2)' }} />
                      {/* 장식선 */}
                      <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.25)', marginBottom: 8 }} />
                      <p style={{
                        fontSize: 10, fontWeight: 300, lineHeight: 1.5,
                        textAlign: 'center', wordBreak: 'keep-all',
                        letterSpacing: '-0.01em',
                        color: 'rgba(255,255,255,0.85)',
                        maxWidth: 64, fontFamily: TOKENS.serif,
                      }}>
                        {book.title}
                      </p>
                      <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.25)', marginTop: 8 }} />
                      {/* 읽기 힌트 */}
                      <p style={{
                        position: 'absolute', bottom: 8,
                        fontSize: 9, color: 'rgba(255,255,255,0.4)',
                        letterSpacing: 1, fontFamily: TOKENS.sans,
                        textTransform: 'uppercase',
                      }}>
                        Read
                      </p>
                    </div>

                    {/* 책 정보 */}
                    <div style={{ flex: 1, padding: '18px 20px 16px', display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0 }}>
                      {/* 제목 */}
                      <h3 style={{
                        fontFamily: TOKENS.serif, fontSize: 17, fontWeight: 400,
                        margin: '0 0 4px', lineHeight: 1.3, letterSpacing: '-0.02em', color: TOKENS.text,
                      }}>
                        {book.title}
                      </h3>

                      {/* 저자 · 날짜 */}
                      <p style={{ fontSize: 12, color: TOKENS.muted, margin: '0 0 10px', letterSpacing: 0.2 }}>
                        {book.author || '저자 미상'} &nbsp;·&nbsp; {formatDate(book.updated_at)} 수정
                      </p>

                      {/* 배지 */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                        <span style={{
                          fontSize: 11, color: TOKENS.accent,
                          background: '#fdf5ec', borderRadius: 20, padding: '3px 10px',
                          border: `1px solid #f0d9b8`,
                        }}>
                          {book.chapter_count}개 챕터
                        </span>
                        {book.is_public && (
                          <span style={{ fontSize: 11, background: '#F2FAF2', color: '#2d7a3a', borderRadius: 20, padding: '3px 10px', border: '1px solid #c3e8c7' }}>
                            공개
                          </span>
                        )}
                        {book.share_token && (
                          <span style={{ fontSize: 11, background: '#FBF7F2', color: TOKENS.accent, borderRadius: 20, padding: '3px 10px', border: `1px solid ${TOKENS.accentBorder}` }}>
                            가족 공유
                          </span>
                        )}
                      </div>

                      {/* 액션 버튼 */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          onClick={() => continueBook(book.id)}
                          style={{
                            background: TOKENS.dark, color: '#FAFAF9', border: 'none',
                            borderRadius: 40, padding: '8px 18px',
                            fontSize: 12, fontWeight: 500, cursor: 'pointer',
                          }}
                        >
                          이어쓰기
                        </button>
                        <button
                          onClick={() => router.push(`/book?id=${book.id}`)}
                          style={{
                            background: 'transparent', color: TOKENS.subtext,
                            border: `1px solid ${TOKENS.border}`, borderRadius: 40,
                            padding: '7px 16px', fontSize: 12, cursor: 'pointer',
                          }}
                        >
                          읽기
                        </button>
                        <button
                          onClick={() => toggleChapters(book.id)}
                          style={{
                            background: 'transparent',
                            color: isExpanded ? TOKENS.accent : TOKENS.subtext,
                            border: `1px solid ${isExpanded ? TOKENS.accentBorder : TOKENS.border}`,
                            borderRadius: 40, padding: '7px 14px',
                            fontSize: 12, cursor: 'pointer',
                          }}
                        >
                          목차 {isExpanded ? '▲' : '▼'}
                        </button>

                        {/* 더보기 메뉴 */}
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                          {(book.is_public || book.share_token) && (
                            <button
                              onClick={() => copyBookLink(book)}
                              style={{
                                background: copiedBookId === book.id ? '#EFF6FF' : 'transparent',
                                color: copiedBookId === book.id ? '#1D4ED8' : TOKENS.muted,
                                border: `1px solid ${copiedBookId === book.id ? '#BFDBFE' : TOKENS.borderLight}`,
                                borderRadius: 40, padding: '7px 12px',
                                fontSize: 11, cursor: 'pointer', transition: 'all 0.15s',
                              }}
                            >
                              {copiedBookId === book.id ? '복사됨' : '링크'}
                            </button>
                          )}
                          <button
                            onClick={() => { setDeleteTarget(book); setDeleteConfirmed(false); }}
                            style={{
                              background: 'transparent', color: TOKENS.muted,
                              border: `1px solid ${TOKENS.borderLight}`,
                              borderRadius: 40, padding: '7px 12px',
                              fontSize: 11, cursor: 'pointer',
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── 챕터 목록 ── */}
                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${TOKENS.borderLight}` }}>
                      {chaptersLoading === book.id ? (
                        <div style={{ padding: '16px 20px', color: TOKENS.muted, fontSize: 13, textAlign: 'center' }}>
                          ···
                        </div>
                      ) : (chaptersMap[book.id] || []).length === 0 ? (
                        <div style={{ padding: '16px 24px', color: TOKENS.muted, fontSize: 13 }}>
                          챕터가 없습니다.
                        </div>
                      ) : (
                        <>
                          {/* 진행률 바 */}
                          {chaptersMap[book.id] && (
                            <div style={{ padding: '12px 20px 0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 11, color: TOKENS.muted }}>진행률</span>
                                <span style={{ fontSize: 11, color: TOKENS.accent, fontWeight: 500 }}>
                                  {doneCount}/{totalCount} 챕터 완료
                                </span>
                              </div>
                              <div style={{ height: 4, background: TOKENS.borderLight, borderRadius: 4 }}>
                                <div style={{
                                  height: '100%',
                                  width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : '0%',
                                  background: `linear-gradient(90deg, ${TOKENS.accent}, #C9A96E)`,
                                  borderRadius: 4,
                                  transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                                }} />
                              </div>
                            </div>
                          )}
                          {(chaptersMap[book.id] || []).map((ch, idx) => (
                            <button
                              key={ch.id}
                              onClick={() => continueChapter(book.id, idx)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 14,
                                padding: '12px 20px', width: '100%',
                                background: 'transparent',
                                border: 'none', borderTop: `1px solid ${TOKENS.borderLight}`,
                                cursor: 'pointer', textAlign: 'left',
                                fontFamily: TOKENS.sans,
                              }}
                            >
                              <span style={{ fontSize: 10, color: TOKENS.muted, minWidth: 22, fontWeight: 600, letterSpacing: 0.5 }}>
                                {String(idx + 1).padStart(2, '0')}
                              </span>
                              <span style={{ flex: 1, fontSize: 14, color: TOKENS.text, lineHeight: 1.4, fontFamily: TOKENS.serif }}>
                                {ch.title}
                              </span>
                              <span style={{
                                fontSize: 10, padding: '2px 8px', borderRadius: 10, flexShrink: 0,
                                ...(ch.is_done
                                  ? { background: '#e8f5e9', color: '#2e7d32' }
                                  : { background: '#fef9ee', color: '#b45309' }
                                ),
                              }}>
                                {ch.is_done ? '완료' : '작성 중'}
                              </span>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ━━━━ 삭제 확인 모달 ━━━━ */}
      {deleteTarget && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div style={{
            background: '#FFF', borderRadius: '20px 20px 0 0',
            padding: '28px 24px max(32px, env(safe-area-inset-bottom))', width: '100%', maxWidth: 480,
          }}>
            <div style={{ width: 32, height: 3, background: TOKENS.border, borderRadius: 2, margin: '0 auto 24px' }} />
            <h2 style={{ fontFamily: TOKENS.serif, fontSize: 20, fontWeight: 300, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
              책을 삭제할까요?
            </h2>
            <p style={{ fontSize: 14, color: TOKENS.subtext, lineHeight: 1.65, margin: '0 0 24px', wordBreak: 'keep-all' }}>
              「{deleteTarget.title}」을 삭제하면 모든 챕터와 내용이 사라집니다. 이 작업은 되돌릴 수 없습니다.
            </p>

            {!deleteConfirmed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => setDeleteConfirmed(true)}
                  style={{ padding: '14px', background: '#fdf0ee', color: '#c0392b', border: `1px solid #f5c6c0`, borderRadius: 12, fontSize: 15, cursor: 'pointer' }}>
                  네, 삭제하겠습니다
                </button>
                <button onClick={() => setDeleteTarget(null)}
                  style={{ padding: '14px', background: TOKENS.warm, color: TOKENS.muted, border: 'none', borderRadius: 12, fontSize: 15, cursor: 'pointer' }}>
                  취소
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 13, color: '#c0392b', margin: '0 0 4px' }}>
                  정말 삭제합니다. 아래 버튼을 한 번 더 눌러주세요.
                </p>
                <button onClick={deleteBook} disabled={deleting}
                  style={{ padding: '14px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: deleting ? 'wait' : 'pointer' }}>
                  {deleting ? '삭제 중…' : '최종 삭제'}
                </button>
                <button onClick={() => { setDeleteTarget(null); setDeleteConfirmed(false); }}
                  style={{ padding: '14px', background: TOKENS.warm, color: TOKENS.muted, border: 'none', borderRadius: 12, fontSize: 15, cursor: 'pointer' }}>
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
