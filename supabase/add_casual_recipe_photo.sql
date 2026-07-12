-- ============================================
-- 適当レシピに写真を添付できるようにする
-- Supabase SQL Editor で実行してください
-- ============================================

-- casual_recipes に写真URLカラムを追加
ALTER TABLE casual_recipes ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 写真アップロード用のストレージバケットを作成（公開読み取り可・書き込みは本人のみ）
INSERT INTO storage.buckets (id, name, public)
VALUES ('casual-recipe-photos', 'casual-recipe-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 自分のユーザーIDフォルダ配下にだけアップロード・削除できる
DROP POLICY IF EXISTS "casual_recipe_photos_insert_own" ON storage.objects;
CREATE POLICY "casual_recipe_photos_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'casual-recipe-photos' AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "casual_recipe_photos_delete_own" ON storage.objects;
CREATE POLICY "casual_recipe_photos_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'casual-recipe-photos' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 誰でも閲覧できる（公開バケットの公開URL経由で読めるが、念のため明示しておく）
DROP POLICY IF EXISTS "casual_recipe_photos_select_all" ON storage.objects;
CREATE POLICY "casual_recipe_photos_select_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'casual-recipe-photos');
