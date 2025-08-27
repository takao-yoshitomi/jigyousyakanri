// Supabase設定 - 本番環境用
window.SUPABASE_CONFIG = {
    // 実際のSupabaseプロジェクトURL（後で設定）
    url: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'https://your-local-project.supabase.co'  // 開発環境
        : 'https://your-production-project.supabase.co', // 本番環境
        
    // 実際のanonキー（後で設定）
    anonKey: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'your-local-anon-key' // 開発環境
        : 'your-production-anon-key' // 本番環境
};

// Vercelデプロイ時の環境変数対応
if (typeof process !== 'undefined' && process.env) {
    window.SUPABASE_CONFIG.url = process.env.SUPABASE_URL || window.SUPABASE_CONFIG.url;
    window.SUPABASE_CONFIG.anonKey = process.env.SUPABASE_ANON_KEY || window.SUPABASE_CONFIG.anonKey;
}