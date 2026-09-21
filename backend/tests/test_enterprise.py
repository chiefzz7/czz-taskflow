import pytest
from httpx import AsyncClient


@pytest.fixture
async def enterprise_and_headers(client: AsyncClient, auth_headers, registered_user):
    resp = await client.post("/api/v1/enterprises/", json={
        "name": "Test Corp",
        "description": "A test enterprise",
    }, headers=auth_headers)
    assert resp.status_code == 201
    return resp.json(), auth_headers


@pytest.mark.asyncio
async def test_create_enterprise(client: AsyncClient, auth_headers):
    resp = await client.post("/api/v1/enterprises/", json={
        "name": "My Enterprise",
    }, headers=auth_headers)
    assert resp.status_code == 201
    assert resp.json()["name"] == "My Enterprise"


@pytest.mark.asyncio
async def test_list_user_enterprises(client: AsyncClient, auth_headers):
    await client.post("/api/v1/enterprises/", json={"name": "Ent 1"}, headers=auth_headers)
    resp = await client.get("/api/v1/enterprises/", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_non_member_cannot_access_enterprise(client: AsyncClient):
    # Create enterprise with user A
    await client.post("/api/v1/auth/register", json={"name": "Owner", "email": "owner@t.com", "password": "Owner@123"})
    await client.post("/api/v1/auth/register", json={"name": "Outsider", "email": "outsider@t.com", "password": "Out@12345"})

    login_owner = await client.post("/api/v1/auth/login", json={"email": "owner@t.com", "password": "Owner@123"})
    login_out = await client.post("/api/v1/auth/login", json={"email": "outsider@t.com", "password": "Out@12345"})

    headers_owner = {"Authorization": f"Bearer {login_owner.json()['access_token']}"}
    headers_out = {"Authorization": f"Bearer {login_out.json()['access_token']}"}

    create = await client.post("/api/v1/enterprises/", json={"name": "Private Corp"}, headers=headers_owner)
    eid = create.json()["id"]

    # Outsider tries to access
    resp = await client.get(f"/api/v1/enterprises/{eid}", headers=headers_out)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_member_cannot_add_members(client: AsyncClient):
    """Only admins can add members — members must be rejected."""
    # Register admin and member
    await client.post("/api/v1/auth/register", json={"name": "AdminR", "email": "adminr@t.com", "password": "Admin@1234"})
    await client.post("/api/v1/auth/register", json={"name": "MemberR", "email": "memberr@t.com", "password": "Member@1234"})
    await client.post("/api/v1/auth/register", json={"name": "ThirdR", "email": "thirdr@t.com", "password": "Third@1234"})

    login_admin = await client.post("/api/v1/auth/login", json={"email": "adminr@t.com", "password": "Admin@1234"})
    login_member = await client.post("/api/v1/auth/login", json={"email": "memberr@t.com", "password": "Member@1234"})
    login_third = await client.post("/api/v1/auth/login", json={"email": "thirdr@t.com", "password": "Third@1234"})

    h_admin = {"Authorization": f"Bearer {login_admin.json()['access_token']}"}
    h_member = {"Authorization": f"Bearer {login_member.json()['access_token']}"}

    # Admin creates enterprise
    ent = await client.post("/api/v1/enterprises/", json={"name": "RBAC Corp"}, headers=h_admin)
    eid = ent.json()["id"]

    # Admin adds the member user
    third_id = login_third.json()  # we need the user id
    third_user = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {login_third.json()['access_token']}"})

    member_user = await client.get("/api/v1/auth/me", headers=h_member)
    mid = member_user.json()["id"]

    # Admin adds member to enterprise
    await client.post(f"/api/v1/enterprises/{eid}/members", json={"user_id": mid, "role": "member"}, headers=h_admin)

    # Member tries to add another user — should be forbidden
    tid = third_user.json()["id"]
    resp = await client.post(f"/api/v1/enterprises/{eid}/members", json={"user_id": tid, "role": "member"}, headers=h_member)
    assert resp.status_code == 403
