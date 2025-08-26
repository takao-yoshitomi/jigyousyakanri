// API設定の一元管理
const Config = {
    // ユーザーID管理
    _currentUserId: null,
    
    generateUserId() {
        if (!this._currentUserId) {
            this._currentUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        return this._currentUserId;
    },
    
    displayUserId() {
        const userId = this.generateUserId();
        const userIdDisplay = document.getElementById('user-id-display');
        if (userIdDisplay) {
            userIdDisplay.textContent = `(${userId})`;
        }
        return userId;
    },
    
    // 環境に応じてAPI基底URLを自動判定
    getApiBaseUrl() {
        const hostname = window.location.hostname;
        
        // Vercel環境の判定
        if (hostname.includes('vercel.app')) {
            return 'https://jigyousya-backend.onrender.com/api';  // VercelからRender APIへ
        }
        
        // 本番環境の判定 (render.comまたはカスタムドメイン)
        if (hostname.includes('.onrender.com') || 
            (window.location.protocol === 'https:' && hostname !== 'localhost')) {
            return '/api';  // 本番環境では相対パス (nginxがプロキシ)
        }
        
        // Docker環境の判定（ポート5001でアクセスしている場合）
        if (window.location.port === '5001') {
            return 'http://localhost:5001/api';  // Docker Compose環境
        }
        
        // 通常の開発環境（Flask開発サーバー直接実行）
        return 'http://localhost:5000/api';
    }
};

// モジュールとして利用可能にする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;
} else if (typeof window !== 'undefined') {
    window.Config = Config;
}