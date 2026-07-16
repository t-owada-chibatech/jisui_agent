-- ============================================
-- 新規登録時にユーザーネーム(display_name)を必須で設定させ、
-- 適当レシピ集に「誰が投稿したか」を表示できるようにする。
-- Supabase SQL Editor で実行してください（add_recipe_rag.sql の後に実行）。
-- ============================================

-- ------------------------------------------------
-- 1. 新規ユーザー登録時、signUpのoptions.dataに渡したdisplay_nameを
--    自動でprofilesに反映するトリガー
--    （メール確認が有効でも、確認前からdisplay_nameを引ける）
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ------------------------------------------------
-- 2. 既存ユーザーのprofile行がなければ作っておく（バックフィル）
--    以後のFK制約・NOT NULL制約のために先に行う
-- ------------------------------------------------
INSERT INTO profiles (id, display_name)
SELECT u.id, split_part(u.email, '@', 1)
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL;

UPDATE profiles SET display_name = 'ユーザー' WHERE display_name IS NULL;
ALTER TABLE profiles ALTER COLUMN display_name SET NOT NULL;

-- ------------------------------------------------
-- 3. profilesの投稿者名を全員が読めるようにする
--    （casual_recipesが共有DBのため、誰が投稿したか表示するのに必要）
-- ------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_shared" ON profiles;
CREATE POLICY "profiles_select_shared" ON profiles
  FOR SELECT USING (true);

-- ------------------------------------------------
-- 4. casual_recipes.user_id から profiles への外部キーを追加
--    （select("*, profiles(display_name)")で投稿者名を結合するため）
-- ------------------------------------------------
ALTER TABLE casual_recipes DROP CONSTRAINT IF EXISTS casual_recipes_user_id_profiles_fkey;
ALTER TABLE casual_recipes
  ADD CONSTRAINT casual_recipes_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ------------------------------------------------
-- 5. match_casual_recipes RPC（AIレシピ提案のRAG検索）にも投稿者名を含める
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
  author_name TEXT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    cr.id, cr.title, cr.description, cr.ingredients, cr.steps,
    cr.estimated_cost, cr.cooking_time_minutes, cr.difficulty, cr.vibe, cr.tags,
    cr.photo_url, cr.source, cr.usage_count, cr.created_at,
    1 - (cr.embedding <=> query_embedding) AS similarity,
    cr.user_id,
    p.display_name AS author_name
  FROM casual_recipes cr
  LEFT JOIN profiles p ON p.id = cr.user_id
  WHERE cr.embedding IS NOT NULL
    AND 1 - (cr.embedding <=> query_embedding) > min_similarity
  ORDER BY cr.embedding <=> query_embedding
  LIMIT match_count;
$$;
