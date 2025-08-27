-- 事業者管理アプリ - Supabase用データベーススキーマ
-- 現在のPostgreSQLスキーマをSupabase用に移植

-- 1. スタッフテーブル
CREATE TABLE IF NOT EXISTS public.staffs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. クライアントテーブル
CREATE TABLE IF NOT EXISTS public.clients (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    fiscal_month INTEGER NOT NULL,
    staff_id INTEGER NOT NULL REFERENCES public.staffs(id),
    accounting_method VARCHAR(255),
    status VARCHAR(255),
    custom_tasks_by_year JSONB DEFAULT '{}',
    finalized_years JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 月次タスクテーブル
CREATE TABLE IF NOT EXISTS public.monthly_tasks (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES public.clients(id),
    month VARCHAR(255) NOT NULL,
    tasks JSONB,
    status VARCHAR(255),
    url VARCHAR(255),
    memo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 設定テーブル
CREATE TABLE IF NOT EXISTS public.settings (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 編集セッションテーブル（悲観ロック用）
CREATE TABLE IF NOT EXISTS public.editing_sessions (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES public.clients(id),
    user_id VARCHAR(255) NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- 6. デフォルトタスクテーブル
CREATE TABLE IF NOT EXISTS public.default_tasks (
    id SERIAL PRIMARY KEY,
    task_name VARCHAR(255) NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス設定
CREATE INDEX IF NOT EXISTS idx_clients_staff_id ON public.clients(staff_id);
CREATE INDEX IF NOT EXISTS idx_clients_fiscal_month ON public.clients(fiscal_month);
CREATE INDEX IF NOT EXISTS idx_monthly_tasks_client_id ON public.monthly_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_monthly_tasks_month ON public.monthly_tasks(month);
CREATE INDEX IF NOT EXISTS idx_editing_sessions_client_id ON public.editing_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_editing_sessions_user_id ON public.editing_sessions(user_id);

-- updated_at自動更新のトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_atトリガー設定
CREATE TRIGGER update_staffs_updated_at BEFORE UPDATE ON public.staffs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_monthly_tasks_updated_at BEFORE UPDATE ON public.monthly_tasks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_editing_sessions_updated_at BEFORE UPDATE ON public.editing_sessions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_default_tasks_updated_at BEFORE UPDATE ON public.default_tasks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Row Level Security (RLS) 設定
-- 認証実装後に適用予定
-- ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.monthly_tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.editing_sessions ENABLE ROW LEVEL SECURITY;