#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Database initialization
echo "🔄 Initializing database..."
python init_db.py

if [ $? -eq 0 ]; then
    echo "✅ Database initialization completed successfully"
else
    echo "❌ Database initialization failed"
    exit 1
fi

# Start application
echo "🌐 Starting application server..."
exec gunicorn --bind 0.0.0.0:$PORT app:app