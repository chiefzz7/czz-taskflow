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


def get_storage_service() -> StorageService:
    """Factory — returns the correct storage implementation based on config."""
    provider = settings.STORAGE_PROVIDER.lower()
    if provider == "local":
        return LocalStorageService()
    # Future: elif provider == "supabase": return SupabaseStorageService()
    raise ValueError(f"Unknown storage provider: {provider}")
