import os
import json
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.exc import IntegrityError
from flask_cors import CORS
from datetime import datetime, timezone, timedelta
import click
from dotenv import load_dotenv

load_dotenv()

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
    is_inactive = db.Column(db.Boolean, default=False, nullable=False)
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
            'is_inactive': self.is_inactive,
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

class DefaultTask(db.Model):
    __tablename__ = 'default_tasks'
    id = db.Column(db.Integer, primary_key=True)
    accounting_method = db.Column(db.String(255), nullable=False, unique=True)
    tasks = db.Column(db.JSON, default=[])
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'accounting_method': self.accounting_method,
            'tasks': self.tasks,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Setting(db.Model):
    __tablename__ = 'settings'
    key = db.Column(db.String(255), primary_key=True)
    value = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    def to_dict(self):
        return {
            'key': self.key,
            'value': self.value
        }

class EditingSession(db.Model):
    __tablename__ = 'editing_sessions'
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    user_id = db.Column(db.String(255), nullable=False)  # For now, use IP address or session ID
    started_at = db.Column(db.DateTime, server_default=db.func.now())
    last_activity = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())
    
    client = db.relationship('Client', backref='editing_sessions')
    
    def to_dict(self):
        return {
            'id': self.id,
            'client_id': self.client_id,
            'user_id': self.user_id,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'last_activity': self.last_activity.isoformat() if self.last_activity else None
        }

# --- API Endpoints ---

@app.route('/api/clients', methods=['GET'])
def get_clients():
    try:
        clients = Client.query.join(Staff).order_by(Client.id).all()
        client_list = []
        for client in clients:
            client_dict = client.to_dict()
            
            # Calculate latest completed month
            completed_tasks = [task for task in client.monthly_tasks if task.status == '月次完了']
            latest_completed_month = "未完了"
            if completed_tasks:
                latest_task = max(completed_tasks, key=lambda task: datetime.strptime(task.month, '%Y年%m月'))
                latest_completed_month = latest_task.month
            
            client_dict['monthlyProgress'] = latest_completed_month
            
            # Calculate unattended months
            unattended_months_str = "-"
            if latest_completed_month != "未完了":
                try:
                    completed_date = datetime.strptime(latest_completed_month, '%Y年%m月')
                    current_date = datetime.now()
                    month_diff = (current_date.year - completed_date.year) * 12 + (current_date.month - completed_date.month)
                    if month_diff > 0:
                        unattended_months_str = f"{month_diff}ヶ月"
                    else:
                        unattended_months_str = "0ヶ月"
                except ValueError:
                    unattended_months_str = "エラー"
            
            client_dict['unattendedMonths'] = unattended_months_str

            client_list.append(client_dict)

        return jsonify(client_list)
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

        # Fetch default tasks based on accounting method
        default_tasks = DefaultTask.query.filter_by(accounting_method=data['accounting_method']).first()
        
        initial_custom_tasks = {}
        if default_tasks and default_tasks.tasks:
            current_year = str(datetime.now().year)
            initial_custom_tasks[current_year] = default_tasks.tasks

        new_client = Client(
            id=data['id'],
            name=data['name'].strip(),
            fiscal_month=data['fiscal_month'],
            staff_id=data['staff_id'],
            accounting_method=data['accounting_method'],
            status=status, # ここで設定
            custom_tasks_by_year=initial_custom_tasks,
            finalized_years=[]
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
            'is_inactive': client.is_inactive,
            'custom_tasks_by_year': client.custom_tasks_by_year,
            'finalized_years': client.finalized_years,
            'monthly_tasks': [task.to_dict() for task in client.monthly_tasks],
            'updated_at': client.updated_at.astimezone(timezone.utc).isoformat() if client.updated_at else None
        }
        return jsonify(client_details)
    except Exception as e:
        print(f"Error fetching client details: {e}")
        return jsonify({"error": "Could not fetch client details"}), 500

