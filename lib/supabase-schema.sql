-- 나의이야기 DB 스키마
-- Supabase SQL Editor에서 이 파일 전체를 복사해서 실행하세요.

-- 1. 책 (사용자 1명 = 책 1권+)
CREATE TABLE IF NOT EXISTS books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '나의 이야기',
  author TEXT NOT NULL DEFAULT '',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 챕터
CREATE TABLE IF NOT EXISTS chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  topic_id TEXT NOT NULL,
  title TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_custom BOOLEAN DEFAULT false,
  mode TEXT DEFAULT 'chat' CHECK (mode IN ('chat', 'normal')),
  prose TEXT DEFAULT '',
  is_done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 대화 메시지
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ai', 'user', 'photo', 'system')),
  text TEXT DEFAULT '',
  photo_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 사진
CREATE TABLE IF NOT EXISTS photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_chapters_book ON chapters(book_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_messages_chapter ON messages(chapter_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_photos_chapter ON photos(chapter_id, sort_order);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER books_updated_at
  BEFORE UPDATE ON books FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER chapters_updated_at
  BEFORE UPDATE ON chapters FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS (Row Level Security) — 인증 없이 공개 접근 허용 (MVP)
-- 프로덕션에서는 인증 후 사용자별 접근 제한 필요
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "books_public" ON books FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chapters_public" ON chapters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "messages_public" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "photos_public" ON photos FOR ALL USING (true) WITH CHECK (true);
