-- ============================================
-- マイページでユーザーのアバター画像を設定できるようにし、
-- 適当レシピ集で投稿者の顔写真を小さく表示できるようにする。
-- Supabase SQL Editor で実行してください（add_recipe_author_name.sql の後に実行）。
-- ============================================

-- ------------------------------------------------
-- 1. profilesにアバター画像URLカラムを追加
-- ------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ------------------------------------------------
-- 2. アバター画像アップロード用のストレージバケット（公開読み取り可・書き込みは本人のみ）
--    supabase/add_casual_recipe_photo.sqlと同じパターン
-- ------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatars_select_all" ON storage.objects;
CREATE POLICY "avatars_select_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- ------------------------------------------------
-- 3. match_casual_recipes RPC（AIレシピ提案のRAG検索）にもアバターURLを含める
-- ------------------------------------------------
DROP FUNCTION IF EXISTS match_casual_recipes(VECTOR(768), INT, FLOAT);

CREATE OR REPLACE FUNCTION match_casual_recipes(
  query_embedding VECTOR(768),
  match_count INT DEFAULT 5,
  min_similarity FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  ingredients TEXT[],
  steps TEXT[],
  estimated_cost INTEGER,
  cooking_time_minutes INTEGER,
  difficulty TEXT,
  vibe TEXT,
  tags TEXT[],
  photo_url TEXT,
  source TEXT,
  usage_count INTEGER,
  created_at TIMESTAMPTZ,
  similarity FLOAT,
  user_id UUID,
  author_name TEXT,
  author_avatar_url TEXT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    cr.id, cr.title, cr.description, cr.ingredients, cr.steps,
    cr.estimated_cost, cr.cooking_time_minutes, cr.difficulty, cr.vibe, cr.tags,
    cr.photo_url, cr.source, cr.usage_count, cr.created_at,
    1 - (cr.embedding <=> query_embedding) AS similarity,
    cr.user_id,
    p.display_name AS author_name,
    p.avatar_url AS author_avatar_url
  FROM casual_recipes cr
  LEFT JOIN profiles p ON p.id = cr.user_id
  WHERE cr.embedding IS NOT NULL
    AND 1 - (cr.embedding <=> query_embedding) > min_similarity
  ORDER BY cr.embedding <=> query_embedding
  LIMIT match_count;
$$;