@app.route('/api/clients/<int:client_id>', methods=['PUT'])
def update_client_details(client_id):
    from flask import request
    from datetime import datetime, timezone

    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid data"}), 400

    # --- Pessimistic Locking Implementation ---
    try:
        # Use pessimistic locking to prevent concurrent modifications
        client = Client.query.filter_by(id=client_id).with_for_update().first()
        if not client:
            return jsonify({"error": "Client not found"}), 404

        print(f"DEBUG: Acquired pessimistic lock for client {client_id}")

        # --- Update Logic ---
        # Update client's own fields
        client.name = data.get('name', client.name)
        client.fiscal_month = data.get('fiscal_month', client.fiscal_month)
        client.staff_id = data.get('staff_id', client.staff_id)
        client.accounting_method = data.get('accounting_method', client.accounting_method)
        client.status = data.get('status', client.status)
        client.custom_tasks_by_year = data.get('custom_tasks_by_year', client.custom_tasks_by_year)
        flag_modified(client, "custom_tasks_by_year")
        client.finalized_years = data.get('finalized_years', client.finalized_years)
        flag_modified(client, "finalized_years")

        # Update monthly tasks
        if 'monthly_tasks' in data:
            for task_data in data['monthly_tasks']:
                task_id = task_data.get('id')
                if task_id:
                    # Use pessimistic locking for monthly tasks as well
                    task = MonthlyTask.query.filter_by(id=task_id).with_for_update().first()
                    if task and task.client_id == client.id:
                        task.tasks = task_data.get('tasks', task.tasks)
                        flag_modified(task, "tasks")
                        task.status = task_data.get('status', task.status)
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


# --- Default Tasks Management API ---

@app.route('/api/default-tasks', methods=['GET'])
def get_default_tasks():
    try:
        defaults = DefaultTask.query.all()
        return jsonify({d.accounting_method: d.tasks for d in defaults})
    except Exception as e:
        print(f"Error fetching default tasks: {e}")
        return jsonify({"error": "Could not fetch default tasks"}), 500

