// @ts-nocheck
import { createBrowserClient } from "./supabase";

const supabase = createBrowserClient();

/* ── Book ── */
export async function createBook(title: string, author: string) {
  const { data, error } = await supabase
    .from("books")
    .insert({ title, author })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getBook(id: string) {
  const { data, error } = await supabase
    .from("books")
    .select("*, chapters(*, messages(*), photos(*))")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateBook(id: string, updates: { title?: string; author?: string }) {
  const { error } = await supabase.from("books").update(updates).eq("id", id);
  if (error) throw error;
}

/* ── Chapters ── */
export async function createChapters(bookId: string, chapters: { topic_id: string; title: string; sort_order: number; is_custom: boolean }[]) {
  const rows = chapters.map(ch => ({ ...ch, book_id: bookId }));
  const { data, error } = await supabase.from("chapters").insert(rows).select();
  if (error) throw error;
  return data;
}

export async function updateChapter(id: string, updates: { prose?: string; mode?: string; is_done?: boolean; sort_order?: number }) {
  const { error } = await supabase.from("chapters").update(updates).eq("id", id);
  if (error) throw error;
}

/* ── Messages ── */
export async function addMessage(chapterId: string, msg: { type: string; text: string; photo_url?: string; sort_order: number }) {
  const { data, error } = await supabase
    .from("messages")
    .insert({ ...msg, chapter_id: chapterId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ── Photos ── */
export async function addPhoto(chapterId: string, url: string, caption: string, sortOrder: number) {
  const { data, error } = await supabase
    .from("photos")
    .insert({ chapter_id: chapterId, url, caption, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePhoto(id: string) {
  const { error } = await supabase.from("photos").delete().eq("id", id);
  if (error) throw error;
}

/* ── 최근 책 가져오기 (이어쓰기) ── */
export async function getLatestBook() {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
  return data;
}

export async function getBookWithChapters(bookId: string) {
  const { data: chapters, error } = await supabase
    .from("chapters")
    .select("*, messages(*, sort_order), photos(*, sort_order)")
    .eq("book_id", bookId)
    .order("sort_order");
  if (error) throw error;
  return chapters;
}
