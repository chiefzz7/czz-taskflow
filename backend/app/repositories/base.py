from abc import ABC, abstractmethod
from typing import TypeVar, Generic, Optional, List

T = TypeVar("T")


class BaseRepository(ABC, Generic[T]):
    """
    Abstract repository interface.
    Business services depend on this interface, never on concrete implementations.
    Swap InMemory → SQL without touching service layer.
    """

    @abstractmethod
    async def get_by_id(self, id: str) -> Optional[T]:
        ...

    @abstractmethod
    async def list_all(self) -> List[T]:
        ...

    @abstractmethod
    async def save(self, entity: T) -> T:
        ...

    @abstractmethod
    async def delete(self, id: str) -> bool:
        ...
