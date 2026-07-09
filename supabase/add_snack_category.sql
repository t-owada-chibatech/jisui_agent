-- 既存の ingredients テーブルの category CHECK 制約に 'お菓子' を追加する。
-- Supabase SQL Editor で実行してください（schema.sql は CREATE TABLE のため既存DBでは再実行不可）。

ALTER TABLE ingredients DROP CONSTRAINT IF EXISTS ingredients_category_check;

ALTER TABLE ingredients ADD CONSTRAINT ingredients_category_check
  CHECK (category IN ('野菜','肉','魚','乳製品','調味料','穀物','お菓子','その他'));
