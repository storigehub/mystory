import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

interface SyncMessage {
  id: string;
  type: 'user' | 'assistant' | 'photo';
  text: string;
  timestamp?: number;
}

interface SyncPhoto {
  id: string;
  data: string; // base64
  caption?: string;
}

interface SyncChapter {
  id: string;        // local id (ch-xxxx)
  tid: string;
  title: string;
  custom: boolean;
  mode: 'chat' | 'normal';
  messages: SyncMessage[];
  prose: string;
  photos: SyncPhoto[];
  done: boolean;
  dbId?: string;     // Supabase UUID (있으면 업데이트, 없으면 생성)
}

interface SyncBody {
  title: string;
  author: string;
  chapters: SyncChapter[];
}

/**
 * POST /api/books/[id]/sync
 * 전체 책 상태를 Supabase에 동기화
 * - 챕터 upsert
 * - 메시지 upsert
 * - 사진은 base64 URL 그대로 저장 (MVP; 추후 S3 이전)
 *
 * Returns: { chapterIdMap: Record<localId, dbId> }
 * → 클라이언트에서 dbId를 로컬 상태에 저장해 다음 sync에 활용
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body: SyncBody = await req.json();
    const supabase = createServerClient();
    const bookId = params.id;

    // 1. 책 메타데이터 업데이트
    const { error: bookErr } = await supabase
      .from('books')
      .update({ title: body.title, author: body.author })
      .eq('id', bookId);

    if (bookErr) {
      return NextResponse.json({ error: bookErr.message }, { status: 500 });
    }

    // 2. 기존 챕터 목록 가져오기 (localId → dbId 매핑용)
    const { data: existingChapters } = await supabase
      .from('chapters')
      .select('id, topic_id')
      .eq('book_id', bookId);

    const existingIds = new Set((existingChapters || []).map((c) => c.id));
    const chapterIdMap: Record<string, string> = {};

    // 3. 챕터 upsert
    for (let i = 0; i < body.chapters.length; i++) {
      const ch = body.chapters[i];

      let dbChapterId = ch.dbId;

      if (dbChapterId && existingIds.has(dbChapterId)) {
        // 기존 챕터 업데이트
        await supabase
          .from('chapters')
          .update({
            title: ch.title,
            sort_order: i,
            mode: ch.mode,
            prose: ch.prose,
            is_done: ch.done,
          })
          .eq('id', dbChapterId);
      } else {
        // 새 챕터 생성
        const { data: newCh } = await supabase
          .from('chapters')
          .insert({
            book_id: bookId,
            topic_id: ch.tid,
            title: ch.title,
            sort_order: i,
            is_custom: ch.custom,
            mode: ch.mode,
            prose: ch.prose,
            is_done: ch.done,
          })
          .select()
          .single();

        if (newCh) dbChapterId = newCh.id;
      }

      if (!dbChapterId) continue;
      chapterIdMap[ch.id] = dbChapterId;

      // 4. 메시지 동기화 (전체 삭제 후 재삽입 — 단순 MVP 방식)
      if (ch.messages.length > 0) {
        await supabase.from('messages').delete().eq('chapter_id', dbChapterId);

        const msgRows = ch.messages.map((m, idx) => ({
          chapter_id: dbChapterId!,
          type: m.type === 'assistant' ? 'ai' : m.type,
          text: m.text,
          sort_order: idx,
        }));

        await supabase.from('messages').insert(msgRows);
      }

      // 5. 사진 동기화 (normal mode photos)
      if (ch.photos.length > 0) {
        await supabase.from('photos').delete().eq('chapter_id', dbChapterId);

        const photoRows = ch.photos.map((p, idx) => ({
          chapter_id: dbChapterId!,
          url: p.data, // base64 URL (MVP; 추후 S3)
          caption: p.caption || '',
          sort_order: idx,
        }));

        await supabase.from('photos').insert(photoRows);
      }
    }

    // 6. 삭제된 챕터 처리 (DB에는 있지만 현재 상태에 없는 챕터)
    const currentDbIds = new Set(Object.values(chapterIdMap));
    const toDelete = (existingChapters || [])
      .map((c) => c.id)
      .filter((id) => !currentDbIds.has(id));

    if (toDelete.length > 0) {
      await supabase.from('chapters').delete().in('id', toDelete);
    }

    return NextResponse.json({ success: true, chapterIdMap });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '서버 오류';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
