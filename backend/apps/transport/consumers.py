"""
WebSocket consumers for real-time updates.
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.serializers.json import DjangoJSONEncoder

logger = logging.getLogger(__name__)


class TripTrackingConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time trip tracking.
    Parents connect to receive bus location updates.
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        try:
            self.trip_id = self.scope['url_route']['kwargs']['trip_id']
            self.room_group_name = f'trip_{self.trip_id}'
            
            # Verify user has access to this trip
            user = self.scope.get('user')
            if not user or not user.is_authenticated:
                logger.warning(f"WebSocket connection rejected: User not authenticated. Trip: {self.trip_id}")
                await self.close()
                return
            
            # Join trip room
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            await self.accept()
            logger.info(f"WebSocket connected for trip {self.trip_id} by user {user}")
            
            # Send current trip status
            trip_data = await self.get_trip_data()
            if trip_data:
                await self.send(text_data=json.dumps({
                    'type': 'trip_info',
                    'data': trip_data
                }, cls=DjangoJSONEncoder))
            else:
                logger.warning(f"No trip data found for ID: {self.trip_id}")
                
        except Exception as e:
            logger.error(f"Error in WebSocket connect: {str(e)}", exc_info=True)
            await self.close(code=1011)
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        try:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        except Exception as e:
            logger.error(f"Error in WebSocket disconnect: {str(e)}")
    
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
                }, cls=DjangoJSONEncoder))
        except json.JSONDecodeError:
            pass
        except Exception as e:
            logger.error(f"Error in WebSocket receive: {str(e)}")
    
    async def location_update(self, event):
        """Handle location update broadcast."""
        try:
            await self.send(text_data=json.dumps({
                'type': 'location_update',
                'data': event['data']
            }, cls=DjangoJSONEncoder))
        except Exception as e:
            logger.error(f"Error sending location update: {str(e)}")
    
    async def attendance_event(self, event):
        """Handle attendance event broadcast."""
        try:
            await self.send(text_data=json.dumps({
                'type': 'attendance_event',
                'data': event['data']
            }, cls=DjangoJSONEncoder))
        except Exception as e:
            logger.error(f"Error sending attendance event: {str(e)}")
    
    async def trip_status(self, event):
        """Handle trip status change broadcast."""
        try:
            await self.send(text_data=json.dumps({
                'type': 'trip_status',
                'data': event['data']
            }, cls=DjangoJSONEncoder))
        except Exception as e:
            logger.error(f"Error sending trip status: {str(e)}")
    
    @database_sync_to_async
    def get_trip_data(self):
        """Get current trip data."""
        from .models import Trip, TripStatus
        from .serializers import TripSerializer, LocationUpdateSerializer
        from django.core.exceptions import ValidationError
        
        try:
            if not self.trip_id or self.trip_id == 'undefined':
                logger.error("Invalid trip_id: undefined or empty")
                return None

            trip = Trip.objects.select_related(
                'bus', 'route', 'driver', 'conductor'
            ).get(pk=self.trip_id)
            
            latest_location = trip.location_updates.first()

            # Calculate nearest stop if location exists
            next_stop_data = None
            if latest_location and trip.route:
                 from math import radians, cos, sin, asin, sqrt
                 def haversine(lon1, lat1, lon2, lat2):
                    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
                    dlon = lon2 - lon1
                    dlat = lat2 - lat1
                    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
                    c = 2 * asin(sqrt(a))
                    return c * 6371

                 min_dist = float('inf')
                 bus_lat = float(latest_location.latitude)
                 bus_lng = float(latest_location.longitude)

                 for stop in trip.route.stops.all():
                    dist = haversine(bus_lng, bus_lat, float(stop.longitude), float(stop.latitude))
                    if dist < min_dist:
                        min_dist = dist
                        next_stop_data = {
                            'id': stop.id,
                            'name': stop.name,
                            'sequence': stop.sequence,
                            'distance_km': round(dist, 2),
                            'eta_mins': round((dist / 30) * 60)
                        }
            
            latest_location_data = None
            if latest_location:
                latest_location_data = LocationUpdateSerializer(latest_location).data
                latest_location_data['next_stop'] = next_stop_data

            return {
                'trip': TripSerializer(trip).data,
                'latest_location': latest_location_data,
            }
        except Trip.DoesNotExist:
            logger.warning(f"Trip not found: {self.trip_id}")
            return None
        except ValidationError:
            logger.error(f"Invalid UUID for trip_id: {self.trip_id}")
            return None
        except Exception as e:
            logger.error(f"Error fetching trip data: {str(e)}", exc_info=True)
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

        # Calculate nearest stop
        from math import radians, cos, sin, asin, sqrt
        def haversine(lon1, lat1, lon2, lat2):
            # Convert decimal degrees to radians
            lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
            # Haversine formula
            dlon = lon2 - lon1
            dlat = lat2 - lat1
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * asin(sqrt(a))
            r = 6371 # Radius of earth in kilometers
            return c * r

        next_stop_data = None
        min_dist = float('inf')
        
        bus_lat = float(location.latitude)
        bus_lng = float(location.longitude)

        # Get all stops for the route
        if trip.route:
            stops = trip.route.stops.all()
            for stop in stops:
                dist = haversine(bus_lng, bus_lat, float(stop.longitude), float(stop.latitude))
                if dist < min_dist:
                    min_dist = dist
                    next_stop_data = {
                        'id': stop.id,
                        'name': stop.name,
                        'sequence': stop.sequence,
                        'distance_km': round(dist, 2),
                        'eta_mins': round((dist / 30) * 60) # Rough estimate assuming 30km/h average speed in city
                    }

        broadcast_data = {
            'trip_id': str(trip.id),
            'bus_id': str(self.bus_id),
            'latitude': float(location.latitude),
            'longitude': float(location.longitude),
            'speed': location.speed,
            'heading': location.heading,
            'timestamp': location.created_at.isoformat(),
            'next_stop': next_stop_data # Include calculated next stop info
        }

        async_to_sync(channel_layer.group_send)(
            f"trip_{trip.id}",
            {
                'type': 'location_update',
                'data': broadcast_data
            }
        )
        
        # Also broadcast to bus profile subscribers
        async_to_sync(channel_layer.group_send)(
            f"bus_profile_{self.bus_id}",
            {
                'type': 'location_update',
                'data': broadcast_data
            }
        )


class BusProfileConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time bus profile updates on admin page.
    Admins connect to receive live location, trip status, and student updates.
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        self.bus_id = self.scope['url_route']['kwargs']['bus_id']
        self.group_name = f"bus_profile_{self.bus_id}"
        
        # Join bus profile group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        logger.info(f"Admin connected to bus profile: {self.bus_id}")
        
        # Send initial data
        initial_data = await self.get_bus_live_status()
        await self.send(text_data=json.dumps({
            'type': 'initial_data',
            'data': initial_data
        }, cls=DjangoJSONEncoder))
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        logger.info(f"Admin disconnected from bus profile: {self.bus_id}")
    
    async def receive(self, text_data):
        """Handle incoming messages (e.g., request refresh)."""
        try:
            data = json.loads(text_data)
            if data.get('type') == 'refresh':
                live_status = await self.get_bus_live_status()
                await self.send(text_data=json.dumps({
                    'type': 'refresh_data',
                    'data': live_status
                }, cls=DjangoJSONEncoder))
        except json.JSONDecodeError:
            pass
    
    async def location_update(self, event):
        """Handle location update broadcast."""
        await self.send(text_data=json.dumps({
            'type': 'location_update',
            'data': event['data']
        }, cls=DjangoJSONEncoder))
    
    async def trip_status(self, event):
        """Handle trip status change broadcast."""
        await self.send(text_data=json.dumps({
            'type': 'trip_status',
            'data': event['data']
        }, cls=DjangoJSONEncoder))
    
    async def student_status(self, event):
        """Handle student boarding/dropping status."""
        await self.send(text_data=json.dumps({
            'type': 'student_status',
            'data': event['data']
        }, cls=DjangoJSONEncoder))
    
    @database_sync_to_async
    def get_bus_live_status(self):
        """Get current live status of the bus."""
        from .models import Bus, Trip, TripStatus, LocationUpdate
        from apps.attendance.models import Attendance
        
        try:
            bus = Bus.objects.get(id=self.bus_id)
        except Bus.DoesNotExist:
            return {'error': 'Bus not found'}
        
        # Get active trip
        active_trip = bus.trips.filter(status=TripStatus.IN_PROGRESS).select_related(
            'route', 'driver', 'conductor'
        ).first()
        
        if not active_trip:
            return {
                'has_active_trip': False,
                'trip': None,
                'location': None,
                'students': [],
            }
        
        # Get latest location
        latest_loc = active_trip.location_updates.first()
        
        # Get students on trip with attendance status
        attendances = Attendance.objects.filter(trip=active_trip).select_related('student')
        
        students_data = [{
            'id': str(att.student.id),
            'name': att.student.full_name,
            'status': att.status,
            'boarded_at': att.boarded_at.isoformat() if att.boarded_at else None,
            'dropped_at': att.dropped_at.isoformat() if att.dropped_at else None,
        } for att in attendances]
        
        return {
            'has_active_trip': True,
            'trip': {
                'id': str(active_trip.id),
                'trip_type': active_trip.trip_type,
                'status': active_trip.status,
                'route_name': active_trip.route.name if active_trip.route else None,
                'driver_name': active_trip.driver.full_name if active_trip.driver else None,
                'conductor_name': active_trip.conductor.full_name if active_trip.conductor else None,
                'started_at': active_trip.started_at.isoformat() if active_trip.started_at else None,
                'total_students': active_trip.total_students,
                'students_boarded': active_trip.students_boarded,
                'students_dropped': active_trip.students_dropped,
            },
            'location': {
                'latitude': float(latest_loc.latitude),
                'longitude': float(latest_loc.longitude),
                'speed': latest_loc.speed,
                'heading': latest_loc.heading,
                'timestamp': latest_loc.created_at.isoformat(),
            } if latest_loc else None,
            'students': students_data,
        }

