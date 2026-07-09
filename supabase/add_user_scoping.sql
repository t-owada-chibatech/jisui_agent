-- ============================================
-- 食材・レシピ・予算・買い物リストをユーザーごとに分離する
-- Supabase SQL Editor で実行してください
-- ============================================

-- ------------------------------------------------
-- 1. 持ち主のいない既存のサンプル・動作確認用データを削除
--    （user_id を追加した後は誰にも見えなくなるため、先に削除する）
-- ------------------------------------------------
DELETE FROM shopping_items;
DELETE FROM recipes;              -- recipe_ingredients / recipe_steps はCASCADEで削除される
DELETE FROM budget_records;
DELETE FROM monthly_budgets;
DELETE FROM weekly_budgets;
DELETE FROM ingredients;

-- ------------------------------------------------
-- 2. user_id カラムを追加
-- ------------------------------------------------
ALTER TABLE ingredients      ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE recipes          ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE monthly_budgets  ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE weekly_budgets   ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE budget_records   ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE shopping_items   ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

-- ------------------------------------------------
-- 3. 月次・週次予算のUNIQUE制約を「ユーザーごと」に直す
--    （そのままだと、ある月の予算を設定できるユーザーが1人だけになってしまう）
-- ------------------------------------------------
ALTER TABLE monthly_budgets DROP CONSTRAINT IF EXISTS monthly_budgets_year_month_key;
ALTER TABLE monthly_budgets ADD CONSTRAINT monthly_budgets_user_year_month_key UNIQUE (user_id, year_month);

ALTER TABLE weekly_budgets DROP CONSTRAINT IF EXISTS weekly_budgets_week_start_key;
ALTER TABLE weekly_budgets ADD CONSTRAINT weekly_budgets_user_week_start_key UNIQUE (user_id, week_start);

-- ------------------------------------------------
-- 4. RLSを有効化
-- ------------------------------------------------
ALTER TABLE ingredients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_steps       ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_budgets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_budgets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items     ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------
-- 5. ポリシー：自分の行だけ select / insert / update / delete
-- ------------------------------------------------

-- ingredients
DROP POLICY IF EXISTS "ingredients_own" ON ingredients;
CREATE POLICY "ingredients_own" ON ingredients
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- recipes
DROP POLICY IF EXISTS "recipes_own" ON recipes;
CREATE POLICY "recipes_own" ON recipes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- recipe_ingredients / recipe_steps（親レシピの持ち主で判定）
DROP POLICY IF EXISTS "recipe_ingredients_own" ON recipe_ingredients;
CREATE POLICY "recipe_ingredients_own" ON recipe_ingredients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_ingredients.recipe_id AND r.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_ingredients.recipe_id AND r.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "recipe_steps_own" ON recipe_steps;
CREATE POLICY "recipe_steps_own" ON recipe_steps
  FOR ALL USING (
    EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_steps.recipe_id AND r.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_steps.recipe_id AND r.user_id = auth.uid())
  );

-- monthly_budgets
DROP POLICY IF EXISTS "monthly_budgets_own" ON monthly_budgets;
CREATE POLICY "monthly_budgets_own" ON monthly_budgets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- weekly_budgets
DROP POLICY IF EXISTS "weekly_budgets_own" ON weekly_budgets;
CREATE POLICY "weekly_budgets_own" ON weekly_budgets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- budget_records
DROP POLICY IF EXISTS "budget_records_own" ON budget_records;
CREATE POLICY "budget_records_own" ON budget_records
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- shopping_items
DROP POLICY IF EXISTS "shopping_items_own" ON shopping_items;
CREATE POLICY "shopping_items_own" ON shopping_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
