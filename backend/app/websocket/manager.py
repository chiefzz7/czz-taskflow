from typing import Dict, List, Optional
from fastapi import WebSocket


class ConnectionManager:
    """
    Manages WebSocket connections per chat room.
    Isolated from HTTP logic — only handles connection state and broadcasting.
    Room key is the unique chat_id.
    """

    def __init__(self) -> None:
        # Map of chat_id → list of active WebSocket connections
        self._rooms: Dict[str, List[WebSocket]] = {}

    def _resolve_key(self, chat_id: str, enterprise_id: Optional[str] = None) -> str:
        # chat_id is already a UUID unique across all chats
        return chat_id

    async def connect(self, websocket: WebSocket, chat_id: str, enterprise_id: Optional[str] = None) -> None:
        await websocket.accept()
        key = self._resolve_key(chat_id, enterprise_id)
        if key not in self._rooms:
            self._rooms[key] = []
        self._rooms[key].append(websocket)

    def disconnect(self, websocket: WebSocket, chat_id: str, enterprise_id: Optional[str] = None) -> None:
        key = self._resolve_key(chat_id, enterprise_id)
        if key in self._rooms:
            self._rooms[key] = [ws for ws in self._rooms[key] if ws != websocket]
            if not self._rooms[key]:
                del self._rooms[key]

    async def broadcast(self, message: str, chat_id: str, enterprise_id: Optional[str] = None) -> None:
        """Broadcast a JSON string to all connections in a chat room."""
        key = self._resolve_key(chat_id, enterprise_id)
        dead_connections = []
        for ws in list(self._rooms.get(key, [])):
            try:
                await ws.send_text(message)
            except Exception:
                dead_connections.append(ws)

        for ws in dead_connections:
            self.disconnect(ws, chat_id, enterprise_id)

    def connection_count(self, chat_id: str, enterprise_id: Optional[str] = None) -> int:
        key = self._resolve_key(chat_id, enterprise_id)
        return len(self._rooms.get(key, []))


# Singleton instance shared across the app
connection_manager = ConnectionManager()
