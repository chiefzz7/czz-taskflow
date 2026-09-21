import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_task(client: AsyncClient, auth_headers):
    resp = await client.post("/api/v1/tasks/", json={
        "title": "My Test Task",
        "description": "A test task",
        "priority": "high",
        "status": "todo",
    }, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "My Test Task"
    assert data["priority"] == "high"
    return data


@pytest.mark.asyncio
async def test_list_tasks(client: AsyncClient, auth_headers):
    # Create a task first
    await client.post("/api/v1/tasks/", json={"title": "Task A"}, headers=auth_headers)
    resp = await client.get("/api/v1/tasks/", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_update_task_status(client: AsyncClient, auth_headers):
    create_resp = await client.post("/api/v1/tasks/", json={"title": "Status Task"}, headers=auth_headers)
    task_id = create_resp.json()["id"]

    resp = await client.patch(f"/api/v1/tasks/{task_id}/status", json={"status": "in_progress"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "in_progress"


@pytest.mark.asyncio
async def test_delete_task(client: AsyncClient, auth_headers):
    create_resp = await client.post("/api/v1/tasks/", json={"title": "To Delete"}, headers=auth_headers)
    task_id = create_resp.json()["id"]

    resp = await client.delete(f"/api/v1/tasks/{task_id}", headers=auth_headers)
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_cannot_access_other_user_task(client: AsyncClient):
    # Register two users
    await client.post("/api/v1/auth/register", json={"name": "User A", "email": "usera@t.com", "password": "PassA@123"})
    await client.post("/api/v1/auth/register", json={"name": "User B", "email": "userb@t.com", "password": "PassB@123"})

    login_a = await client.post("/api/v1/auth/login", json={"email": "usera@t.com", "password": "PassA@123"})
    login_b = await client.post("/api/v1/auth/login", json={"email": "userb@t.com", "password": "PassB@123"})

    headers_a = {"Authorization": f"Bearer {login_a.json()['access_token']}"}
    headers_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}

    create = await client.post("/api/v1/tasks/", json={"title": "Private task"}, headers=headers_a)
    task_id = create.json()["id"]

    # User B should not be able to access User A's task
    resp = await client.get(f"/api/v1/tasks/{task_id}", headers=headers_b)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_tasks_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/v1/tasks/")
    assert resp.status_code == 403
