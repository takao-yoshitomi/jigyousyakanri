# 事業者管理アプリ デプロイ手順書

## 📋 デプロイ準備

### 1. 必要な環境
- Docker & Docker Compose
- Git
- サーバー（VPS、クラウドインスタンスなど）

### 2. セキュリティ設定
```bash
# .env.productionファイルを編集
SECRET_KEY=your-super-secret-key-here
POSTGRES_PASSWORD=strong-database-password
```

⚠️ **重要**: デプロイ前に必ずパスワードを強力なものに変更してください

## 🚀 デプロイ手順

### 開発環境での動作確認
```bash
# 開発環境で最終テスト
docker-compose up -d
curl http://localhost:5001/api/clients
docker-compose down
```

### 本番環境デプロイ
```bash
# 1. リポジトリをクローン
git clone <repository-url>
cd jigyousyakanri

# 2. 本番用設定ファイルを編集
cp .env.production .env.production.local
nano .env.production.local  # パスワード等を設定

# 3. 本番環境でビルド・起動
docker-compose -f docker-compose.production.yml --env-file .env.production.local up -d --build

# 4. データベース初期化
docker-compose -f docker-compose.production.yml exec backend flask db upgrade

# 5. 動作確認
curl http://localhost/api/clients
```

## 🔧 メンテナンス

### ログ確認
```bash
# アプリケーションログ
docker-compose -f docker-compose.production.yml logs -f backend

# Nginxログ
docker-compose -f docker-compose.production.yml logs -f frontend

# データベースログ
docker-compose -f docker-compose.production.yml logs -f db
```

### バックアップ
```bash
# データベースバックアップ
docker-compose -f docker-compose.production.yml exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup_$(date +%Y%m%d).sql

# 自動バックアップスクリプト設定（cron）
0 2 * * * cd /path/to/jigyousyakanri && docker-compose -f docker-compose.production.yml exec -T db pg_dump -U jigyousya_user jigyousyakanri > ./backup/backup_$(date +\%Y\%m\%d).sql
```

### アップデート
```bash
# アプリケーション更新
git pull origin main
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --build

# データベースマイグレーション
docker-compose -f docker-compose.production.yml exec backend flask db upgrade
```

## 🛡️ セキュリティ設定

### ファイアウォール設定例
```bash
# UFWでの設定例
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS（SSL設定時）
sudo ufw enable
```

### SSL証明書設定（Let's Encrypt）
```bash
# Certbot導入
sudo apt install certbot python3-certbot-nginx

# 証明書取得
sudo certbot --nginx -d yourdomain.com

# 自動更新設定
sudo crontab -e
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 監視とトラブルシューティング

### ヘルスチェック
```bash
# API動作確認
curl -f http://localhost/api/clients || echo "API Error"

# データベース接続確認
docker-compose -f docker-compose.production.yml exec backend python -c "
from app import app, db
with app.app_context():
    db.engine.execute('SELECT 1')
    print('Database OK')
"
```

### よくある問題
1. **データベース接続エラー**: `.env.production.local`の設定を確認
2. **ポート競合**: `docker-compose down`で既存コンテナを停止
3. **権限エラー**: `sudo chown -R $USER:$USER .`でファイル権限を修正

## 🔄 ロールバック手順
```bash
# 緊急時のロールバック
git checkout <previous-commit-hash>
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --build
```

## 📱 アクセス方法
- **フロントエンド**: http://yourdomain.com
- **API**: http://yourdomain.com/api/

---
**注意**: 実際のドメイン名、IPアドレス、パスワードに置き換えてください。