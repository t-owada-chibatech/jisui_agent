-- AIレシピ提案をRAG化するための変更
-- casual_recipes を「ユーザー投稿 + AI生成レシピ」両方の蓄積先にし、
-- ベクトル検索で似たレシピを再利用できるようにする。
-- Supabase SQL Editor で実行してください。

-- pgvector拡張を有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- casual_recipes に RAG用カラムを追加
ALTER TABLE casual_recipes
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'user_posted',
  ADD COLUMN IF NOT EXISTS search_text TEXT,
  ADD COLUMN IF NOT EXISTS embedding VECTOR(768),
  ADD COLUMN IF NOT EXISTS usage_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

ALTER TABLE casual_recipes DROP CONSTRAINT IF EXISTS casual_recipes_source_check;
ALTER TABLE casual_recipes
  ADD CONSTRAINT casual_recipes_source_check
  CHECK (source IN ('user_posted', 'ai_generated', 'rakuten_based'));

-- 類似検索用のベクトルインデックス（embeddingがnullの行は対象外）
CREATE INDEX IF NOT EXISTS casual_recipes_embedding_idx
  ON casual_recipes USING hnsw (embedding vector_cosine_ops);

-- ベクトル類似検索RPC（supabase-jsの.rpc()から呼び出す）
-- SELECTは既存の共有ポリシー(casual_recipes_select_shared)がそのまま効く
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
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    cr.id, cr.title, cr.description, cr.ingredients, cr.steps,
    cr.estimated_cost, cr.cooking_time_minutes, cr.difficulty, cr.vibe, cr.tags,
    cr.photo_url, cr.source, cr.usage_count, cr.created_at,
    1 - (cr.embedding <=> query_embedding) AS similarity
  FROM casual_recipes cr
  WHERE cr.embedding IS NOT NULL
    AND 1 - (cr.embedding <=> query_embedding) > min_similarity
  ORDER BY cr.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 再利用されたレシピの usage_count / last_used_at を更新するRPC。
-- 共有DBのため他ユーザーのレシピも対象になるので、統計更新だけに絞ってSECURITY DEFINERにする。
CREATE OR REPLACE FUNCTION increment_casual_recipe_usage(target_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE casual_recipes
  SET usage_count = usage_count + 1,
      last_used_at = NOW()
  WHERE id = target_id;
$$;

GRANT EXECUTE ON FUNCTION increment_casual_recipe_usage(UUID) TO authenticated;