@app.route('/api/default-tasks', methods=['PUT'])
def update_default_tasks():
    from flask import request
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid data"}), 400

    try:
        for method, tasks in data.items():
            default_task_entry = DefaultTask.query.filter_by(accounting_method=method).first()
            if default_task_entry:
                default_task_entry.tasks = tasks
                flag_modified(default_task_entry, "tasks")
            else:
                # This case should ideally not happen if DB is seeded
                new_default = DefaultTask(accounting_method=method, tasks=tasks)
                db.session.add(new_default)
        
        db.session.commit()
        return jsonify({"message": "Default tasks updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error updating default tasks: {e}")
        return jsonify({"error": "Could not update default tasks"}), 500


# --- Settings Management API ---

@app.route('/api/settings', methods=['GET'])
def get_settings():
    try:
        settings = Setting.query.all()
        return jsonify({s.key: s.value for s in settings})
    except Exception as e:
        print(f"Error fetching settings: {e}")
        return jsonify({"error": "Could not fetch settings"}), 500

@app.route('/api/settings', methods=['PUT'])
def update_settings():
    from flask import request
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid data"}), 400

    try:
        for key, value in data.items():
            setting_entry = Setting.query.filter_by(key=key).first()
            if setting_entry:
                setting_entry.value = value
                flag_modified(setting_entry, "value")
            else:
                # Create new setting if it doesn't exist
                new_setting = Setting(key=key, value=value)
                db.session.add(new_setting)
        
        db.session.commit()
        return jsonify({"message": "Settings updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error updating settings: {e}")
        return jsonify({"error": "Could not update settings"}), 500


@app.route('/')
def hello_world():
    return 'Hello from the backend! The database is connected.'

# --- Custom Tasks Management API ---
@app.route('/api/clients/<int:client_id>/custom-tasks/<year>', methods=['PUT'])
def update_custom_tasks_for_year(client_id, year):
    from flask import request
    from datetime import datetime, timezone
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid data"}), 400
    
    try:
        # Use pessimistic locking for custom tasks update
        client = Client.query.filter_by(id=client_id).with_for_update().first()
        if not client:
            return jsonify({"error": "Client not found"}), 404
        # Initialize custom_tasks_by_year if it doesn't exist
        if not client.custom_tasks_by_year:
            client.custom_tasks_by_year = {}
        
        # Update tasks for the specific year
        custom_tasks = data.get('custom_tasks', [])
        client.custom_tasks_by_year[year] = custom_tasks
        flag_modified(client, "custom_tasks_by_year")
        
        # Update timestamp
        client.updated_at = datetime.now(timezone.utc)
        
        db.session.commit()
        
        return jsonify({
            "message": "Custom tasks updated successfully",
            "year": year,
            "custom_tasks": custom_tasks
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating custom tasks: {e}")
        return jsonify({"error": "Could not update custom tasks"}), 500

@app.route('/api/clients/<int:client_id>/custom-tasks/sync-check', methods=['POST'])
def sync_check_custom_tasks(client_id):
    from flask import request
    
    client = Client.query.get(client_id)
    if not client:
        return jsonify({"error": "Client not found"}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid data"}), 400
    
    frontend_tasks_by_year = data.get('custom_tasks_by_year', {})
    db_tasks_by_year = client.custom_tasks_by_year or {}
    
    mismatches = []
    
    # Check for differences between frontend and DB
    all_years = set(frontend_tasks_by_year.keys()) | set(db_tasks_by_year.keys())
    
    for year in all_years:
        frontend_tasks = set(frontend_tasks_by_year.get(year, []))
        db_tasks = set(db_tasks_by_year.get(year, []))
        
        if frontend_tasks != db_tasks:
            mismatches.append({
                "year": year,
                "frontend_tasks": list(frontend_tasks),
                "db_tasks": list(db_tasks),
                "missing_in_frontend": list(db_tasks - frontend_tasks),
                "missing_in_db": list(frontend_tasks - db_tasks)
            })
    
    return jsonify({
        "is_synced": len(mismatches) == 0,
        "mismatches": mismatches,
        "db_tasks_by_year": db_tasks_by_year
    })

@app.route('/api/clients/<int:client_id>/cleanup-deleted-tasks', methods=['POST'])
def cleanup_deleted_tasks(client_id):
    from flask import request
    from datetime import datetime, timezone
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid data"}), 400
    
    try:
        # Use pessimistic locking for cleanup operation
        client = Client.query.filter_by(id=client_id).with_for_update().first()
        if not client:
            return jsonify({"error": "Client not found"}), 404
        year = data.get('year')
        deleted_tasks = data.get('deleted_tasks', [])
        
        if not year or not deleted_tasks:
            return jsonify({"error": "Year and deleted_tasks are required"}), 400
        
        cleaned_count = 0
        
        # Remove deleted tasks from all monthly_tasks for this client
        # Use pessimistic locking for monthly tasks as well
        monthly_tasks = MonthlyTask.query.filter_by(client_id=client_id).with_for_update().all()
        
        for monthly_task in monthly_tasks:
            if monthly_task.tasks:
                original_tasks = monthly_task.tasks.copy()
                for deleted_task in deleted_tasks:
                    if deleted_task in monthly_task.tasks:
                        del monthly_task.tasks[deleted_task]
                        cleaned_count += 1
                
                # Mark the field as modified if changes were made
                if original_tasks != monthly_task.tasks:
                    flag_modified(monthly_task, "tasks")
        
        # Update timestamp
        client.updated_at = datetime.now(timezone.utc)
        
        db.session.commit()
        
        return jsonify({
            "message": f"Cleaned up {cleaned_count} deleted task references",
            "deleted_tasks": deleted_tasks,
            "year": year
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error cleaning up deleted tasks: {e}")
        return jsonify({"error": "Could not cleanup deleted tasks"}), 500

@app.route('/api/clients/<int:client_id>/propagate-tasks', methods=['POST'])
def propagate_tasks_to_future_years(client_id):
    from flask import request
    from datetime import datetime, timezone
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid data"}), 400
    
    try:
        # Use pessimistic locking for propagate operation
        client = Client.query.filter_by(id=client_id).with_for_update().first()
        if not client:
            return jsonify({"error": "Client not found"}), 404
        source_year = data.get('source_year')
        target_years = data.get('target_years', [])
        
        print(f"Propagate request: source_year={source_year}, target_years={target_years}")
        print(f"Client custom_tasks_by_year: {client.custom_tasks_by_year}")
        
        if not source_year:
            return jsonify({"error": "Source year is required"}), 400
        
        if not client.custom_tasks_by_year:
            client.custom_tasks_by_year = {}
        
        source_tasks = client.custom_tasks_by_year.get(source_year, [])
        
        print(f"Source tasks for {source_year}: {source_tasks}")
        
        if not source_tasks:
            return jsonify({"error": f"No tasks found for source year {source_year}. Available years: {list(client.custom_tasks_by_year.keys())}"}), 400
        
        finalized_years = client.finalized_years or []
        propagated_to = []
        
        # If target_years not specified, propagate to all future unfinalized years
        if not target_years:
            current_year = int(source_year)
            for year in range(current_year + 1, current_year + 10):
                year_str = str(year)
                if year_str not in finalized_years:
                    target_years.append(year_str)
        
        for target_year in target_years:
            if target_year not in finalized_years:
                client.custom_tasks_by_year[target_year] = source_tasks.copy()
                propagated_to.append(target_year)
        
        flag_modified(client, "custom_tasks_by_year")
        client.updated_at = datetime.now(timezone.utc)
        
        db.session.commit()
        
        return jsonify({
            "message": f"Tasks propagated to {len(propagated_to)} years",
            "source_year": source_year,
            "propagated_to": propagated_to,
            "tasks": source_tasks
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error propagating tasks: {e}")
        return jsonify({"error": "Could not propagate tasks"}), 500

# --- Editing Session Management API ---

@app.route('/api/clients/<int:client_id>/editing-session', methods=['POST'])
def start_editing_session(client_id):
    from flask import request
    from datetime import datetime, timezone
    
    data = request.get_json() or {}
    user_id = data.get('user_id', request.remote_addr)  # Use IP as fallback
    
    try:
        # Check if client exists
        client = Client.query.get(client_id)
        if not client:
            return jsonify({"error": "Client not found"}), 404
        
        # Clean up expired sessions (older than 10 minutes)
        expired_time = datetime.now(timezone.utc) - timedelta(minutes=10)
        EditingSession.query.filter(
            EditingSession.last_activity < expired_time
        ).delete()
        
        # Check if there's an active editing session by another user
        active_session = EditingSession.query.filter_by(client_id=client_id).first()
        if active_session and active_session.user_id != user_id:
            return jsonify({
                "status": "editing_by_other",
                "message": "Client is currently being edited by another user",
                "editor": active_session.user_id,
                "started_at": active_session.started_at.isoformat()
            }), 200
        
        # If same user, update last activity
        if active_session and active_session.user_id == user_id:
            active_session.last_activity = datetime.now(timezone.utc)
        else:
            # Create new editing session
            new_session = EditingSession(
                client_id=client_id,
                user_id=user_id
            )
            db.session.add(new_session)
        
        db.session.commit()
        
        return jsonify({
            "status": "editing_allowed",
            "message": "Editing session started successfully",
            "user_id": user_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error starting editing session: {e}")
        return jsonify({"error": "Could not start editing session"}), 500

@app.route('/api/clients/<int:client_id>/editing-session', methods=['PUT'])
def update_editing_session(client_id):
    from flask import request
    from datetime import datetime, timezone
    
    data = request.get_json() or {}
    user_id = data.get('user_id', request.remote_addr)
    
    try:
        session = EditingSession.query.filter_by(
            client_id=client_id, 
            user_id=user_id
        ).first()
        
        if session:
            session.last_activity = datetime.now(timezone.utc)
            db.session.commit()
            return jsonify({"message": "Session updated"}), 200
        else:
            return jsonify({"error": "No active session found"}), 404
            
    except Exception as e:
        db.session.rollback()
        print(f"Error updating editing session: {e}")
        return jsonify({"error": "Could not update session"}), 500

@app.route('/api/clients/<int:client_id>/editing-session', methods=['DELETE'])
def end_editing_session(client_id):
    from flask import request
    
    data = request.get_json() or {}
    user_id = data.get('user_id', request.remote_addr)
    
    try:
        session = EditingSession.query.filter_by(
            client_id=client_id,
            user_id=user_id
        ).first()
        
        if session:
            db.session.delete(session)
            db.session.commit()
            return jsonify({"message": "Editing session ended"}), 200
        else:
            return jsonify({"message": "No session to end"}), 200
            
    except Exception as e:
        db.session.rollback()
        print(f"Error ending editing session: {e}")
        return jsonify({"error": "Could not end session"}), 500

@app.route('/api/clients/<int:client_id>/editing-status', methods=['GET'])
def get_editing_status(client_id):
    from datetime import datetime, timezone, timedelta
    
    try:
        # Clean up expired sessions first
        expired_time = datetime.now(timezone.utc) - timedelta(minutes=10)
        EditingSession.query.filter(
            EditingSession.last_activity < expired_time
        ).delete()
        db.session.commit()
        
        # Check current editing status
        active_session = EditingSession.query.filter_by(client_id=client_id).first()
        
        if active_session:
            return jsonify({
                "is_editing": True,
                "editor": active_session.user_id,
                "started_at": active_session.started_at.isoformat(),
                "last_activity": active_session.last_activity.isoformat()
            }), 200
        else:
            return jsonify({
                "is_editing": False
            }), 200
            
    except Exception as e:
        print(f"Error getting editing status: {e}")
        return jsonify({"error": "Could not get editing status"}), 500

@app.route('/api/clients/<int:client_id>/editing-session/force-unlock', methods=['DELETE'])
def force_unlock_editing_session(client_id):
    """Force unlock editing session (管理者用)"""
    try:
        # Delete all editing sessions for this client
        deleted_count = EditingSession.query.filter_by(client_id=client_id).delete()
        db.session.commit()
        
        return jsonify({
            "message": "Editing session forcefully unlocked",
            "sessions_removed": deleted_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error force unlocking session: {e}")
        return jsonify({"error": "Could not force unlock session"}), 500

# --- Client Deletion APIs ---

@app.route('/api/clients/<int:client_id>/set-inactive', methods=['PUT'])
def set_client_inactive(client_id):
    """Set client as inactive (関与終了)"""
    try:
        # Use pessimistic locking
        client = db.session.query(Client).filter_by(id=client_id).with_for_update().first()
        
        if not client:
            return jsonify({"error": "Client not found"}), 404
            
        client.is_inactive = True
        client.updated_at = datetime.now(timezone.utc)
        
        db.session.commit()
        
        return jsonify({
            "message": f"事業者 {client.name} を関与終了に設定しました",
            "client_id": client_id,
            "is_inactive": True
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error setting client inactive: {e}")
        return jsonify({"error": "関与終了の設定に失敗しました"}), 500

@app.route('/api/clients/<int:client_id>/reactivate', methods=['PUT'])
def reactivate_client(client_id):
    """Reactivate inactive client (関与終了から復活)"""
    try:
        # Use pessimistic locking
        client = db.session.query(Client).filter_by(id=client_id).with_for_update().first()
        
        if not client:
            return jsonify({"error": "Client not found"}), 404
            
        client.is_inactive = False
        client.updated_at = datetime.now(timezone.utc)
        
        db.session.commit()
        
        return jsonify({
            "message": f"事業者 {client.name} を復活しました",
            "client_id": client_id,
            "is_inactive": False
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error reactivating client: {e}")
        return jsonify({"error": "復活の設定に失敗しました"}), 500

@app.route('/api/clients/<int:client_id>', methods=['DELETE'])
def delete_client(client_id):
    """Completely delete client and all related data"""
    try:
        # Use pessimistic locking
        client = db.session.query(Client).filter_by(id=client_id).with_for_update().first()
        
        if not client:
            return jsonify({"error": "Client not found"}), 404
        
        client_name = client.name
        
        # Delete all related monthly tasks (cascade should handle this, but explicit deletion for safety)
        MonthlyTask.query.filter_by(client_id=client_id).delete()
        
        # Delete the client
        db.session.delete(client)
        db.session.commit()
        
        return jsonify({
            "message": f"事業者 {client_name} を完全に削除しました",
            "client_id": client_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting client: {e}")
        return jsonify({"error": "事業者の削除に失敗しました"}), 500

# --- CSV Import/Export APIs ---

@app.route('/api/clients/export', methods=['GET'])
def export_clients_csv():
    """Export all clients to CSV format"""
    try:
        clients = Client.query.join(Staff).all()
        
        # Create CSV data
        import csv
        import io
        output = io.StringIO()
        writer = csv.writer(output)
        
        # CSV headers
        headers = ['No.', '事業所名', '決算月', '担当者', '経理方式', '進捗ステータス', '状態']
        writer.writerow(headers)
        
        # CSV data rows
        for client in clients:
            status = "関与終了" if client.is_inactive else "有効"
            writer.writerow([
                client.id,
                client.name,
                f"{client.fiscal_month}月",
                client.staff.name,
                client.accounting_method,
                client.status,
                status
            ])
        
        # Prepare response with BOM for Excel compatibility
        output.seek(0)
        csv_data = output.getvalue()
        output.close()
        
        # Add UTF-8 BOM for proper Excel display
        csv_data_with_bom = '\ufeff' + csv_data
        
        from flask import make_response
        response = make_response(csv_data_with_bom.encode('utf-8'))
        response.headers['Content-Type'] = 'text/csv; charset=utf-8'
        response.headers['Content-Disposition'] = 'attachment; filename=clients.csv'
        
        return response
        
    except Exception as e:
        print(f"Error exporting clients: {e}")
        return jsonify({"error": "CSVエクスポートに失敗しました"}), 500

@app.route('/api/clients/import', methods=['POST'])
def import_clients_csv():
    """Import clients from CSV format"""
    from flask import request
    try:
        if 'file' not in request.files:
            return jsonify({"error": "ファイルが選択されていません"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "ファイルが選択されていません"}), 400
        
        if not file.filename.lower().endswith('.csv'):
            return jsonify({"error": "CSVファイルを選択してください"}), 400
        
        # Read CSV data with proper encoding detection
        import csv
        import io
        
        # Try to decode with UTF-8 first, then with other encodings
        file_content = file.stream.read()
        try:
            # Try UTF-8 (with or without BOM)
            decoded_content = file_content.decode('utf-8-sig')
        except UnicodeDecodeError:
            try:
                # Try Shift_JIS (common in Japan)
                decoded_content = file_content.decode('shift_jis')
            except UnicodeDecodeError:
                try:
                    # Try CP932 (Windows Japanese)
                    decoded_content = file_content.decode('cp932')
                except UnicodeDecodeError:
                    # Fallback to UTF-8 with errors='replace'
                    decoded_content = file_content.decode('utf-8', errors='replace')
        
        stream = io.StringIO(decoded_content, newline=None)
        csv_reader = csv.reader(stream)
        
        # Skip header row
        headers = next(csv_reader, None)
        if not headers:
            return jsonify({"error": "CSVファイルが空です"}), 400
        
        # Get existing staff for validation
        staff_map = {staff.name: staff.id for staff in Staff.query.all()}
        
        added_count = 0
        updated_count = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):  # Start from row 2 (after header)
            try:
                if len(row) < 6:
                    errors.append(f"行{row_num}: データが不足しています")
                    continue
                
                client_no = int(row[0]) if row[0].isdigit() else None
                name = row[1].strip()
                fiscal_month = row[2].replace('月', '').strip()
                staff_name = row[3].strip()
                accounting_method = row[4].strip()
                status = row[5].strip()
                is_inactive = len(row) > 6 and row[6].strip() == "関与終了"
                
                # Validation
                if not client_no:
                    errors.append(f"行{row_num}: 無効なNo.です")
                    continue
                    
                if not name:
                    errors.append(f"行{row_num}: 事業所名が空です")
                    continue
                    
                if not fiscal_month.isdigit() or not (1 <= int(fiscal_month) <= 12):
                    errors.append(f"行{row_num}: 無効な決算月です")
                    continue
                    
                if staff_name not in staff_map:
                    errors.append(f"行{row_num}: 担当者 '{staff_name}' が見つかりません")
                    continue
                
                # Check if client exists
                existing_client = Client.query.filter_by(id=client_no).first()
                
                if existing_client:
                    # Update existing client
                    existing_client.name = name
                    existing_client.fiscal_month = int(fiscal_month)
                    existing_client.staff_id = staff_map[staff_name]
                    existing_client.accounting_method = accounting_method
                    existing_client.status = status
                    existing_client.is_inactive = is_inactive
                    updated_count += 1
                else:
                    # Create new client
                    new_client = Client(
                        id=client_no,
                        name=name,
                        fiscal_month=int(fiscal_month),
                        staff_id=staff_map[staff_name],
                        accounting_method=accounting_method,
                        status=status,
                        is_inactive=is_inactive,
                        custom_tasks_by_year={},
                        finalized_years=[]
                    )
                    db.session.add(new_client)
                    added_count += 1
                    
            except Exception as e:
                errors.append(f"行{row_num}: {str(e)}")
                continue
        
        # Commit changes if no critical errors
        if added_count > 0 or updated_count > 0:
            db.session.commit()
        
        result = {
            "message": f"インポート完了: {added_count}件追加, {updated_count}件更新",
            "added": added_count,
            "updated": updated_count,
            "errors": errors
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error importing clients: {e}")
        return jsonify({"error": "CSVインポートに失敗しました"}), 500

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

        # --- Initial Default Tasks ---
        default_tasks_data = [
            {
                "accounting_method": "記帳代行",
                "tasks": ["受付", "入力確認","担当者チェック", "不明点解消", "先生へ報告"]
            },
            {
                "accounting_method": "自計",
                "tasks": ["データ受領", "担当者チェック", "不明点解消", "先生へ報告"]
            }
        ]
        for data in default_tasks_data:
            default_task = DefaultTask(
                accounting_method=data["accounting_method"],
                tasks=data["tasks"]
            )
            db.session.add(default_task)
        db.session.commit()

        # Fetch the just-created default tasks to use for seeding clients
        default_tasks_map = {d.accounting_method: d.tasks for d in DefaultTask.query.all()}
        current_year_str = str(datetime.now().year)

        for client_data in initial_clients_data:
            fiscal_month_int = int(client_data["fiscal_month"].replace('月',''))
            accounting_method = client_data["accounting_method"]
            
            # Get default tasks for the client's accounting method
            tasks_for_method = default_tasks_map.get(accounting_method, [])
            initial_custom_tasks = {current_year_str: tasks_for_method} if tasks_for_method else {}

            client = Client(
                id=client_data["no"],
                name=client_data["name"],
                fiscal_month=fiscal_month_int,
                staff_id=staff_map[client_data["担当者"]],
                accounting_method=accounting_method,
                status=client_data["status"],
                custom_tasks_by_year=initial_custom_tasks,
                finalized_years=[]
            )
            db.session.add(client)

        db.session.commit()
        # --- Initial Settings ---
        initial_settings = {
            'highlight_yellow_threshold': 3,
            'highlight_yellow_color': '#FFFF99',
            'highlight_red_threshold': 6,
            'highlight_red_color': '#FFCDD2',
            'font_family': '' # Default font family
        }
        for key, value in initial_settings.items():
            setting = Setting(key=key, value=value)
            db.session.add(setting)
        db.session.commit()

        print("Database initialized and seeded with initial data.")


# Auto-initialize database on startup (for production)
def ensure_database_initialized():
    """Ensure database is initialized when app starts"""
    import os
    if os.environ.get('FLASK_ENV') == 'production':
        with app.app_context():
            try:
                # Check if tables exist by trying to query
                existing_staff = Staff.query.first()
                existing_clients = Client.query.first()
                
                if existing_staff and not existing_clients:
                    print("✅ Staff table exists, but no clients found. Adding sample data...")
                    # Add sample data directly
                    from add_sample_data import add_sample_data
                    add_sample_data()
                elif existing_staff and existing_clients:
                    # Check if we have sample data (5 specific clients)
                    client_count = Client.query.count()
                    if client_count < 5:
                        print(f"✅ Found {client_count} clients, adding more sample data...")
                        from add_sample_data import add_sample_data
                        add_sample_data()
                    else:
                        print("✅ Database already initialized - Staff and Client tables exist")
                else:
                    print("✅ Database already initialized")
            except Exception as e:
                if "does not exist" in str(e) or "UndefinedTable" in str(e):
                    print("🔄 Tables don't exist, initializing database...")
                    try:
                        db.create_all()
                        print("✅ Database tables created successfully!")
                        
                        # Add initial data
                        initial_staffs_data = ["佐藤", "鈴木", "高橋", "田中", "渡辺"]
                        staff_map = {}
                        for name in initial_staffs_data:
                            existing_staff = Staff.query.filter_by(name=name).first()
                            if not existing_staff:
                                staff = Staff(name=name)
                                db.session.add(staff)
                                db.session.flush()  # Get ID immediately
                                staff_map[name] = staff.id
                            else:
                                staff_map[name] = existing_staff.id
                        
                        # Add sample clients
                        sample_clients = [
                            {"no": 101, "name": "株式会社サンプル", "fiscal_month": "3月", "staff": "佐藤", "method": "記帳代行", "status": "作業中"},
                            {"no": 102, "name": "テスト商事", "fiscal_month": "12月", "staff": "鈴木", "method": "自計", "status": "完了"},
                            {"no": 103, "name": "サンプル工業", "fiscal_month": "9月", "staff": "高橋", "method": "記帳代行", "status": "依頼中"},
                        ]
                        
                        for client_data in sample_clients:
                            existing_client = Client.query.filter_by(id=client_data["no"]).first()
                            if not existing_client:
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
                        
                        db.session.commit()
                        print("✅ Initial staff and client data created")
                    except Exception as init_error:
                        print(f"❌ Database creation failed: {init_error}")
                        raise
                else:
                    print(f"❌ Database check failed: {e}")
                    raise

# Initialize database on import (for production)
ensure_database_initialized()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)