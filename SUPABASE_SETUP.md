# Supabase セットアップガイド

## 1. Supabaseプロジェクト作成

1. [Supabase](https://supabase.com)にアクセスしてアカウント作成
2. 「New Project」でプロジェクト作成
3. プロジェクト名: `jigyousya-kanri-app`
4. データベースパスワードを設定（強固なパスワードを推奨）
5. リージョン: `Northeast Asia (Tokyo)` を選択

## 2. データベーススキーマ設定

1. Supabase Dashboard → 「SQL Editor」
2. `supabase-schema.sql` の内容を貼り付けて実行
3. `supabase-sample-data.sql` の内容を貼り付けて実行（テスト用）

## 3. API設定取得

Supabase Dashboard → 「Settings」 → 「API」で以下を取得：

```
Project URL: https://your-project.supabase.co
API Key (anon public): your-anon-key
```

## 4. 認証設定（後で実装）

1. 「Authentication」 → 「Providers」
2. Google認証を有効化
3. OAuth設定（Google Cloud Console連携）

## 5. Row Level Security (RLS)

認証実装後に以下を実行：

```sql
-- テーブルごとにRLS有効化
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editing_sessions ENABLE ROW LEVEL SECURITY;

-- ポリシー作成（認証ユーザーのみアクセス可能）
CREATE POLICY "Enable read access for authenticated users" ON public.clients
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON public.clients
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON public.clients
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 他のテーブルも同様に設定
```

## 6. 環境変数設定

プロジェクトに以下のファイルを作成：

```javascript
// config/supabase.js
export const supabaseConfig = {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key'
};
```

## 7. Supabase JavaScript SDK

```bash
npm install @supabase/supabase-js
```

## 次のステップ

1. フロントエンドをSupabase API用に修正
2. 認証システム実装
3. Vercel設定とデプロイ