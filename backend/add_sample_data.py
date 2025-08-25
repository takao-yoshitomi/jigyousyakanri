#!/usr/bin/env python3
"""
Add sample data to existing database
"""
from app import app, db, Staff, Client

def add_sample_data():
    """Add sample clients to existing database"""
    with app.app_context():
        try:
            # Get existing staff IDs
            staff_map = {}
            for staff in Staff.query.all():
                staff_map[staff.name] = staff.id
            
            print(f"Found {len(staff_map)} staff members: {list(staff_map.keys())}")
            
            if not staff_map:
                print("❌ No staff members found. Please ensure staff data exists first.")
                return False
            
            # Add sample clients - use existing staff names
            available_staff_names = list(staff_map.keys())
            if not available_staff_names:
                print("❌ No staff members found. Cannot add sample clients.")
                return False
            
            # Use the first available staff for all sample clients
            default_staff = available_staff_names[0]
            print(f"📋 Using staff '{default_staff}' for all sample clients")
            
            sample_clients = [
                {"no": 101, "name": "株式会社サンプル", "fiscal_month": "3月", "staff": default_staff, "method": "記帳代行", "status": "作業中"},
                {"no": 102, "name": "テスト商事", "fiscal_month": "12月", "staff": default_staff, "method": "自計", "status": "完了"},
                {"no": 103, "name": "サンプル工業", "fiscal_month": "9月", "staff": default_staff, "method": "記帳代行", "status": "依頼中"},
                {"no": 104, "name": "デモ株式会社", "fiscal_month": "6月", "staff": default_staff, "method": "自計", "status": "チェック待ち"},
                {"no": 105, "name": "例示有限会社", "fiscal_month": "1月", "staff": default_staff, "method": "記帳代行", "status": "未着手"},
            ]
            
            added_count = 0
            for client_data in sample_clients:
                existing_client = Client.query.filter_by(id=client_data["no"]).first()
                if not existing_client:
                    if client_data["staff"] in staff_map:
                        client = Client(
                            id=client_data["no"],
                            name=client_data["name"],
                            fiscal_month=int(client_data["fiscal_month"].replace('月','')),
                            staff_id=staff_map[client_data["staff"]],
                            accounting_method=client_data["method"],
                            status=client_data["status"],
                            custom_tasks_by_year={},
                            finalized_years=[]
                        )
                        db.session.add(client)
                        added_count += 1
                        print(f"✅ Added client: {client_data['name']} (No.{client_data['no']})")
                    else:
                        print(f"⚠️  Staff '{client_data['staff']}' not found, skipping client {client_data['name']}")
                else:
                    print(f"ℹ️  Client {client_data['name']} (No.{client_data['no']}) already exists")
            
            if added_count > 0:
                db.session.commit()
                print(f"✅ Successfully added {added_count} sample clients!")
            else:
                print("ℹ️  No new clients were added")
            
            return True
        except Exception as e:
            print(f"❌ Error adding sample data: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    success = add_sample_data()
    exit(0 if success else 1)