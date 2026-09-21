import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.fixture(scope="function")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def registered_user(client: AsyncClient):
    resp = await client.post("/api/v1/auth/register", json={
        "name": "Test User",
        "email": "test@test.com",
        "password": "TestPass@123",
    })
    assert resp.status_code == 201
    return resp.json()


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient, registered_user):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "test@test.com",
        "password": "TestPass@123",
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
