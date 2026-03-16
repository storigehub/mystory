'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useBook } from '@/lib/book-context';

/* ─── 타입 ─── */

interface BookSummary {
  id: string;
  title: string;
  author: string;
  created_at: string;
  updated_at: string;
  chapter_count: number;
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
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
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

  // 아코디언: bookId → 챕터 목록
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [chaptersMap, setChaptersMap] = useState<Record<string, ChapterSummary[]>>({});
  const [chaptersLoading, setChaptersLoading] = useState<string | null>(null);

  // 삭제 확인 모달
  const [deleteTarget, setDeleteTarget] = useState<BookSummary | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* ── 비로그인 리다이렉트 ── */
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
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
    if (status === 'authenticated') {
      loadBooks();
    }
  }, [status, loadBooks]);

  /* ── 닉네임 저장 ── */
  const saveNickname = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) {
      setNicknameError('닉네임을 입력해주세요');
      return;
    }
    if (trimmed.length > 20) {
      setNicknameError('20자 이내로 입력해주세요');
      return;
    }
    setNicknameSaving(true);
    setNicknameError('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: trimmed }),
      });
      if (!res.ok) throw new Error('저장 실패');
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
    if (expandedBook === bookId) {
      setExpandedBook(null);
      return;
    }
    setExpandedBook(bookId);
    if (chaptersMap[bookId]) return; // 이미 로드됨

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

  /* ── 이어쓰기 ── */
  const continueBook = async (bookId: string) => {
    const ok = await restoreFromDb(bookId);
    if (ok) router.push('/write');
  };

  /* ── 챕터 이어쓰기 ── */
  const continueChapter = async (bookId: string, chapterIdx: number) => {
    const ok = await restoreFromDb(bookId);
    if (ok) {
      setCurrentChapterIdx(chapterIdx);
      router.push('/write');
    }
  };

  /* ── 책 삭제 ── */
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

  /* ── 로그아웃 ── */
  const handleLogout = async () => {
    resetBook();
    await signOut({ callbackUrl: '/' });
  };

  /* ── 로딩 중 ── */
  if (status === 'loading') {
    return (
      <div style={styles.loadingWrap}>
        <p style={styles.loadingText}>잠시만요...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  const email = session?.user?.email ?? '';

  return (
    <div style={styles.page}>
      {/* 헤더 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.back()}>
          ← 뒤로
        </button>
        <h1 style={styles.headerTitle}>내 정보</h1>
        <div style={{ width: 80 }} />
      </div>

      <div style={styles.content}>
        {/* 프로필 카드 */}
        <section style={styles.card}>
          <div style={styles.profileRow}>
            <div style={styles.avatar}>
              {(nickname || email).slice(0, 1).toUpperCase()}
            </div>
            <div style={styles.profileInfo}>
              {isEditingNickname ? (
                <div style={styles.nicknameEditWrap}>
                  <input
                    style={styles.nicknameInput}
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveNickname(); }}
                    placeholder="닉네임 (최대 20자)"
                    maxLength={20}
                    autoFocus
                  />
                  {nicknameError && (
                    <p style={styles.errorText}>{nicknameError}</p>
                  )}
                  <div style={styles.nicknameBtns}>
                    <button
                      style={{ ...styles.btn, ...styles.btnPrimary }}
                      onClick={saveNickname}
                      disabled={nicknameSaving}
                    >
                      {nicknameSaving ? '저장 중...' : '저장'}
                    </button>
                    <button
                      style={{ ...styles.btn, ...styles.btnGhost }}
                      onClick={() => {
                        setIsEditingNickname(false);
                        setNicknameInput(nickname);
                        setNicknameError('');
                      }}
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div style={styles.nicknameRow}>
                  <span style={styles.nickname}>
                    {nickname || '닉네임 없음'}
                  </span>
                  <button
                    style={styles.editBtn}
                    onClick={() => setIsEditingNickname(true)}
                    title="닉네임 수정"
                  >
                    ✏ 수정
                  </button>
                </div>
              )}
              <span style={styles.email}>{email}</span>
            </div>
          </div>
        </section>

        {/* 내 책 보관함 */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>내 책 보관함</h2>
            <button
              style={{ ...styles.btn, ...styles.btnPrimary }}
              onClick={() => router.push('/')}
            >
              + 새 책 만들기
            </button>
          </div>

          {booksLoading ? (
            <p style={styles.emptyText}>불러오는 중...</p>
          ) : books.length === 0 ? (
            <div style={styles.emptyCard}>
              <p style={styles.emptyText}>아직 작성한 책이 없어요.</p>
              <button
                style={{ ...styles.btn, ...styles.btnPrimary, marginTop: 16 }}
                onClick={() => router.push('/')}
              >
                첫 번째 책 시작하기
              </button>
            </div>
          ) : (
            <div style={styles.bookList}>
              {books.map((book) => (
                <div key={book.id} style={styles.bookCard}>
                  {/* 책 정보 */}
                  <div style={styles.bookMeta}>
                    <span style={styles.bookTitle}>{book.title}</span>
                    <span style={styles.bookInfo}>
                      {book.author} · 마지막 수정 {formatDate(book.updated_at)}
                    </span>
                    <span style={styles.bookInfo}>
                      챕터 {book.chapter_count}개
                    </span>
                  </div>

                  {/* 액션 버튼 */}
                  <div style={styles.bookActions}>
                    <button
                      style={{ ...styles.btn, ...styles.btnPrimary }}
                      onClick={() => continueBook(book.id)}
                    >
                      이어쓰기
                    </button>
                    <button
                      style={{ ...styles.btn, ...styles.btnOutline }}
                      onClick={() => toggleChapters(book.id)}
                    >
                      챕터 목록 {expandedBook === book.id ? '▲' : '▼'}
                    </button>
                    <button
                      style={{ ...styles.btn, ...styles.btnDanger }}
                      onClick={() => {
                        setDeleteTarget(book);
                        setDeleteConfirmed(false);
                      }}
                    >
                      삭제
                    </button>
                  </div>

                  {/* 챕터 아코디언 */}
                  {expandedBook === book.id && (
                    <div style={styles.chapterList}>
                      {chaptersLoading === book.id ? (
                        <p style={styles.chapterItem}>불러오는 중...</p>
                      ) : (chaptersMap[book.id] || []).length === 0 ? (
                        <p style={styles.chapterItem}>챕터가 없습니다.</p>
                      ) : (
                        (chaptersMap[book.id] || []).map((ch, idx) => (
                          <button
                            key={ch.id}
                            style={styles.chapterRow}
                            onClick={() => continueChapter(book.id, idx)}
                          >
                            <span style={styles.chapterNum}>
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span style={styles.chapterTitle}>{ch.title}</span>
                            <span style={{
                              ...styles.chapterBadge,
                              ...(ch.is_done ? styles.badgeDone : styles.badgePending),
                            }}>
                              {ch.is_done ? '완료' : '작성 중'}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 로그아웃 */}
        <section style={styles.section}>
          <button
            style={{ ...styles.btn, ...styles.btnLogout }}
            onClick={handleLogout}
          >
            로그아웃
          </button>
        </section>
      </div>

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>책을 삭제할까요?</h2>
            <p style={styles.modalBody}>
              「{deleteTarget.title}」을 삭제하면 모든 챕터와 내용이 사라집니다.
              <br />이 작업은 되돌릴 수 없습니다.
            </p>

            {!deleteConfirmed ? (
              <div style={styles.modalBtns}>
                <button
                  style={{ ...styles.btn, ...styles.btnDanger, flex: 1 }}
                  onClick={() => setDeleteConfirmed(true)}
                >
                  네, 삭제하겠습니다
                </button>
                <button
                  style={{ ...styles.btn, ...styles.btnGhost, flex: 1 }}
                  onClick={() => setDeleteTarget(null)}
                >
                  취소
                </button>
              </div>
            ) : (
              <div style={styles.modalBtns}>
                <p style={styles.confirmText}>
                  정말 삭제합니다. 아래 버튼을 한 번 더 눌러주세요.
                </p>
                <button
                  style={{ ...styles.btn, ...styles.btnDangerFull }}
                  onClick={deleteBook}
                  disabled={deleting}
                >
                  {deleting ? '삭제 중...' : '최종 삭제'}
                </button>
                <button
                  style={{ ...styles.btn, ...styles.btnGhost, width: '100%' }}
                  onClick={() => { setDeleteTarget(null); setDeleteConfirmed(false); }}
                >
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

/* ─────────────────────────────────────────────────────────────────────────
   스타일 (어르신 UI — 큰 폰트, 넉넉한 터치 타깃)
───────────────────────────────────────────────────────────────────────── */

const BROWN = '#7c5c3e';
const LIGHT_BROWN = '#f5ede3';
const BORDER = '#e0cfc0';
const DANGER = '#c0392b';
const DANGER_LIGHT = '#fdf0ee';
const TEXT_MAIN = '#3a2a1a';
const TEXT_SUB = '#8c7a6a';

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#fdf8f3',
    fontFamily: "'Noto Serif KR', Georgia, serif",
    color: TEXT_MAIN,
  },
  loadingWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#fdf8f3',
  },
  loadingText: {
    fontSize: 18,
    color: TEXT_SUB,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    background: '#fff',
    borderBottom: `1px solid ${BORDER}`,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    fontSize: 16,
    color: BROWN,
    cursor: 'pointer',
    padding: '8px 4px',
    minHeight: 44,
    minWidth: 80,
    textAlign: 'left',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
    color: TEXT_MAIN,
  },
  content: {
    maxWidth: 640,
    margin: '0 auto',
    padding: '20px 16px 60px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },

  /* 카드 */
  card: {
    background: '#fff',
    borderRadius: 12,
    border: `1px solid ${BORDER}`,
    padding: 20,
  },
  profileRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: BROWN,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: 700,
    flexShrink: 0,
  },
  profileInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  nicknameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  nickname: {
    fontSize: 20,
    fontWeight: 700,
    color: TEXT_MAIN,
  },
  editBtn: {
    background: 'none',
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 13,
    color: BROWN,
    cursor: 'pointer',
    minHeight: 32,
  },
  email: {
    fontSize: 15,
    color: TEXT_SUB,
  },
  nicknameEditWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  nicknameInput: {
    border: `2px solid ${BROWN}`,
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 18,
    outline: 'none',
    color: TEXT_MAIN,
    fontFamily: "'Noto Serif KR', Georgia, serif",
  },
  nicknameBtns: {
    display: 'flex',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: DANGER,
    margin: 0,
  },

  /* 섹션 */
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
    color: TEXT_MAIN,
  },

  /* 책 목록 */
  bookList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  bookCard: {
    background: '#fff',
    borderRadius: 12,
    border: `1px solid ${BORDER}`,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  bookMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: TEXT_MAIN,
  },
  bookInfo: {
    fontSize: 14,
    color: TEXT_SUB,
  },
  bookActions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },

  /* 챕터 아코디언 */
  chapterList: {
    borderTop: `1px solid ${BORDER}`,
    paddingTop: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  chapterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 8px',
    background: LIGHT_BROWN,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    minHeight: 52,
    fontFamily: "'Noto Serif KR', Georgia, serif",
  },
  chapterItem: {
    fontSize: 14,
    color: TEXT_SUB,
    padding: '8px 0',
  },
  chapterNum: {
    fontSize: 13,
    color: TEXT_SUB,
    fontWeight: 700,
    minWidth: 28,
  },
  chapterTitle: {
    flex: 1,
    fontSize: 16,
    color: TEXT_MAIN,
  },
  chapterBadge: {
    fontSize: 12,
    padding: '3px 8px',
    borderRadius: 12,
    fontWeight: 600,
  },
  badgeDone: {
    background: '#e8f5e9',
    color: '#2e7d32',
  },
  badgePending: {
    background: '#fff3e0',
    color: '#e65100',
  },

  /* 빈 상태 */
  emptyCard: {
    background: '#fff',
    borderRadius: 12,
    border: `1px solid ${BORDER}`,
    padding: 32,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: TEXT_SUB,
    textAlign: 'center',
    margin: 0,
  },

  /* 버튼 공통 */
  btn: {
    border: 'none',
    borderRadius: 8,
    padding: '12px 18px',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    minHeight: 52,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Noto Serif KR', Georgia, serif",
    whiteSpace: 'nowrap',
    transition: 'opacity 0.15s',
  },
  btnPrimary: {
    background: BROWN,
    color: '#fff',
  },
  btnOutline: {
    background: '#fff',
    color: BROWN,
    border: `1.5px solid ${BROWN}`,
  },
  btnGhost: {
    background: LIGHT_BROWN,
    color: TEXT_MAIN,
  },
  btnDanger: {
    background: DANGER_LIGHT,
    color: DANGER,
    border: `1px solid #f5c6c0`,
  },
  btnDangerFull: {
    background: DANGER,
    color: '#fff',
    width: '100%',
    padding: '16px',
    fontSize: 18,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    minHeight: 56,
    fontFamily: "'Noto Serif KR', Georgia, serif",
    fontWeight: 700,
  },
  btnLogout: {
    background: LIGHT_BROWN,
    color: TEXT_SUB,
    width: '100%',
    fontSize: 17,
  },

  /* 삭제 모달 */
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 100,
    padding: 16,
  },
  modal: {
    background: '#fff',
    borderRadius: '16px 16px 0 0',
    padding: 28,
    width: '100%',
    maxWidth: 480,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
    color: TEXT_MAIN,
  },
  modalBody: {
    fontSize: 16,
    color: TEXT_SUB,
    lineHeight: 1.6,
    margin: 0,
  },
  modalBtns: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  confirmText: {
    fontSize: 15,
    color: DANGER,
    margin: 0,
    padding: '8px 0',
  },
};
