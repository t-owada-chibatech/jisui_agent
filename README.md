# 自炊アシスタント

> ⚠️ **開発中（Work in Progress）** — 現在MVPを実装中です。

一人暮らしや学生が**食費を抑えながら自炊を継続**できるよう支援するWebアプリです。

## 主な機能

| 機能 | 概要 | 状態 |
|------|------|------|
| 食材管理 | 食材・賞味期限・価格を登録 | ✅ 実装済み |
| AI レシピ提案 | 登録食材をもとにGemini APIがレシピを生成 | ✅ 実装済み |
| 楽天レシピ連携 | 実在の人気レシピを食材マッチ度順に表示 | ✅ 実装済み |
| 買い物リスト | 不足食材を優先度付きで管理 | ✅ 実装済み |
| 家計簿 | 食費の記録・月次/週次集計 | ✅ 実装済み |
| ダッシュボード | 予算・期限・レシピを一覧表示 | ✅ 実装済み |
| ユーザー認証 | ログイン・個人データ分離 | 🚧 未実装 |

## 技術スタック

- **フロントエンド**: Next.js 16 (App Router) / TypeScript / Tailwind CSS
- **バックエンド**: Supabase (PostgreSQL)
- **AI**: Google Gemini API (gemini-1.5-flash)

## セットアップ

### 1. リポジトリをクローン

```bash
git clone https://github.com/t2232029/jisui_agent.git
cd jisui_agent
npm install
```

### 2. 環境変数を設定

```bash
cp .env.example .env.local
# .env.local を編集して各キーを設定
```

| 変数名 | 取得先 | 用途 |
|--------|--------|------|
| `GEMINI_API_KEY` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | AIレシピ生成 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | DB接続 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | DB接続 |
| `RAKUTEN_APP_ID` | [webservice.rakuten.co.jp](https://webservice.rakuten.co.jp/) | 楽天レシピAPI（サーバー側のみ） |

> **楽天APIキーについて**: `RAKUTEN_APP_ID` は `NEXT_PUBLIC_` を付けずにサーバー側専用の環境変数として設定してください。楽天Webサービスに登録してアプリIDを取得します（無料）。設定しない場合、楽天レシピ機能は無効になりますが、AIレシピ提案は引き続き使えます。

### 3. Supabase でテーブルを作成

[Supabase SQL Editor](https://supabase.com/dashboard) を開き、`supabase/schema.sql` の内容を実行。

その後 RLS を無効化（認証なし MVP の場合）:

```sql
ALTER TABLE ingredients        DISABLE ROW LEVEL SECURITY;
ALTER TABLE recipes            DISABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_steps       DISABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_budgets    DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_budgets     DISABLE ROW LEVEL SECURITY;
ALTER TABLE budget_records     DISABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items     DISABLE ROW LEVEL SECURITY;
```

### 4. 開発サーバーを起動

```bash
npm run dev
# http://localhost:3000 で起動
```

## 今後の予定

- [ ] Supabase Auth によるユーザー認証
- [ ] 月次・週次予算の画面から設定
- [ ] レシピ削除機能
- [ ] 食材の在庫減算（料理したら自動で数量を減らす）
- [ ] Vercel へのデプロイ
