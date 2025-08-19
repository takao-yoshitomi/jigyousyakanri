import os
import json
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import click

app = Flask(__name__)
CORS(app)

# --- Database Configuration ---
# Get the database URL from the environment variable
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("No DATABASE_URL set for Flask application")

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- Database Models ---

class Staff(db.Model):
    __tablename__ = 'staffs'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, unique=True)
    clients = db.relationship('Client', backref='staff', lazy=True)

    def __repr__(self):
        return f'<Staff {self.name}>'

class Client(db.Model):
    __tablename__ = 'clients'
    id = db.Column(db.Integer, primary_key=True, autoincrement=False)
    name = db.Column(db.String(255), nullable=False)
    fiscal_month = db.Column(db.Integer, nullable=False)
    staff_id = db.Column(db.Integer, db.ForeignKey('staffs.id'), nullable=False)
    accounting_method = db.Column(db.String(255))
    status = db.Column(db.String(255))
    custom_tasks = db.Column(db.JSON)
    monthly_tasks = db.relationship('MonthlyTask', backref='client', lazy=True, cascade="all, delete-orphan")
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    def to_dict(self):
        return {
            'no': self.id,
            'name': self.name,
            'fiscalMonth': f"{self.fiscal_month}月",
            '担当者': self.staff.name if self.staff else None,
            'accountingMethod': self.accounting_method,
            'status': self.status,
            'unattendedMonths': 'N/A', # To be calculated later
            'monthlyProgress': 'N/A', # To be calculated later
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class MonthlyTask(db.Model):
    __tablename__ = 'monthly_tasks'
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    month = db.Column(db.String(255), nullable=False)
    tasks = db.Column(db.JSON)
    status = db.Column(db.String(255))
    url = db.Column(db.String(255))
    memo = db.Column(db.Text)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'month': self.month,
            'tasks': self.tasks,
            'status': self.status,
            'url': self.url,
            'memo': self.memo,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# --- API Endpoints ---

@app.route('/api/clients', methods=['GET'])
def get_clients():
    try:
        clients = Client.query.join(Staff).order_by(Client.id).all()
        return jsonify([client.to_dict() for client in clients])
    except Exception as e:
        print(f"Error fetching clients: {e}")
        return jsonify({"error": "Could not fetch clients"}), 500

@app.route('/api/clients', methods=['POST'])
def create_client():
    try: # <--- New try block
        from flask import request

        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid data"}), 400

        print(f"DEBUG: Received data for create_client: {data}") # DEBUG

        required_fields = ['id', 'name', 'fiscal_month', 'staff_id', 'accounting_method', 'status']
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400

        # Check if client ID already exists
        existing_client = Client.query.get(data['id'])
        if existing_client:
            return jsonify({"error": f"Client with No. {data['id']} already exists."}), 409

        new_client = Client(
            id=data['id'], # Use the provided ID
            name=data['name'],
            fiscal_month=data['fiscal_month'],
            staff_id=data['staff_id'],
            accounting_method=data['accounting_method'],
            status=data['status'],
            custom_tasks=["受付", "入力", "会計チェック", "担当者解決", "不明点", "試算表作成", "代表報告", "仕分け確認", "先生ロック"]
        )
        print("DEBUG: Before db.session.add(new_client)") # DEBUG
        db.session.add(new_client)
        print("DEBUG: Before db.session.commit()") # DEBUG
        db.session.commit()
        print("DEBUG: After db.session.commit()") # DEBUG
        return jsonify(new_client.to_dict()), 201
    except Exception as e: # <--- Catch all exceptions
        db.session.rollback() # Ensure rollback even if error before commit
        print(f"DEBUG: Top-level error in create_client: {e}") # DEBUG
        return jsonify({"error": "Could not create client due to an unexpected error."}), 500

@app.route('/api/clients/<int:client_id>', methods=['GET'])
def get_client_details(client_id):
    try:
        client = Client.query.get(client_id)
        if not client:
            return jsonify({"error": "Client not found"}), 404
        
        client_details = {
            'no': client.id,
            'name': client.name,
            'fiscalMonth': f"{client.fiscal_month}月",
            'staff_id': client.staff_id,
            '担当者': client.staff.name if client.staff else None,
            'accounting_method': client.accounting_method,
            'status': client.status,
            'customTasks': client.custom_tasks,
            'monthlyTasks': [task.to_dict() for task in client.monthly_tasks],
            'updated_at': client.updated_at.isoformat() if client.updated_at else None
        }
        return jsonify(client_details)
    except Exception as e:
        print(f"Error fetching client details: {e}")
        return jsonify({"error": "Could not fetch client details"}), 500

@app.route('/api/clients/<int:client_id>', methods=['PUT'])
def update_client_details(client_id):
    from flask import request
    from datetime import datetime, timezone

    client = Client.query.get(client_id)
    if not client:
        return jsonify({"error": "Client not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid data"}), 400

    # --- Optimistic Locking Check ---
    frontend_updated_at_str = data.get('updated_at')
    if frontend_updated_at_str:
        frontend_updated_at = datetime.fromisoformat(frontend_updated_at_str).astimezone(timezone.utc)
        db_updated_at = client.updated_at.astimezone(timezone.utc)
        if abs((db_updated_at - frontend_updated_at).total_seconds()) > 1:
            return jsonify({
                "error": "Conflict: The data has been modified by another user.",
                "error_code": "CONFLICT"
            }), 409

    # --- Update Logic ---
    try:
        # Update client's own fields
        client.name = data.get('name', client.name)
        client.fiscal_month = data.get('fiscal_month', client.fiscal_month)
        client.staff_id = data.get('staff_id', client.staff_id)
        client.accounting_method = data.get('accounting_method', client.accounting_method)
        client.status = data.get('status', client.status)
        client.custom_tasks = data.get('customTasks', client.custom_tasks)

        # Update monthly tasks
        if 'monthlyTasks' in data:
            for task_data in data['monthlyTasks']:
                task_id = task_data.get('id')
                if task_id:
                    task = MonthlyTask.query.get(task_id)
                    if task and task.client_id == client.id:
                        task.tasks = task_data.get('tasks', task.tasks)
                        task.memo = task_data.get('memo', task.memo)
                        task.url = task_data.get('url', task.url)
                else:
                    if task_data.get('tasks') or task_data.get('memo') or task_data.get('url'):
                        new_task = MonthlyTask(
                            client_id=client.id,
                            month=task_data['month'],
                            tasks=task_data.get('tasks', {}),
                            memo=task_data.get('memo', ''),
                            url=task_data.get('url', '')
                        )
                        db.session.add(new_task)
        
        # Explicitly touch the client to ensure its updated_at is changed
        client.updated_at = datetime.now(timezone.utc)

        db.session.commit()

        # Return the updated client data
        updated_client = Client.query.get(client_id)
        client_details = {
            'no': updated_client.id,
            'name': updated_client.name,
            'fiscalMonth': f"{updated_client.fiscal_month}月",
            'staff_id': updated_client.staff_id,
            '担当者': updated_client.staff.name if updated_client.staff else None,
            'accountingMethod': updated_client.accounting_method,
            'status': updated_client.status,
            'customTasks': updated_client.custom_tasks,
            'monthlyTasks': [task.to_dict() for task in updated_client.monthly_tasks],
            'updated_at': updated_client.updated_at.isoformat() if updated_client.updated_at else None
        }
        return jsonify(client_details)

    except Exception as e:
        db.session.rollback()
        print(f"Error updating client details: {e}")
        return jsonify({"error": "Could not update client details"}), 500

@app.route('/api/staffs', methods=['GET'])
def get_staffs():
    try:
        staffs = Staff.query.order_by(Staff.id).all()
        return jsonify([{'no': s.id, 'name': s.name} for s in staffs])
    except Exception as e:
        print(f"Error fetching staffs: {e}")
        return jsonify({"error": "Could not fetch staffs"}), 500


@app.route('/')
def hello_world():
    return 'Hello from the backend! The database is connected.'

# --- CLI Commands ---

@app.cli.command("init-db")
def init_db_command():
    """Creates the database tables and populates them with initial data."""
    with app.app_context():
        db.drop_all()
        db.create_all()

        # --- Initial Data ---
        initial_staffs_data = ["佐藤", "鈴木", "高橋", "田中", "渡辺"]
        staff_map = {}
        for name in initial_staffs_data:
            staff = Staff(name=name)
            db.session.add(staff)
            db.session.commit()
            staff_map[name] = staff.id

        initial_clients_data = [
            { "no": 101, "name": "株式会社アルファ", "fiscalMonth": "1月", "担当者": "佐藤", "accountingMethod": "記帳代行" , "status": "完了" },
            { "no": 103, "name": "合同会社ベータ", "fiscalMonth": "1月", "担当者": "鈴木", "accountingMethod": "自計" , "status": "完了" },
            { "no": 201, "name": "株式会社ガンマ", "fiscalMonth": "2月", "担当者": "高橋", "accountingMethod": "自計" , "status": "完了" },
            { "no": 301, "name": "有限会社デルタ", "fiscalMonth": "3月", "担当者": "田中", "accountingMethod": "記帳代行" , "status": "2チェック待ち" },
            { "no": 308, "name": "株式会社イプシロン", "fiscalMonth": "3月", "担当者": "渡辺", "accountingMethod": "記帳代行" , "status": "依頼中" },
            {"no":400,"name":"サンプル会社400","fiscalMonth":"1月","担当者":"佐藤","accountingMethod":"記帳代行","status":"未着手"},
            {"no":401,"name":"サンプル会社401","fiscalMonth":"2月","担当者":"鈴木","accountingMethod":"記帳代行","status":"未着手"},
            {"no":402,"name":"サンプル会社402","fiscalMonth":"3月","担当者":"高橋","accountingMethod":"記帳代行","status":"未着手"},
        ]

        initial_client_details_data = [
            {
                "no": 101, "name": "株式会社アルファ", "fiscalMonth": "1月","担当者": "佐藤",
                "customTasks": ["受付", "入力", "会計チェック", "担当者解決", "不明点", "試算表作成", "代表報告", "仕分け確認", "先生ロック"],
                "monthlyTasks": [
                    { "month": "2025年7月", "tasks": { "受付": True, "入力": True, "会計チェック": True, "担当者解決": True, "不明点": True, "試算表作成": True, "代表報告": True, "仕分け確認": True, "先生ロック": True }, "status": "月次完了", "url": "", "memo": "" },
                    { "month": "2025年8月", "tasks": { "受付": True, "入力": True, "会計チェック": True, "担当者解決": True, "不明点": True, "試算表作成": True, "代表報告": True, "仕分け確認": True, "先生ロック": True }, "status": "月次完了", "url": "", "memo": "" }
                ]
            },
            {
                "no": 103, "name": "合同会社ベータ", "fiscalMonth": "1月","担当者": "鈴木",
                "customTasks": ["受付", "入力", "会計チェック", "担当者解決", "不明点", "試算表作成", "代表報告", "仕分け確認", "先生ロック"],
                "monthlyTasks": [
                    { "month": "2025年7月", "tasks": { "受付": False, "入力": False, "会計チェック": False, "担当者解決": False, "不明点": False, "試算表作成": False, "代表報告": False, "仕分け確認": False, "先生ロック": False }, "status": "未入力", "url": "", "memo": "" },
                ]
            },
        ]

        for client_data in initial_clients_data:
            fiscal_month_int = int(client_data["fiscalMonth"].replace('月',''))
            client = Client(
                id=client_data["no"],
                name=client_data["name"],
                fiscal_month=fiscal_month_int,
                staff_id=staff_map[client_data["担当者"]],
                accounting_method=client_data["accountingMethod"],
                status=client_data["status"],
                custom_tasks=[] # Will be populated from details
            )
            db.session.add(client)

        for detail_data in initial_client_details_data:
            client = Client.query.get(detail_data["no"])
            if client:
                client.custom_tasks = detail_data.get("customTasks", [])
                for task_data in detail_data.get("monthlyTasks", []):
                    monthly_task = MonthlyTask(
                        client_id=client.id,
                        month=task_data["month"],
                        tasks=task_data["tasks"],
                        status=task_data["status"],
                        url=task_data["url"],
                        memo=task_data["memo"]
                    )
                    db.session.add(monthly_task)

        db.session.commit()
        print("Database initialized and seeded with initial data.")


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)