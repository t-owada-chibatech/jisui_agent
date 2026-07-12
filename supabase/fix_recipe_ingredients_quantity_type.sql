-- recipe_ingredients.quantity を数値型からテキスト型に変更する。
-- AIが提案するレシピの分量には「少々」「適量」のような数値化できない表現が
-- 頻繁に含まれ、NUMERIC型だと1件でも変換エラーになるとレシピ全体の
-- 材料保存が失敗していたため（22P02: invalid input syntax for type numeric）。
-- Supabase SQL Editor で実行してください。

ALTER TABLE recipe_ingredients ALTER COLUMN quantity TYPE TEXT USING quantity::text;
