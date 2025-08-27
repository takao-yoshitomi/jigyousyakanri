// Supabase クライアント設定
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 環境設定
const getSupabaseConfig = () => {
    // 本番環境では環境変数から取得
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return {
            url: window.SUPABASE_URL || 'https://your-project.supabase.co',
            anonKey: window.SUPABASE_ANON_KEY || 'your-anon-key'
        };
    }
    
    // 開発環境用の設定（後で実際の値に置き換える）
    return {
        url: 'https://your-project.supabase.co',
        anonKey: 'your-anon-key'
    };
};

// Supabaseクライアント初期化
const config = getSupabaseConfig();
export const supabase = createClient(config.url, config.anonKey);

// API操作用のヘルパー関数
export class SupabaseAPI {
    
    // クライアント関連
    static async getClients() {
        const { data, error } = await supabase
            .from('clients')
            .select(`
                *,
                staffs(name)
            `)
            .eq('status', 'active')
            .order('id');
            
        if (error) throw error;
        return data;
    }
    
    static async getClient(id) {
        const { data, error } = await supabase
            .from('clients')
            .select(`
                *,
                staffs(name)
            `)
            .eq('id', id)
            .single();
            
        if (error) throw error;
        return data;
    }
    
    static async createClient(clientData) {
        const { data, error } = await supabase
            .from('clients')
            .insert(clientData)
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }
    
    static async updateClient(id, clientData) {
        const { data, error } = await supabase
            .from('clients')
            .update(clientData)
            .eq('id', id)
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }
    
    static async deleteClient(id) {
        const { error } = await supabase
            .from('clients')
            .update({ status: 'deleted' })
            .eq('id', id);
            
        if (error) throw error;
    }
    
    static async restoreClient(id) {
        const { error } = await supabase
            .from('clients')
            .update({ status: 'active' })
            .eq('id', id);
            
        if (error) throw error;
    }
    
    // スタッフ関連
    static async getStaffs() {
        const { data, error } = await supabase
            .from('staffs')
            .select('*')
            .order('id');
            
        if (error) throw error;
        return data;
    }
    
    // 月次タスク関連
    static async getMonthlyTasks(clientId, month) {
        const { data, error } = await supabase
            .from('monthly_tasks')
            .select('*')
            .eq('client_id', clientId)
            .eq('month', month)
            .single();
            
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
        return data;
    }
    
    static async createMonthlyTask(taskData) {
        const { data, error } = await supabase
            .from('monthly_tasks')
            .insert(taskData)
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }
    
    static async updateMonthlyTask(id, taskData) {
        const { data, error } = await supabase
            .from('monthly_tasks')
            .update(taskData)
            .eq('id', id)
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }
    
    static async upsertMonthlyTask(clientId, month, taskData) {
        const { data, error } = await supabase
            .from('monthly_tasks')
            .upsert({
                client_id: clientId,
                month: month,
                ...taskData
            }, {
                onConflict: 'client_id,month'
            })
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }
    
    // 設定関連
    static async getSetting(key) {
        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', key)
            .single();
            
        if (error && error.code !== 'PGRST116') throw error;
        return data?.value;
    }
    
    static async setSetting(key, value) {
        const { error } = await supabase
            .from('settings')
            .upsert({
                key: key,
                value: value
            });
            
        if (error) throw error;
    }
    
    // デフォルトタスク関連
    static async getDefaultTasks() {
        const { data, error } = await supabase
            .from('default_tasks')
            .select('*')
            .eq('is_active', true)
            .order('display_order');
            
        if (error) throw error;
        return data;
    }
    
    // 編集セッション関連（悲観ロック）
    static async createEditingSession(clientId, userId) {
        const { data, error } = await supabase
            .from('editing_sessions')
            .insert({
                client_id: clientId,
                user_id: userId
            })
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }
    
    static async updateEditingSession(sessionId) {
        const { error } = await supabase
            .from('editing_sessions')
            .update({ last_activity: new Date().toISOString() })
            .eq('id', sessionId);
            
        if (error) throw error;
    }
    
    static async deleteEditingSession(sessionId) {
        const { error } = await supabase
            .from('editing_sessions')
            .delete()
            .eq('id', sessionId);
            
        if (error) throw error;
    }
    
    static async getActiveEditingSessions(clientId) {
        const { data, error } = await supabase
            .from('editing_sessions')
            .select('*')
            .eq('client_id', clientId)
            .gte('last_activity', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // 30分以内
            
        if (error) throw error;
        return data;
    }
    
    // 認証関連（後で実装）
    static async signInWithGoogle() {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        
        if (error) throw error;
        return data;
    }
    
    static async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    }
    
    static async getCurrentUser() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    }
    
    // リアルタイム機能（将来拡張用）
    static subscribeToClientChanges(callback) {
        return supabase
            .channel('clients-changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'clients' }, 
                callback
            )
            .subscribe();
    }
    
    static subscribeToMonthlyTaskChanges(clientId, callback) {
        return supabase
            .channel(`monthly-tasks-${clientId}`)
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'monthly_tasks',
                    filter: `client_id=eq.${clientId}`
                }, 
                callback
            )
            .subscribe();
    }
}

// エラーハンドリング用ヘルパー
export const handleSupabaseError = (error) => {
    console.error('Supabase error:', error);
    
    if (error.code === 'PGRST116') {
        return 'データが見つかりません';
    } else if (error.code === '23505') {
        return '重複するデータが存在します';
    } else if (error.code === '23503') {
        return '関連データが存在しません';
    } else {
        return error.message || 'データベースエラーが発生しました';
    }
};