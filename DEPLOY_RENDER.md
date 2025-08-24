# Renderでのデプロイ手順

## 🚀 Render.com デプロイ（推奨）

### メリット
- **無料枠**: 個人利用なら完全無料
- **自動デプロイ**: Git pushで自動更新
- **マネージドDB**: PostgreSQL自動管理
- **SSL証明書**: 自動設定
- **簡単設定**: 複雑な設定不要

## 📋 デプロイ手順

### 1. GitHubにプッシュ
```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### 2. Renderアカウント作成
1. https://render.com にアクセス
2. GitHubアカウントでログイン
3. リポジトリを連携

### 3. データベース作成
1. Dashboard → "New" → "PostgreSQL"
2. Name: `jigyousya-db`
3. Plan: **Free** (無料枠)
4. Create Database

### 4. バックエンドAPI作成
1. Dashboard → "New" → "Web Service"
2. Connect Repository: あなたのリポジトリを選択
3. 設定:
   ```
   Name: jigyousya-backend
   Runtime: Python 3
   Build Command: pip install -r backend/requirements.txt
   Start Command: cd backend && gunicorn --bind 0.0.0.0:$PORT app:app
   ```
4. Environment Variables:
   ```
   FLASK_ENV=production
   DATABASE_URL=[Databaseページからコピー]
   SECRET_KEY=your-secret-key-here
   ```
5. Plan: **Free**
6. Create Web Service

### 5. フロントエンド作成
1. Dashboard → "New" → "Static Site"
2. Connect Repository: 同じリポジトリ
3. 設定:
   ```
   Name: jigyousya-frontend
   Build Command: echo "Static files ready"
   Publish Directory: .
   ```
4. Redirects/Rewrites:
   ```
   /api/* → https://your-backend-url.onrender.com/api/* (Rewrite)
   /* → /index.html (Rewrite)
   ```
5. Create Static Site

## 🔧 設定詳細

### データベース初期化
デプロイ後、一度だけ実行：
```bash
# Renderのバックエンドコンソールで
flask db upgrade
```

### 環境変数設定
バックエンドサービスの Environment タブで設定:
```
FLASK_ENV=production
DATABASE_URL=(データベースの Internal Database URL)
SECRET_KEY=強力なシークレットキー
CORS_ORIGINS=https://your-frontend.onrender.com
```

## 📱 アクセスURL
- **フロントエンド**: https://jigyousya-frontend.onrender.com
- **API**: https://jigyousya-backend.onrender.com/api/

## 🔄 自動デプロイ
GitHubにpushするだけで自動デプロイされます：
```bash
git add .
git commit -m "Update application"
git push origin main
```

## 💰 料金
- **Free Plan**: 完全無料
  - 750時間/月の稼働時間
  - 15分の非アクティブでスリープ
  - PostgreSQL 1GB
- **Paid Plan**: $7/月〜（24時間稼働）

## ⚠️ 注意事項
1. **スリープ**: 無料プランは15分非アクティブでスリープします
2. **起動時間**: スリープからの復帰に数秒かかります  
3. **データ制限**: PostgreSQL 1GB制限（個人利用では十分）

---

**他のデプロイ選択肢:**
- **Heroku**: 類似サービス（有料化）
- **Vercel**: フロントエンド特化
- **Railway**: シンプルなデプロイ
- **DigitalOcean App Platform**: スケーラブル
- **Docker**: VPSでの自前運用