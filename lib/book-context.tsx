'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';

/* ─────────────────────────────────────────────────────────────────────────
   타입 정의
───────────────────────────────────────────────────────────────────────── */

export interface Photo {
  id: string;
  data: string; // base64 data url
  caption?: string;
  isFeatured?: boolean; // 대표사진: 챕터 섹션 헤더 배경으로 사용
}

export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'photo';
  text: string; // photo type → base64 data url
  timestamp?: number;
  source?: 'ai' | 'interviewer'; // 질문 출처: AI vs 인터뷰어
}

export interface Chapter {
  id: string;       // 로컬 id (ch-xxxx)
  dbId?: string;    // Supabase UUID
  tid: string;      // topic id
  title: string;
  custom: boolean;
  mode: 'chat' | 'normal';
  messages: Message[];
  prose: string;
  photos: Photo[];
  done: boolean;
}

export type CoverTemplateId = 'classic' | 'dawn' | 'sunset' | 'spring' | 'forest' | 'rose';

export interface BookState {
  // 책 메타
  bookId: string | null; // Supabase books.id
  title: string;
  author: string;
  createdAt: string;
  coverTemplateId: CoverTemplateId; // 표지 템플릿
  coverPhotoUrl: string;  // 커스텀 커버 사진 URL (비어있으면 템플릿 사용)
  coverLayout: string;    // 사진 커버 레이아웃 ID

  // 챕터
  selectedTopics: Array<{ id: string; title: string; custom: boolean }>;
  chapters: Chapter[];
  currentChapterIdx: number;

  // 설정
  fontSize: 'normal' | 'large';
  sttMode: 'browser' | 'whisper' | 'off';
  autoSendAudio: boolean;
}

export const DEFAULT_BOOK_STATE: BookState = {
  bookId: null,
  title: '나의 이야기',
  author: '',
  createdAt: new Date().toISOString(),
  coverTemplateId: 'classic',
  coverPhotoUrl: '',
  coverLayout: 'topleft',
  selectedTopics: [],
  chapters: [],
  currentChapterIdx: 0,
  fontSize: 'normal',
  sttMode: 'browser',
  autoSendAudio: true,
};

interface BookContextType {
  state: BookState;
  isSyncing: boolean;
  syncError: string | null;

  // 책 메타
  setTitle: (title: string) => void;
  setAuthor: (author: string) => void;

  // 주제 & 챕터
  setSelectedTopics: (topics: BookState['selectedTopics']) => void;
  buildChapters: () => void;
  reorderChapter: (fromIdx: number, toIdx: number) => void;
  removeChapter: (idx: number) => void;
  setCurrentChapterIdx: (idx: number) => void;

  // 챕터 내용
  addMessage: (chapterIdx: number, message: Message) => void;
  setProse: (chapterIdx: number, prose: string) => void;
  addPhoto: (chapterIdx: number, photo: Photo) => void;
  removePhoto: (chapterIdx: number, photoId: string) => void;
  updatePhotoCaption: (chapterIdx: number, photoId: string, caption: string) => void;
  setPhotoFeatured: (chapterIdx: number, photoId: string, featured: boolean) => void;
  setChapterMode: (chapterIdx: number, mode: 'chat' | 'normal') => void;
  markChapterDone: (chapterIdx: number) => void;

  // 설정
  setFontSize: (size: 'normal' | 'large') => void;
  setSTTMode: (mode: 'browser' | 'whisper' | 'off') => void;
  setAutoSendAudio: (enabled: boolean) => void;
  setCoverTemplateId: (id: CoverTemplateId) => void;
  setCoverPhotoUrl: (url: string) => void;
  setCoverLayout: (layout: string) => void;

  // DB
  syncToDb: () => Promise<void>;
  resetBook: () => void;
  restoreFromDb: (bookId: string) => Promise<boolean>;
}

/* ─────────────────────────────────────────────────────────────────────────
   localStorage 헬퍼 (userId별 격리)
───────────────────────────────────────────────────────────────────────── */

const GUEST_STORAGE_KEY = 'mystory_book_state_guest';

function getStorageKey(userId: string | null | undefined): string {
  return userId ? `mystory_book_state_${userId}` : GUEST_STORAGE_KEY;
}

