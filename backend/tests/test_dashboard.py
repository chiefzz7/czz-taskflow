import uuid
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_dashboard_flow(client: AsyncClient):
    uid = uuid.uuid4().hex[:8]
    email = f"dash_{uid}@dashboard.test"
    password = "Password123!"

    # 1. Register & Login
    reg_resp = await client.post("/api/v1/auth/register", json={
        "name": "Dashboard Tester",
        "email": email,
        "password": password,
    })
    assert reg_resp.status_code == 201

    login_resp = await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password,
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get Personal Dashboard
    dash_resp = await client.get("/api/v1/dashboard/personal", headers=headers)
    assert dash_resp.status_code == 200
    data = dash_resp.json()
    assert "total_tasks" in data
    assert "completion_rate" in data
    assert "by_status" in data
    assert "by_priority" in data

    # 3. Create Enterprise and Get Enterprise Dashboard
    ent_resp = await client.post("/api/v1/enterprises/", json={
        "name": f"Dash Corp {uid}",
        "description": "Testing dashboards",
    }, headers=headers)
    assert ent_resp.status_code == 201
    ent_id = ent_resp.json()["id"]

    ent_dash_resp = await client.get(f"/api/v1/dashboard/enterprise/{ent_id}", headers=headers)
    assert ent_dash_resp.status_code == 200
    ent_data = ent_dash_resp.json()
    assert "total_tasks" in ent_data
    assert "total_members" in ent_data
    assert ent_data["total_members"] >= 1
    assert "by_member" in ent_data
