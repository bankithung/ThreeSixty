"""
WebSocket consumers for notifications app.
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class UserConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for individual user notifications.
    Connects to 'user_{user_id}' group.
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close()
            return
            
        self.user_id = str(user.id)
        self.room_group_name = f'user_{self.user_id}'
        
        # Join user group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        """Handle disconnection."""
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Handle incoming messages (mostly pings)."""
        try:
            data = json.loads(text_data)
            if data.get('type') == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
        except json.JSONDecodeError:
            pass
            
    async def notification_event(self, event):
        """Handle generic notification event."""
        await self.send(text_data=json.dumps({
            'type': event['event_type'], 
            'data': event['data']
        }))
        
    async def trip_event(self, event):
        """Handle trip related events (started, ended)."""
        await self.send(text_data=json.dumps({
            'type': event['event_type'],
            'data': event['data']
        }))
