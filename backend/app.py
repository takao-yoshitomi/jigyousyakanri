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
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    fiscal_month = db.Column(db.Integer, nullable=False)
    staff_id = db.Column(db.Integer, db.ForeignKey('staffs.id'), nullable=False)
    accounting_method = db.Column(db.String(255))
    status = db.Column(db.String(255))
    custom_tasks = db.Column(db.JSON)
    monthly_tasks = db.relationship('MonthlyTask', backref='client', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        # This is a simplified representation for the client list
        return {
            'no': self.id,
            'name': self.name,
            'fiscalMonth': f"{self.fiscal_month}月",
            '担当者': self.staff.name if self.staff else None,
            'accountingMethod': self.accounting_method,
            'status': self.status,
            # unattendedMonths and monthlyProgress will be calculated on the fly or stored differently
            'unattendedMonths': 'N/A',
            'monthlyProgress': 'N/A'
        }


class MonthlyTask(db.Model):
    __tablename__ = 'monthly_tasks'
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    month = db.Column(db.String(255), nullable=False) # Using String for simplicity like "2025年7月"
    tasks = db.Column(db.JSON)
    status = db.Column(db.String(255))
    url = db.Column(db.String(255))
    memo = db.Column(db.Text)


# --- API Endpoints ---

@app.route('/api/clients', methods=['GET'])
def get_clients():
    try:
        clients = Client.query.join(Staff).order_by(Client.id).all()
        return jsonify([client.to_dict() for client in clients])
    except Exception as e:
        # Log the error for debugging
        print(f"Error fetching clients: {e}")
        # Return a generic error response
        return jsonify({"error": "Could not fetch clients"}), 500


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