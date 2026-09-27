import time
from typing import Any, Optional, Dict, List


class MemoryCache:
    """
    High-performance in-memory TTL cache with tag/prefix invalidation.
    Keeps database queries cached in RAM for ultra-fast (sub-millisecond) responses.
    """

    def __init__(self) -> None:
        # key -> (value, expires_at)
        self._store: Dict[str, tuple[Any, float]] = {}

    def get(self, key: str) -> Optional[Any]:
        """Returns the cached value if valid, else None."""
        item = self._store.get(key)
        if not item:
            return None
        value, expires_at = item
        if time.time() > expires_at:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value: Any, ttl_seconds: float = 60.0) -> None:
        """Stores a value in memory with a given TTL."""
        self._store[key] = (value, time.time() + ttl_seconds)

    def delete(self, key: str) -> bool:
        """Removes a specific key from cache."""
        return self._store.pop(key, None) is not None

    def invalidate_prefix(self, prefix: str) -> int:
        """
        Removes all keys that start with the given prefix.
        Useful when an enterprise, task, or user updates and all related cached queries
        must be cleared immediately so users see fresh data.
        """
        keys_to_delete = [k for k in self._store if k.startswith(prefix)]
        for k in keys_to_delete:
            del self._store[k]
        return len(keys_to_delete)

    def clear(self) -> None:
        """Clears the entire cache."""
        self._store.clear()


# Global cache singleton instance
cache = MemoryCache()
