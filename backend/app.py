import os
import json
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from sqlalchemy.orm.attributes import flag_modified
from flask_cors import CORS
from datetime import datetime, timezone
import click

app = Flask(__name__)
CORS(app)

# --- Database Configuration ---
DATABASE_URL = os.environ.get('DATABASE_URL')

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)

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
    custom_tasks_by_year = db.Column(db.JSON, default={})
    finalized_years = db.Column(db.JSON, default=[])
    monthly_tasks = db.relationship('MonthlyTask', backref='client', lazy=True, cascade="all, delete-orphan")
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'fiscal_month': self.fiscal_month,
            'staff_name': self.staff.name if self.staff else None,
            'accounting_method': self.accounting_method,
            'status': self.status,
            'unattendedMonths': 'N/A', # To be calculated later
            'monthlyProgress': 'N/A', # To be calculated later
            'updated_at': self.updated_at.astimezone(timezone.utc).isoformat() if self.updated_at else None,
            'custom_tasks_by_year': self.custom_tasks_by_year,
            'finalized_years': self.finalized_years
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
    from flask import request
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid data"}), 400

        print(f"DEBUG: Received data for create_client: {data}")

        required_fields = ['id', 'name', 'fiscal_month', 'staff_id', 'accounting_method']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400

        # Validate data types and values
        if not isinstance(data['id'], (int, str)) or not str(data['id']).strip():
            return jsonify({"error": "Client ID must be a non-empty value"}), 400
        
        if not isinstance(data['name'], str) or not data['name'].strip():
            return jsonify({"error": "Client name must be a non-empty string"}), 400

        if not isinstance(data['fiscal_month'], int) or not (1 <= data['fiscal_month'] <= 12):
            return jsonify({"error": "Fiscal month must be an integer between 1 and 12"}), 400

        # Check if client ID already exists
        existing_client = Client.query.get(data['id'])
        if existing_client:
            return jsonify({"error": f"Client with No. {data['id']} already exists."}), 409

        # Check if staff_id exists (if you have a Staff model)
        # staff = Staff.query.get(data['staff_id'])
        # if not staff:
        #     return jsonify({"error": f"Staff with ID {data['staff_id']} not found"}), 400

   
                # Validate accounting method
        valid_accounting_methods = ['記帳代行', '自計']  # Adjust as needed
        if data['accounting_method'] not in valid_accounting_methods:
            return jsonify({"error": f"Invalid accounting method. Must be one of: {', '.join(valid_accounting_methods)}"}), 400

        # statusは任意とし、指定がなければデフォルト値を設定
        status = data.get('status', '未着手')
        valid_statuses = ['未着手', '依頼中', 'チェック待ち', '作業中', '完了']
        if status not in valid_statuses:
            return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400

        new_client = Client(
            id=data['id'],
            name=data['name'].strip(),
            fiscal_month=data['fiscal_month'],
            staff_id=data['staff_id'],
            accounting_method=data['accounting_method'],
            status=status, # ここで設定
            custom_tasks=["受付", "入力", "会計チェック", "担当者解決", "不明点", "試算表作成", "代表報告", "仕分け確認", "先生ロック"]
        )
        
        print("DEBUG: Before db.session.add(new_client)")
        db.session.add(new_client)
        print("DEBUG: Before db.session.commit()")
        db.session.commit()
        print("DEBUG: After db.session.commit()")
        
        return jsonify(new_client.to_dict()), 201

    except IntegrityError as e:
        db.session.rollback()
        print(f"DEBUG: Database integrity error in create_client: {e}")
        return jsonify({"error": "Database constraint violation. Please check your data."}), 409
    
    except Exception as e:
        db.session.rollback()
        print(f"DEBUG: Top-level error in create_client: {e}")
        return jsonify({"error": "Could not create client due to an unexpected error."}), 500






