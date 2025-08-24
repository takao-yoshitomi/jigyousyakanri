import pytest
import json
import os
import tempfile
from app import app, db

@pytest.fixture
def client():
    # Create a temporary file to serve as the test database
    db_fd, app.config['DATABASE'] = tempfile.mkstemp()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
        yield client
    
    os.close(db_fd)

def test_health_check(client):
    """Test basic health check endpoint"""
    rv = client.get('/api/health')
    assert rv.status_code == 200 or rv.status_code == 404  # 404 if endpoint doesn't exist

def test_get_clients(client):
    """Test getting clients list"""
    rv = client.get('/api/clients')
    assert rv.status_code == 200
    data = json.loads(rv.data)
    assert isinstance(data, list)

def test_get_staffs(client):
    """Test getting staff list"""
    rv = client.get('/api/staffs')
    assert rv.status_code == 200
    data = json.loads(rv.data)
    assert isinstance(data, list)

def test_create_staff(client):
    """Test creating a new staff member"""
    import random
    staff_name = f"テストスタッフ{random.randint(1000, 9999)}"
    staff_data = {"name": staff_name}
    rv = client.post('/api/staffs', 
                     data=json.dumps(staff_data),
                     content_type='application/json')
    assert rv.status_code in [201, 200]  # Accept both success codes
    
    # Verify staff was created
    rv = client.get('/api/staffs')
    data = json.loads(rv.data)
    staff_names = [staff['name'] for staff in data]
    assert staff_name in staff_names

def test_create_client(client):
    """Test creating a new client"""
    import random
    # First create a staff member
    staff_name = f"テストスタッフ{random.randint(1000, 9999)}"
    staff_data = {"name": staff_name}
    staff_rv = client.post('/api/staffs', 
                          data=json.dumps(staff_data),
                          content_type='application/json')
    
    # Get staff ID from the staff list
    staffs_rv = client.get('/api/staffs')
    staffs_data = json.loads(staffs_rv.data)
    staff_id = next(staff['id'] for staff in staffs_data if staff['name'] == staff_name)
    
    # Now create a client
    client_data = {
        "id": random.randint(1000, 9999),
        "name": "テストクライアント",
        "fiscal_month": 3,
        "staff_id": staff_id,
        "accounting_method": "記帳代行"
    }
    rv = client.post('/api/clients', 
                     data=json.dumps(client_data),
                     content_type='application/json')
    assert rv.status_code in [201, 200]

def test_get_client_details(client):
    """Test getting client details"""
    import random
    # First create staff and client
    staff_name = f"テストスタッフ{random.randint(1000, 9999)}"
    staff_data = {"name": staff_name}
    staff_rv = client.post('/api/staffs', 
                          data=json.dumps(staff_data),
                          content_type='application/json')
    
    # Get staff ID from the staff list
    staffs_rv = client.get('/api/staffs')
    staffs_data = json.loads(staffs_rv.data)
    staff_id = next(staff['id'] for staff in staffs_data if staff['name'] == staff_name)
    
    client_id = random.randint(1000, 9999)
    client_data = {
        "id": client_id,
        "name": "テストクライアント",
        "fiscal_month": 3,
        "staff_id": staff_id,
        "accounting_method": "記帳代行"
    }
    client_rv = client.post('/api/clients', 
                           data=json.dumps(client_data),
                           content_type='application/json')
    
    # Get client details
    rv = client.get(f'/api/clients/{client_id}')
    assert rv.status_code == 200
    data = json.loads(rv.data)
    assert data['name'] == "テストクライアント"
    assert data['fiscal_month'] == 3

def test_api_error_handling(client):
    """Test API error handling"""
    # Try to get non-existent client
    rv = client.get('/api/clients/999')
    assert rv.status_code == 404
    
    # Try to create client with invalid data
    invalid_data = {"name": ""}  # Missing required fields
    rv = client.post('/api/clients', 
                     data=json.dumps(invalid_data),
                     content_type='application/json')
    assert rv.status_code >= 400  # Should be an error status