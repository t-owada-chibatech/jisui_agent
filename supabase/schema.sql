-- ============================================
-- 自炊アシスタント データベーススキーマ
-- Supabase SQL Editor で実行してください
-- ============================================

-- 食材マスタ
CREATE TABLE ingredients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  quantity      NUMERIC NOT NULL,
  unit          TEXT NOT NULL,
  price         NUMERIC,
  purchased_at  DATE,
  expires_at    DATE,
  category      TEXT NOT NULL DEFAULT 'その他'
                CHECK (category IN ('野菜','肉','魚','乳製品','調味料','穀物','その他')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- レシピ
CREATE TABLE recipes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  cook_time_min   INT,
  estimated_cost  NUMERIC,
  genre           TEXT NOT NULL DEFAULT 'その他'
                  CHECK (genre IN ('和食','洋食','中華','イタリアン','その他')),
  servings        INT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- レシピ材料（レシピ↔食材の中間テーブル）
CREATE TABLE recipe_ingredients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id        UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_name  TEXT NOT NULL,
  quantity         NUMERIC,
  unit             TEXT,
  is_optional      BOOLEAN NOT NULL DEFAULT FALSE
);

-- レシピ手順
CREATE TABLE recipe_steps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_order  INT NOT NULL,
  description TEXT NOT NULL
);

-- 月次予算
CREATE TABLE monthly_budgets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_month  TEXT NOT NULL UNIQUE,   -- 例: "2026-05"
  budget      NUMERIC NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 週次予算
CREATE TABLE weekly_budgets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start  DATE NOT NULL UNIQUE,   -- その週の月曜日
  budget      NUMERIC NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 家計簿
CREATE TABLE budget_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchased_at  DATE NOT NULL,
  store_name    TEXT,
  category      TEXT NOT NULL DEFAULT '食材'
                CHECK (category IN ('食材','外食','調味料','日用品','その他')),
  amount        NUMERIC NOT NULL,
  memo          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 買い物リスト
CREATE TABLE shopping_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name  TEXT NOT NULL,
  quantity         NUMERIC,
  unit             TEXT,
  estimated_price  NUMERIC,
  priority         INT NOT NULL DEFAULT 0,
  is_purchased     BOOLEAN NOT NULL DEFAULT FALSE,
  recipe_id        UUID REFERENCES recipes(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- サンプルデータ（動作確認用）
-- ============================================

-- 月次予算
INSERT INTO monthly_budgets (year_month, budget) VALUES
  ('2026-05', 20000);

-- 週次予算（今週の月曜日）
INSERT INTO weekly_budgets (week_start, budget) VALUES
  ('2026-05-25', 5000);

-- 食材サンプル
INSERT INTO ingredients (name, quantity, unit, price, purchased_at, expires_at, category) VALUES
  ('鶏むね肉', 300, 'g',   250, '2026-05-24', '2026-05-28', '肉'),
  ('玉ねぎ',   3,   '個',  150, '2026-05-22', '2026-06-10', '野菜'),
  ('にんじん', 2,   '本',  100, '2026-05-22', '2026-06-06', '野菜'),
  ('豆腐',     1,   '丁',  80,  '2026-05-26', '2026-05-29', '乳製品'),
  ('卵',       6,   '個',  200, '2026-05-25', '2026-06-16', '乳製品'),
  ('醤油',     500, 'ml',  300, '2026-04-27', '2026-11-23', '調味料'),
  ('白米',     2,   'kg',  800, '2026-05-20', '2026-07-26', '穀物'),
  ('ほうれん草',1,  '束',  120, '2026-05-25', '2026-05-30', '野菜'),
  ('牛乳',     500, 'ml',  180, '2026-05-23', '2026-05-31', '乳製品'),
  ('じゃがいも',4,  '個',  200, '2026-05-17', '2026-06-26', '野菜');

-- 家計簿サンプル
INSERT INTO budget_records (purchased_at, store_name, category, amount, memo) VALUES
  ('2026-05-13', 'スーパーマルエツ', '食材',   1850, '週の食材まとめ買い'),
  ('2026-05-17', '業務スーパー',     '食材',   2300, '冷凍食品・調味料'),
  ('2026-05-20', 'コンビニ',         '外食',   650,  '夜食'),
  ('2026-05-22', 'スーパーマルエツ', '食材',   1200, NULL),
  ('2026-05-24', 'ドラッグストア',   '調味料', 450,  '醤油・みりん補充'),
  ('2026-05-26', 'スーパーマルエツ', '食材',   980,  NULL);