function loadState(userId: string | null | undefined): BookState {
  if (typeof window === 'undefined') return DEFAULT_BOOK_STATE;
  try {
    const key = getStorageKey(userId);
    const saved = localStorage.getItem(key);
    if (saved) {
      return { ...DEFAULT_BOOK_STATE, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('localStorage 로드 실패:', e);
  }
  return DEFAULT_BOOK_STATE;
}

function saveState(state: BookState, userId: string | null | undefined) {
  if (typeof window === 'undefined') return;
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    console.warn('localStorage 저장 실패:', e);
  }
}

function clearState(userId: string | null | undefined) {
  if (typeof window === 'undefined') return;
  try {
    const key = getStorageKey(userId);
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('localStorage 삭제 실패:', e);
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Supabase 설정 여부 확인
───────────────────────────────────────────────────────────────────────── */

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Provider
───────────────────────────────────────────────────────────────────────── */

const BookContext = createContext<BookContextType | undefined>(undefined);

export function BookProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const userId = (session?.user as { id?: string })?.id ?? null;

  const [state, setState] = useState<BookState>(DEFAULT_BOOK_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // 자동 DB 동기화용 debounce 타이머
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 마지막으로 DB에 동기화한 상태 (변경 감지용)
  const lastSyncedRef = useRef<string>('');
  // 마지막으로 로드한 userId (변경 감지용)
  const lastUserIdRef = useRef<string | null>(undefined as unknown as null);

  /* ── 초기 로드 (클라이언트 하이드레이션) ── */
  useEffect(() => {
    if (status === 'loading') return; // 세션 로딩 중 대기
    setState(loadState(userId));
    lastUserIdRef.current = userId;
    setIsHydrated(true);
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 로그인 시 guest → user 마이그레이션 ── */
  useEffect(() => {
    if (!isHydrated) return;
    if (!userId) return;
    if (lastUserIdRef.current === userId) return; // 이미 처리됨

    const userKey = getStorageKey(userId);
    const guestData = localStorage.getItem(GUEST_STORAGE_KEY);
    const userData = localStorage.getItem(userKey);

    if (guestData && !userData) {
      // 비회원 상태를 회원 키로 마이그레이션
      localStorage.setItem(userKey, guestData);
    }

    // 회원 상태로 교체
    setState(loadState(userId));
    lastUserIdRef.current = userId;
    lastSyncedRef.current = '';
  }, [userId, isHydrated]);

  /* ── localStorage 자동 저장 (500ms 디바운스) ── */
  useEffect(() => {
    if (!isHydrated) return;
    const t = setTimeout(() => saveState(state, userId), 500);
    return () => clearTimeout(t);
  }, [state, isHydrated, userId]);

  /* ── Supabase 자동 동기화 (2s 디바운스, 로그인+설정된 경우만) ── */
  useEffect(() => {
    if (!isHydrated) return;
    if (!isSupabaseConfigured()) return;
    if (!state.bookId) return;
    if (!userId) return; // 비로그인 시 자동 sync 하지 않음

    const serialized = JSON.stringify({
      title: state.title,
      author: state.author,
      coverTemplateId: state.coverTemplateId,
      coverPhotoUrl: state.coverPhotoUrl,
      coverLayout: state.coverLayout,
      chapters: state.chapters,
    });

    if (serialized === lastSyncedRef.current) return;

    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      syncToDbInternal(state);
    }, 2000);

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.title, state.author, state.coverTemplateId, state.coverPhotoUrl, state.coverLayout, state.chapters, isHydrated, userId]);

  /* ── 내부 동기화 함수 ── */
  const syncToDbInternal = useCallback(async (currentState: BookState) => {
    if (!currentState.bookId) return;

    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch(`/api/books/${currentState.bookId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentState.title,
          author: currentState.author,
          coverTemplateId: currentState.coverTemplateId,
          coverPhotoUrl: currentState.coverPhotoUrl,
          coverLayout: currentState.coverLayout,
          chapters: currentState.chapters,
        }),
      });

      // 비로그인(401) 또는 권한 없음(403)이면 조용히 무시 (localStorage만 사용)
      if (res.status === 401 || res.status === 403) {
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '동기화 실패');
      }

      const { chapterIdMap } = await res.json();

      if (chapterIdMap && Object.keys(chapterIdMap).length > 0) {
        setState((prev) => ({
          ...prev,
          chapters: prev.chapters.map((ch) =>
            chapterIdMap[ch.id] ? { ...ch, dbId: chapterIdMap[ch.id] } : ch
          ),
        }));
      }

      lastSyncedRef.current = JSON.stringify({
        title: currentState.title,
        author: currentState.author,
        coverTemplateId: currentState.coverTemplateId,
        coverPhotoUrl: currentState.coverPhotoUrl,
        coverLayout: currentState.coverLayout,
        chapters: currentState.chapters,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '동기화 오류';
      setSyncError(msg);
      console.warn('Supabase 동기화 오류:', msg);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /* ── 수동 동기화 ── */
  const syncToDb = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      console.info('Supabase가 설정되지 않아 로컬에만 저장합니다.');
      return;
    }

    // bookId가 없으면 먼저 책 생성
    if (!state.bookId) {
      setIsSyncing(true);
      setSyncError(null);
      try {
        const res = await fetch('/api/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: state.title, author: state.author }),
        });

        // 비로그인 시 조용히 무시 (localStorage만)
        if (res.status === 401) {
          return;
        }

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || '책 생성 실패');
        }

        const { book } = await res.json();
        setState((prev) => ({ ...prev, bookId: book.id }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : '책 생성 오류';
        setSyncError(msg);
      } finally {
        setIsSyncing(false);
      }
      return;
    }

    await syncToDbInternal(state);
  }, [state, syncToDbInternal]);

  /* ── 상태 업데이트 헬퍼 ── */
  const updateState = useCallback((updater: (prev: BookState) => BookState) => {
    setState((prev) => updater(prev));
  }, []);

  /* ── 책 초기화 (로그아웃 또는 새 책 시작 시) ── */
  const resetBook = useCallback(() => {
    const fresh = { ...DEFAULT_BOOK_STATE, createdAt: new Date().toISOString() };
    setState(fresh);
    lastSyncedRef.current = '';
    // 현재 사용자의 localStorage도 초기화
    clearState(userId);
  }, [userId]);

  /* ── Supabase에서 복원 ── */
  const restoreFromDb = useCallback(async (bookId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/books/${bookId}`);
      if (!res.ok) return false;

      const { book, chapters: dbChapters } = await res.json();
      if (!book) return false;

      const chapters: Chapter[] = (dbChapters || [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((dbCh: any) => ({
          id: `ch-${Math.random().toString(36).slice(2, 10)}`,
          dbId: dbCh.id,
          tid: dbCh.topic_id || '',
          title: dbCh.title || '',
          custom: dbCh.is_custom || false,
          mode: (dbCh.mode as 'chat' | 'normal') || 'chat',
          messages: (dbCh.messages || [])
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((m: any) => ({
              id: Math.random().toString(36).slice(2, 10),
              type: (m.type === 'ai' || m.type === 'interviewer' ? 'assistant' : m.type) as 'user' | 'assistant' | 'photo',
              source: m.type === 'interviewer' ? 'interviewer' : m.type === 'ai' ? 'ai' : undefined,
              text: m.text || m.photo_url || '',
              timestamp: Date.now(),
            })),
          prose: dbCh.prose || '',
          photos: (dbCh.photos || [])
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((p: any) => ({
              id: Math.random().toString(36).slice(2, 10),
              data: p.url || '',
              caption: p.caption || '',
              isFeatured: p.is_featured ?? false,
            })),
          done: dbCh.is_done || false,
        }));

      const selectedTopics = chapters.map((ch) => ({
        id: ch.tid,
        title: ch.title,
        custom: ch.custom,
      }));

      setState((prev) => ({
        ...prev,
        bookId: book.id,
        title: book.title || '나의 이야기',
        author: book.author || '',
        coverTemplateId: (book.cover_template as CoverTemplateId) || 'classic',
        coverPhotoUrl: (book as any).cover_photo_url || '',
        coverLayout: (book as any).cover_layout || 'topleft',
        chapters,
        selectedTopics,
        currentChapterIdx: 0,
      }));

      lastSyncedRef.current = '';
      return true;
    } catch (err) {
      console.warn('Supabase 복원 실패:', err);
      return false;
    }
  }, []);

  /* ── Context Value ── */
  const value: BookContextType = {
    state,
    isSyncing,
    syncError,

    setTitle: (title) => updateState((prev) => ({ ...prev, title })),
    setAuthor: (author) => updateState((prev) => ({ ...prev, author })),

    setSelectedTopics: (selectedTopics) =>
      updateState((prev) => ({ ...prev, selectedTopics })),

    buildChapters: () =>
      updateState((prev) => {
        const chapters = prev.selectedTopics.map((topic) => ({
          id: `ch-${Math.random().toString(36).slice(2, 10)}`,
          tid: topic.id,
          title: topic.title,
          custom: topic.custom,
          mode: 'chat' as const,
          messages: [],
          prose: '',
          photos: [],
          done: false,
        }));
        return { ...prev, chapters };
      }),

    reorderChapter: (fromIdx, toIdx) =>
      updateState((prev) => {
        const chapters = [...prev.chapters];
        const [chapter] = chapters.splice(fromIdx, 1);
        chapters.splice(toIdx, 0, chapter);
        return { ...prev, chapters };
      }),

    removeChapter: (idx) =>
      updateState((prev) => ({
        ...prev,
        chapters: prev.chapters.filter((_, i) => i !== idx),
      })),

    setCurrentChapterIdx: (idx) =>
      updateState((prev) => ({ ...prev, currentChapterIdx: idx })),

    addMessage: (chapterIdx, message) =>
      updateState((prev) => {
        const chapters = prev.chapters.map((ch, i) =>
          i === chapterIdx
            ? { ...ch, messages: [...ch.messages, message] }
            : ch
        );
        return { ...prev, chapters };
      }),

    setProse: (chapterIdx, prose) =>
      updateState((prev) => {
        const chapters = prev.chapters.map((ch, i) =>
          i === chapterIdx ? { ...ch, prose } : ch
        );
        return { ...prev, chapters };
      }),

    addPhoto: (chapterIdx, photo) =>
      updateState((prev) => {
        const chapters = prev.chapters.map((ch, i) =>
          i === chapterIdx
            ? { ...ch, photos: [...ch.photos, photo] }
            : ch
        );
        return { ...prev, chapters };
      }),

    removePhoto: (chapterIdx, photoId) =>
      updateState((prev) => {
        const chapters = prev.chapters.map((ch, i) =>
          i === chapterIdx
            ? { ...ch, photos: ch.photos.filter((p) => p.id !== photoId) }
            : ch
        );
        return { ...prev, chapters };
      }),

    updatePhotoCaption: (chapterIdx, photoId, caption) =>
      updateState((prev) => {
        const chapters = prev.chapters.map((ch, i) =>
          i === chapterIdx
            ? {
                ...ch,
                photos: ch.photos.map((p) =>
                  p.id === photoId ? { ...p, caption } : p
                ),
              }
            : ch
        );
        return { ...prev, chapters };
      }),

    setPhotoFeatured: (chapterIdx, photoId, featured) =>
      updateState((prev) => {
        const chapters = prev.chapters.map((ch, i) =>
          i === chapterIdx
            ? {
                ...ch,
                // 대표사진은 챕터당 하나만 가능: 다른 사진 해제 후 선택
                photos: ch.photos.map((p) =>
                  p.id === photoId
                    ? { ...p, isFeatured: featured }
                    : { ...p, isFeatured: false }
                ),
              }
            : ch
        );
        return { ...prev, chapters };
      }),

    setChapterMode: (chapterIdx, mode) =>
      updateState((prev) => {
        const chapters = prev.chapters.map((ch, i) =>
          i === chapterIdx ? { ...ch, mode } : ch
        );
        return { ...prev, chapters };
      }),

    markChapterDone: (chapterIdx) =>
      updateState((prev) => {
        const chapters = prev.chapters.map((ch, i) =>
          i === chapterIdx ? { ...ch, done: true } : ch
        );
        return { ...prev, chapters };
      }),

    setFontSize: (fontSize) => updateState((prev) => ({ ...prev, fontSize })),
    setSTTMode: (sttMode) => updateState((prev) => ({ ...prev, sttMode })),
    setAutoSendAudio: (autoSendAudio) =>
      updateState((prev) => ({ ...prev, autoSendAudio })),
    setCoverTemplateId: (coverTemplateId) =>
      updateState((prev) => ({ ...prev, coverTemplateId })),
    setCoverPhotoUrl: (coverPhotoUrl) =>
      updateState((prev) => ({ ...prev, coverPhotoUrl })),
    setCoverLayout: (coverLayout) =>
      updateState((prev) => ({ ...prev, coverLayout })),

    syncToDb,
    resetBook,
    restoreFromDb,
  };

  return <BookContext.Provider value={value}>{children}</BookContext.Provider>;
}

/* ─────────────────────────────────────────────────────────────────────────
   Hook
───────────────────────────────────────────────────────────────────────── */

export function useBook() {
  const context = useContext(BookContext);
  if (!context) {
    throw new Error('useBook must be used within BookProvider');
  }
  return context;
}
