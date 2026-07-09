-- casual_recipes を全ユーザーが閲覧できる「共有データベース」にする。
-- 書き込み（insert/update/delete）は引き続き自分の行だけに制限する。
-- Supabase SQL Editor で実行してください（add_auth_and_casual_recipes.sql の後に実行）。

DROP POLICY IF EXISTS "casual_recipes_select_own" ON casual_recipes;

CREATE POLICY "casual_recipes_select_shared" ON casual_recipes
  FOR SELECT USING (true);
