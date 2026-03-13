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

/* ─────────────────────────────────────────────────────────────────────────
   타입 정의
───────────────────────────────────────────────────────────────────────── */

export interface Photo {
  id: string;
  data: string; // base64 data url
  caption?: string;
}

export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'photo';
  text: string; // photo type → base64 data url
  timestamp?: number;
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

export interface BookState {
  // 책 메타
  bookId: string | null; // Supabase books.id
  title: string;
  author: string;
  createdAt: string;

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
  setChapterMode: (chapterIdx: number, mode: 'chat' | 'normal') => void;
  markChapterDone: (chapterIdx: number) => void;

  // 설정
  setFontSize: (size: 'normal' | 'large') => void;
  setSTTMode: (mode: 'browser' | 'whisper' | 'off') => void;
  setAutoSendAudio: (enabled: boolean) => void;

  // DB
  syncToDb: () => Promise<void>;
  resetBook: () => void;
  restoreFromDb: (bookId: string) => Promise<boolean>;
}

/* ─────────────────────────────────────────────────────────────────────────
   localStorage 헬퍼
───────────────────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'mystory_book_state';

function loadState(): BookState {
  if (typeof window === 'undefined') return DEFAULT_BOOK_STATE;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_BOOK_STATE, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('localStorage 로드 실패:', e);
  }
  return DEFAULT_BOOK_STATE;
}

function saveState(state: BookState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('localStorage 저장 실패:', e);
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
  const [state, setState] = useState<BookState>(DEFAULT_BOOK_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // 자동 DB 동기화용 debounce 타이머
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 마지막으로 DB에 동기화한 상태 (변경 감지용)
  const lastSyncedRef = useRef<string>('');

  /* ── 초기 로드 ── */
  useEffect(() => {
    setState(loadState());
    setIsHydrated(true);
  }, []);

  /* ── localStorage 자동 저장 (500ms 디바운스) ── */
  useEffect(() => {
    if (!isHydrated) return;
    const t = setTimeout(() => saveState(state), 500);
    return () => clearTimeout(t);
  }, [state, isHydrated]);

  /* ── Supabase 자동 동기화 (2s 디바운스, 설정된 경우만) ── */
  useEffect(() => {
    if (!isHydrated) return;
    if (!isSupabaseConfigured()) return;
    if (!state.bookId) return; // bookId 없으면 sync 불가

    const serialized = JSON.stringify({
      title: state.title,
      author: state.author,
      chapters: state.chapters,
    });

    // 변경이 없으면 skip
    if (serialized === lastSyncedRef.current) return;

    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      syncToDbInternal(state);
    }, 2000);

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.title, state.author, state.chapters, isHydrated]);

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
          chapters: currentState.chapters,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '동기화 실패');
      }

      const { chapterIdMap } = await res.json();

      // 로컬 챕터에 dbId 업데이트
      if (chapterIdMap && Object.keys(chapterIdMap).length > 0) {
        setState((prev) => ({
          ...prev,
          chapters: prev.chapters.map((ch) =>
            chapterIdMap[ch.id] ? { ...ch, dbId: chapterIdMap[ch.id] } : ch
          ),
        }));
      }

      // 마지막 동기화 상태 기록
      lastSyncedRef.current = JSON.stringify({
        title: currentState.title,
        author: currentState.author,
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

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || '책 생성 실패');
        }

        const { book } = await res.json();
        setState((prev) => ({ ...prev, bookId: book.id }));
        // bookId가 생기면 다음 effect에서 자동 sync됨
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

  /* ── 책 초기화 ── */
  const resetBook = useCallback(() => {
    const fresh = { ...DEFAULT_BOOK_STATE, createdAt: new Date().toISOString() };
    setState(fresh);
    lastSyncedRef.current = '';
  }, []);

  /* ── Supabase에서 복원 ── */
  const restoreFromDb = useCallback(async (bookId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/books/${bookId}`);
      if (!res.ok) return false;

      const { book, chapters: dbChapters } = await res.json();
      if (!book) return false;

      // Supabase 형식 → 로컬 Chapter 형식 변환
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
              // DB는 'ai'로 저장, 로컬은 'assistant'
              type: (m.type === 'ai' ? 'assistant' : m.type) as 'user' | 'assistant' | 'photo',
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
