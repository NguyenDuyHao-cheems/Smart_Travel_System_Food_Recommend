import asyncio
from typing import Dict, Set

class NotificationNotifier:
    def __init__(self):
        # Maps user_id -> set of asyncio.Queue
        self.listeners: Dict[str, Set[asyncio.Queue]] = {}

    def subscribe(self, user_id: str, queue: asyncio.Queue):
        if user_id not in self.listeners:
            self.listeners[user_id] = set()
        self.listeners[user_id].add(queue)

    def unsubscribe(self, user_id: str, queue: asyncio.Queue):
        if user_id in self.listeners:
            self.listeners[user_id].discard(queue)
            if not self.listeners[user_id]:
                del self.listeners[user_id]

    def notify(self, user_id: str):
        user_id_str = str(user_id)
        if user_id_str in self.listeners:
            for queue in list(self.listeners[user_id_str]):
                try:
                    queue.put_nowait(True)
                except Exception:
                    pass

# Global singleton
notifier = NotificationNotifier()
