from abc import ABC, abstractmethod
from typing import Optional
import os
import uuid
import asyncio
import aiofiles

from app.core.config import settings


class StorageService(ABC):
    """
    Abstract storage interface.
    Swap LocalStorageService → SupabaseStorageService without touching business logic.
    """

    @abstractmethod
    async def upload(self, content: bytes, key: str, content_type: str = "application/octet-stream", **kwargs) -> str:
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

    async def upload(self, content: bytes = b"", key: str = "", content_type: str = "application/octet-stream", **kwargs) -> str:
        data = content or kwargs.get("file_bytes") or b""
        filename = key or kwargs.get("filename") or f"{uuid.uuid4()}.png"
        file_path = os.path.join(self._dir, filename)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(data)
        return f"/uploads/{filename}"

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

    async def upload(self, content: bytes = b"", key: str = "", content_type: str = "application/octet-stream", **kwargs) -> str:
        data = content or kwargs.get("file_bytes") or b""
        path = key or kwargs.get("filename") or f"{uuid.uuid4()}.png"
        ctype = content_type or kwargs.get("content_type") or "application/octet-stream"

        def _do_upload() -> None:
            self.client.storage.from_(self.bucket).upload(
                path=path,
                file=data,
                file_options={"content-type": ctype, "upsert": "true"},
            )

        # Upload is synchronous inside Supabase storage client: run in thread to avoid freezing asyncio
        await asyncio.to_thread(_do_upload)
        return self.client.storage.from_(self.bucket).get_public_url(path)

    async def get_url(self, key: str) -> str:
        return self.client.storage.from_(self.bucket).get_public_url(key)

    async def delete(self, key: str) -> None:
        def _do_delete() -> None:
            self.client.storage.from_(self.bucket).remove([key])

        await asyncio.to_thread(_do_delete)


def get_storage_service() -> StorageService:
    """Factory — returns the correct storage implementation based on config."""
    provider = settings.STORAGE_PROVIDER.lower()
    if provider == "supabase" and settings.SUPABASE_URL and (settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY):
        return SupabaseStorageService()
    if provider == "local" or provider == "supabase":
        return LocalStorageService()
    raise ValueError(f"Unknown storage provider: {provider}")
