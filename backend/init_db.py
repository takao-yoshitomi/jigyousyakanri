#!/usr/bin/env python3
"""
Database initialization script for production deployment
"""
from app import app, db

def init_database():
    """Initialize database tables"""
    with app.app_context():
        try:
            print("🔄 Starting database initialization...")
            
            # Check if tables already exist
            existing_tables = db.engine.table_names()
            if existing_tables:
                print(f"ℹ️  Tables already exist: {', '.join(existing_tables)}")
                return True
            
            # Create all tables
            print("📋 Creating database tables...")
            db.create_all()
            print("✅ Database tables created successfully!")
            
            # Verify tables exist
            tables = db.engine.table_names()
            print(f"✅ Created tables: {', '.join(tables)}")
            
            # Add initial data (staff members)
            from app import Staff
            initial_staffs = ["佐藤", "鈴木", "高橋", "田中", "渡辺"]
            for name in initial_staffs:
                existing_staff = Staff.query.filter_by(name=name).first()
                if not existing_staff:
                    staff = Staff(name=name)
                    db.session.add(staff)
            
            db.session.commit()
            print(f"✅ Initial staff data created")
            
            return True
        except Exception as e:
            print(f"❌ Error creating database tables: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    success = init_database()
    exit(0 if success else 1)