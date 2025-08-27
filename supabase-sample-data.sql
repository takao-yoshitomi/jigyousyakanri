-- 事業者管理アプリ - サンプルデータ（Supabase用）

-- 1. スタッフデータ
INSERT INTO public.staffs (name) VALUES 
('田中太郎'),
('佐藤花子'),
('山田次郎'),
('鈴木三郎')
ON CONFLICT (name) DO NOTHING;

-- 2. デフォルトタスクデータ
INSERT INTO public.default_tasks (task_name, display_order, is_active) VALUES
('試算表作成', 1, true),
('消費税申告書作成', 2, true),
('法人税申告書作成', 3, true),
('所得税申告書作成', 4, true),
('給与計算', 5, true),
('社会保険手続き', 6, true),
('年末調整', 7, true),
('決算書作成', 8, true),
('税務相談', 9, true),
('経営指導', 10, true)
ON CONFLICT DO NOTHING;

-- 3. 設定データ
INSERT INTO public.settings (key, value) VALUES
('app_version', '"1.0.0"'),
('default_fiscal_month', '3'),
('maintenance_mode', 'false')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 4. クライアントサンプルデータ
INSERT INTO public.clients (id, name, fiscal_month, staff_id, accounting_method, status, custom_tasks_by_year, finalized_years) VALUES
(1001, '株式会社サンプル商事', 3, 1, '法人税法', 'active', '{}', '[]'),
(1002, '田中商店', 12, 2, '所得税法', 'active', '{}', '[]'),
(1003, '山田工業株式会社', 3, 1, '法人税法', 'active', '{}', '[]'),
(1004, '佐藤建設', 3, 3, '法人税法', 'active', '{}', '[]'),
(1005, '鈴木製作所', 9, 2, '法人税法', 'active', '{}', '[]')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    fiscal_month = EXCLUDED.fiscal_month,
    staff_id = EXCLUDED.staff_id,
    accounting_method = EXCLUDED.accounting_method,
    status = EXCLUDED.status;

-- 5. 月次タスクサンプルデータ
INSERT INTO public.monthly_tasks (client_id, month, tasks, status, url, memo) VALUES
(1001, '2025-01', '{"試算表作成": "完了", "消費税申告書作成": "未対応", "法人税申告書作成": "未対応"}', '進行中', '', '試算表完了済み'),
(1001, '2025-02', '{"試算表作成": "未対応", "消費税申告書作成": "未対応", "法人税申告書作成": "未対応"}', '未着手', '', ''),
(1002, '2025-01', '{"所得税申告書作成": "完了", "給与計算": "完了"}', '完了', '', '1月分完了'),
(1002, '2025-02', '{"所得税申告書作成": "未対応", "給与計算": "未対応"}', '未着手', '', '')
ON CONFLICT DO NOTHING;