@app.route('/api/clients/<int:client_id>', methods=['GET'])
def get_client_details(client_id):
    try:
        client = Client.query.get(client_id)
        if not client:
            return jsonify({"error": "Client not found"}), 404
        
        client_details = {
            'id': client.id,
            'name': client.name,
            'fiscal_month': client.fiscal_month,
            'staff_id': client.staff_id,
            'status': client.status,
            'accounting_method': client.accounting_method,
            'custom_tasks': client.custom_tasks,
            'monthly_tasks': [task.to_dict() for task in client.monthly_tasks],
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
        client.custom_tasks = data.get('custom_tasks', client.custom_tasks)
        flag_modified(client, "custom_tasks")

        # Update monthly tasks
        if 'monthly_tasks' in data:
            for task_data in data['monthly_tasks']:
                task_id = task_data.get('id')
                if task_id:
                    task = MonthlyTask.query.get(task_id)
                    if task and task.client_id == client.id:
                        task.tasks = task_data.get('tasks', task.tasks)
                        flag_modified(task, "tasks")
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

        # Return the updated client data using the same format as get_client_details
        updated_client = Client.query.get(client_id)
        return get_client_details(client_id)

    except Exception as e:
        db.session.rollback()
        print(f"Error updating client details: {e}")
        return jsonify({"error": "Could not update client details"}), 500

def staff_to_dict(staff):
    """Converts a Staff object to a dictionary."""
    return {'id': staff.id, 'name': staff.name}

@app.route('/api/staffs', methods=['GET'])
def get_staffs():
    try:
        staffs = Staff.query.order_by(Staff.id).all()
        return jsonify([staff_to_dict(s) for s in staffs])
    except Exception as e:
        print(f"Error fetching staffs: {e}")
        return jsonify({"error": "Could not fetch staffs"}), 500


@app.route('/api/staffs', methods=['POST'])
def create_staff():
    from flask import request
    data = request.get_json()
    if not data or not 'name' in data or not data['name'].strip():
        return jsonify({"error": "Staff name cannot be empty"}), 400

    new_name = data['name'].strip()

    # Check if staff name already exists
    if Staff.query.filter_by(name=new_name).first():
        return jsonify({"error": "Staff with this name already exists"}), 409

    try:
        new_staff = Staff(name=new_name)
        db.session.add(new_staff)
        db.session.commit()
        return jsonify(staff_to_dict(new_staff)), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error creating staff: {e}")
        return jsonify({"error": "Could not create staff"}), 500


@app.route('/api/staffs/<int:staff_id>', methods=['DELETE'])
def delete_staff(staff_id):
    staff = Staff.query.get(staff_id)
    if not staff:
        return jsonify({"error": "Staff not found"}), 404

    # Optional: Check if the staff is associated with any clients
    if staff.clients:
        return jsonify({"error": "Cannot delete staff associated with clients"}), 409

    try:
        db.session.delete(staff)
        db.session.commit()
        return jsonify({"message": "Staff deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting staff: {e}")
        return jsonify({"error": "Could not delete staff"}), 500


@app.route('/api/staffs/<int:staff_id>', methods=['PUT'])
def update_staff(staff_id):
    from flask import request
    staff = Staff.query.get(staff_id)
    if not staff:
        return jsonify({"error": "Staff not found"}), 404

    data = request.get_json()
    if not data or not 'name' in data or not data['name'].strip():
        return jsonify({"error": "Staff name cannot be empty"}), 400

    new_name = data['name'].strip()

    # Check if the new name is already taken by another staff member
    existing_staff = Staff.query.filter(Staff.id != staff_id, Staff.name == new_name).first()
    if existing_staff:
        return jsonify({"error": "Staff with this name already exists"}), 409

    try:
        staff.name = new_name
        db.session.commit()
        return jsonify(staff_to_dict(staff)), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error updating staff: {e}")
        return jsonify({"error": "Could not update staff"}), 500


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
            { "no": 101, "name": "株式会社アルファ", "fiscal_month": "1月", "担当者": "佐藤", "accounting_method": "記帳代行" , "status": "完了" },
            { "no": 103, "name": "合同会社ベータ", "fiscal_month": "1月", "担当者": "鈴木", "accounting_method": "自計" , "status": "完了" },
            { "no": 201, "name": "株式会社ガンマ", "fiscal_month": "2月", "担当者": "高橋", "accounting_method": "自計" , "status": "完了" },
            { "no": 301, "name": "有限会社デルタ", "fiscal_month": "3月", "担当者": "田中", "accounting_method": "記帳代行" , "status": "2チェック待ち" },
            { "no": 308, "name": "株式会社イプシロン", "fiscal_month": "3月", "担当者": "渡辺", "accounting_method": "記帳代行" , "status": "依頼中" },
            {"no":400,"name":"サンプル会社400","fiscal_month":"1月","担当者":"佐藤","accounting_method":"記帳代行","status":"未着手"},
            {"no":401,"name":"サンプル会社401","fiscal_month":"2月","担当者":"鈴木","accounting_method":"記帳代行","status":"未着手"},
            {"no":402,"name":"サンプル会社402","fiscal_month":"3月","担当者":"高橋","accounting_method":"記帳代行","status":"未着手"},
        ]

        initial_client_details_data = [
            {
                "no": 101, "name": "株式会社アルファ", "fiscal_month": "1月","担当者": "佐藤",
                "custom_tasks": ["受付", "入力", "会計チェック", "担当者解決", "不明点", "試算表作成", "代表報告", "仕分け確認", "先生ロック"],
                "monthly_tasks": [
                    { "month": "2025年7月", "tasks": { "受付": True, "入力": True, "会計チェック": True, "担当者解決": True, "不明点": True, "試算表作成": True, "代表報告": True, "仕分け確認": True, "先生ロック": True }, "status": "月次完了", "url": "", "memo": "" },
                    { "month": "2025年8月", "tasks": { "受付": True, "入力": True, "会計チェック": True, "担当者解決": True, "不明点": True, "試算表作成": True, "代表報告": True, "仕分け確認": True, "先生ロック": True }, "status": "月次完了", "url": "", "memo": "" }
                ]
            },
            {
                "no": 103, "name": "合同会社ベータ", "fiscal_month": "1月","担当者": "鈴木",
                "custom_tasks": ["受付", "入力", "会計チェック", "担当者解決", "不明点", "試算表作成", "代表報告", "仕分け確認", "先生ロック"],
                "monthly_tasks": [
                    { "month": "2025年7月", "tasks": { "受付": False, "入力": False, "会計チェック": False, "担当者解決": False, "不明点": False, "試算表作成": False, "代表報告": False, "仕分け確認": False, "先生ロック": False }, "status": "未入力", "url": "", "memo": "" },
                ]
            },
        ]

        for client_data in initial_clients_data:
            fiscal_month_int = int(client_data["fiscal_month"].replace('月',''))
            client = Client(
                id=client_data["no"],
                name=client_data["name"],
                fiscal_month=fiscal_month_int,
                staff_id=staff_map[client_data["担当者"]],
                accounting_method=client_data["accounting_method"],
                status=client_data["status"],
                custom_tasks=[] # Will be populated from details
            )
            db.session.add(client)

        for detail_data in initial_client_details_data:
            client = Client.query.get(detail_data["no"])
            if client:
                client.custom_tasks = detail_data.get("custom_tasks", [])
                for task_data in detail_data.get("monthly_tasks", []):
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