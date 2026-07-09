-- ============================================
-- Supabase Auth + AIレシピチャット + 適当レシピ集
-- Supabase SQL Editor で実行してください
-- ============================================

-- ユーザープロフィール
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AIレシピ相談のチャットセッション
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '新しいレシピ相談',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- チャットメッセージ
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- チャットから生まれた「大学生らしい適当レシピ」
CREATE TABLE IF NOT EXISTS casual_recipes (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                  TEXT NOT NULL,
  description            TEXT,
  ingredients            TEXT[] NOT NULL DEFAULT '{}',
  steps                  TEXT[] NOT NULL DEFAULT '{}',
  estimated_cost         INTEGER,
  cooking_time_minutes   INTEGER,
  difficulty             TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy', 'normal', 'hard')),
  vibe                   TEXT NOT NULL DEFAULT '大学生の適当レシピ',
  tags                   TEXT[] NOT NULL DEFAULT '{}',
  source_session_id      UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- RLS: 自分のデータだけ読み書きできるようにする
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE casual_recipes ENABLE ROW LEVEL SECURITY;

-- profiles: 自分のprofileだけ select / insert / update
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- chat_sessions: 自分のセッションだけ select / insert / update / delete
DROP POLICY IF EXISTS "chat_sessions_select_own" ON chat_sessions;
CREATE POLICY "chat_sessions_select_own" ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_sessions_insert_own" ON chat_sessions;
CREATE POLICY "chat_sessions_insert_own" ON chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_sessions_update_own" ON chat_sessions;
CREATE POLICY "chat_sessions_update_own" ON chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_sessions_delete_own" ON chat_sessions;
CREATE POLICY "chat_sessions_delete_own" ON chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- chat_messages: 自分のメッセージだけ select / insert / update / delete
DROP POLICY IF EXISTS "chat_messages_select_own" ON chat_messages;
CREATE POLICY "chat_messages_select_own" ON chat_messages
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_messages_insert_own" ON chat_messages;
CREATE POLICY "chat_messages_insert_own" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_messages_update_own" ON chat_messages;
CREATE POLICY "chat_messages_update_own" ON chat_messages
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_messages_delete_own" ON chat_messages;
CREATE POLICY "chat_messages_delete_own" ON chat_messages
  FOR DELETE USING (auth.uid() = user_id);

-- casual_recipes: 自分のレシピだけ select / insert / update / delete
DROP POLICY IF EXISTS "casual_recipes_select_own" ON casual_recipes;
CREATE POLICY "casual_recipes_select_own" ON casual_recipes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "casual_recipes_insert_own" ON casual_recipes;
CREATE POLICY "casual_recipes_insert_own" ON casual_recipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "casual_recipes_update_own" ON casual_recipes;
CREATE POLICY "casual_recipes_update_own" ON casual_recipes
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "casual_recipes_delete_own" ON casual_recipes;
CREATE POLICY "casual_recipes_delete_own" ON casual_recipes
  FOR DELETE USING (auth.uid() = user_id);
