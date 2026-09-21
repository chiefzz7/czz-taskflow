from typing import Dict, List
from fastapi import WebSocket


class ConnectionManager:
    """
    Manages WebSocket connections per chat room.
    Isolated from HTTP logic — only handles connection state and broadcasting.
    
    Key format: "{enterprise_id}:{chat_id}"
    """

    def __init__(self) -> None:
        # Map of room_key → list of active WebSocket connections
        self._rooms: Dict[str, List[WebSocket]] = {}

    def _room_key(self, enterprise_id: str, chat_id: str) -> str:
        return f"{enterprise_id}:{chat_id}"

    async def connect(self, websocket: WebSocket, enterprise_id: str, chat_id: str) -> None:
        await websocket.accept()
        key = self._room_key(enterprise_id, chat_id)
        if key not in self._rooms:
            self._rooms[key] = []
        self._rooms[key].append(websocket)

    def disconnect(self, websocket: WebSocket, enterprise_id: str, chat_id: str) -> None:
        key = self._room_key(enterprise_id, chat_id)
        if key in self._rooms:
            self._rooms[key] = [ws for ws in self._rooms[key] if ws != websocket]
            if not self._rooms[key]:
                del self._rooms[key]

    async def broadcast(self, message: str, enterprise_id: str, chat_id: str) -> None:
        """Broadcast a JSON string to all connections in a chat room."""
        key = self._room_key(enterprise_id, chat_id)
        dead_connections = []
        for ws in self._rooms.get(key, []):
            try:
                await ws.send_text(message)
            except Exception:
                dead_connections.append(ws)
        # Clean up dead connections
        for ws in dead_connections:
            self.disconnect(ws, enterprise_id, chat_id)

    def connection_count(self, enterprise_id: str, chat_id: str) -> int:
        key = self._room_key(enterprise_id, chat_id)
        return len(self._rooms.get(key, []))


# Singleton instance shared across the app
connection_manager = ConnectionManager()
