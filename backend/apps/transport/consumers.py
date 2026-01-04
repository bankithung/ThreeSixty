"""
WebSocket consumers for real-time updates.
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class TripTrackingConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time trip tracking.
    Parents connect to receive bus location updates.
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        self.trip_id = self.scope['url_route']['kwargs']['trip_id']
        self.room_group_name = f'trip_{self.trip_id}'
        
        # Verify user has access to this trip
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close()
            return
        
        # Join trip room
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send current trip status
        trip_data = await self.get_trip_data()
        if trip_data:
            await self.send(text_data=json.dumps({
                'type': 'trip_info',
                'data': trip_data
            }))
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
            
            elif message_type == 'get_location':
                trip_data = await self.get_trip_data()
                await self.send(text_data=json.dumps({
                    'type': 'trip_info',
                    'data': trip_data
                }))
        except json.JSONDecodeError:
            pass
    
    async def location_update(self, event):
        """Handle location update broadcast."""
        await self.send(text_data=json.dumps({
            'type': 'location_update',
            'data': event['data']
        }))
    
    async def attendance_event(self, event):
        """Handle attendance event broadcast."""
        await self.send(text_data=json.dumps({
            'type': 'attendance_event',
            'data': event['data']
        }))
    
    async def trip_status(self, event):
        """Handle trip status change broadcast."""
        await self.send(text_data=json.dumps({
            'type': 'trip_status',
            'data': event['data']
        }))
    
    @database_sync_to_async
    def get_trip_data(self):
        """Get current trip data."""
        from .models import Trip, TripStatus
        from .serializers import TripSerializer, LocationUpdateSerializer
        
        try:
            trip = Trip.objects.select_related(
                'bus', 'route', 'driver', 'conductor'
            ).get(pk=self.trip_id)
            
            latest_location = trip.location_updates.first()
            
            return {
                'trip': TripSerializer(trip).data,
                'latest_location': LocationUpdateSerializer(latest_location).data if latest_location else None,
            }
        except Trip.DoesNotExist:
            return None


class BusLocationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for conductor/driver to send location updates.
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        self.bus_id = self.scope['url_route']['kwargs']['bus_id']
        self.room_group_name = f'bus_{self.bus_id}'
        
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close()
            return
        
        # Verify user is conductor or driver
        if user.role not in ['conductor', 'driver']:
            await self.close()
            return
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        """Handle disconnection."""
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Handle incoming location data from conductor/driver."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'location':
                # Save location and broadcast
                await self.save_and_broadcast_location(data)
        except json.JSONDecodeError:
            pass
    
    @database_sync_to_async
    def save_and_broadcast_location(self, data):
        """Save location update and broadcast to subscribers."""
        from .models import Trip, LocationUpdate, TripStatus
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        # Find active trip for this bus
        trip = Trip.objects.filter(
            bus_id=self.bus_id,
            status=TripStatus.IN_PROGRESS
        ).first()
        
        if not trip:
            return
        
        # Create location update
        location = LocationUpdate.objects.create(
            trip=trip,
            bus_id=self.bus_id,
            latitude=data.get('latitude'),
            longitude=data.get('longitude'),
            speed=data.get('speed'),
            heading=data.get('heading'),
            accuracy=data.get('accuracy'),
        )
        
        # Broadcast to trip subscribers
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"trip_{trip.id}",
            {
                'type': 'location_update',
                'data': {
                    'trip_id': str(trip.id),
                    'bus_id': str(self.bus_id),
                    'latitude': float(location.latitude),
                    'longitude': float(location.longitude),
                    'speed': location.speed,
                    'heading': location.heading,
                    'timestamp': location.created_at.isoformat(),
                }
            }
        )
