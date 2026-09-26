import uuid
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_personal_chat_flow(client: AsyncClient):
    uid = uuid.uuid4().hex[:8]
    email_a = f"alpha_{uid}@chat.test"
    email_b = f"beta_{uid}@chat.test"

    # Register User A
    resp_a = await client.post("/api/v1/auth/register", json={
        "name": "User Alpha",
        "email": email_a,
        "password": "Password123!",
    })
    assert resp_a.status_code == 201
    user_a = resp_a.json()

    # Login User A
    login_a = await client.post("/api/v1/auth/login", json={
        "email": email_a,
        "password": "Password123!",
    })
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Register User B
    resp_b = await client.post("/api/v1/auth/register", json={
        "name": "User Beta",
        "email": email_b,
        "password": "Password123!",
    })
    assert resp_b.status_code == 201
    user_b = resp_b.json()

    # User A initiates direct personal chat with User B
    chat_resp = await client.post(
        "/api/v1/chat/personal/direct",
        json={"recipient_id": user_b["id"]},
        headers=headers_a,
    )
    assert chat_resp.status_code == 201
    chat_data = chat_resp.json()
    assert chat_data["type"] == "direct"
    assert chat_data["enterprise_id"] is None
    chat_id = chat_data["id"]

    # User A sends a message via HTTP
    msg_resp = await client.post(
        f"/api/v1/chat/{chat_id}/messages",
        json={"content": "Olá, tudo bem?", "type": "text"},
        headers=headers_a,
    )
    assert msg_resp.status_code == 201
    msg_data = msg_resp.json()
    assert msg_data["content"] == "Olá, tudo bem?"
    assert msg_data["author_id"] == user_a["id"]

    # User A fetches messages
    history_resp = await client.get(f"/api/v1/chat/{chat_id}/messages", headers=headers_a)
    assert history_resp.status_code == 200
    msgs = history_resp.json()
    assert len(msgs) >= 1
    assert msgs[-1]["content"] == "Olá, tudo bem?"

    # User A lists personal chats
    list_resp = await client.get("/api/v1/chat/personal", headers=headers_a)
    assert list_resp.status_code == 200
    chats = list_resp.json()
    assert any(c["id"] == chat_id for c in chats)
