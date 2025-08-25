#!/usr/bin/env python3
"""
Database initialization script for production deployment
"""
from app import app, db

def init_database():
    """Initialize database tables"""
    with app.app_context():
        try:
            # Create all tables
            db.create_all()
            print("✅ Database tables created successfully!")
            
            # Verify tables exist
            tables = db.engine.table_names()
            print(f"✅ Created tables: {', '.join(tables)}")
            
            return True
        except Exception as e:
            print(f"❌ Error creating database tables: {e}")
            return False

if __name__ == "__main__":
    success = init_database()
    exit(0 if success else 1)