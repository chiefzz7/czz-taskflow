from abc import ABC, abstractmethod
from typing import Optional
import os
import uuid
import aiofiles

from app.core.config import settings


class StorageService(ABC):
    """
    Abstract storage interface.
    Swap LocalStorageService → SupabaseStorageService without touching business logic.
    """

    @abstractmethod
    async def upload(self, content: bytes, key: str, content_type: str) -> str:
        """Upload file content and return a URL."""
        ...

    @abstractmethod
    async def get_url(self, key: str) -> str:
        """Get the URL for an existing file."""
        ...

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete a file by key."""
        ...


class LocalStorageService(StorageService):
    """Development-only local filesystem storage."""

    def __init__(self, upload_dir: Optional[str] = None) -> None:
        self._dir = upload_dir or settings.UPLOAD_DIR
        os.makedirs(self._dir, exist_ok=True)

    async def upload(self, content: bytes, key: str, content_type: str) -> str:
        file_path = os.path.join(self._dir, key)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(content)
        return f"/uploads/{key}"

    async def get_url(self, key: str) -> str:
        return f"/uploads/{key}"

    async def delete(self, key: str) -> None:
        file_path = os.path.join(self._dir, key)
        if os.path.exists(file_path):
            os.remove(file_path)


class SupabaseStorageService(StorageService):
    """Armazenamento em nuvem usando Supabase Storage."""

    def __init__(self) -> None:
        from supabase import create_client
        self.client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY,
        )
        self.bucket = settings.SUPABASE_BUCKET

    async def upload(self, content: bytes, key: str, content_type: str) -> str:
        # Upload para o bucket público do Supabase
        self.client.storage.from_(self.bucket).upload(
            path=key,
            file=content,
            file_options={"content-type": content_type, "upsert": "true"},
        )
        return self.client.storage.from_(self.bucket).get_public_url(key)

    async def get_url(self, key: str) -> str:
        return self.client.storage.from_(self.bucket).get_public_url(key)

    async def delete(self, key: str) -> None:
        self.client.storage.from_(self.bucket).remove([key])


def get_storage_service() -> StorageService:
    """Factory — returns the correct storage implementation based on config."""
    provider = settings.STORAGE_PROVIDER.lower()
    if provider == "supabase" and settings.SUPABASE_URL and (settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY):
        return SupabaseStorageService()
    if provider == "local" or provider == "supabase":
        return LocalStorageService()
    raise ValueError(f"Unknown storage provider: {provider}")

