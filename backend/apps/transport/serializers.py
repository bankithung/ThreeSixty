"""
Serializers for transport app.
"""
from django.utils import timezone
from rest_framework import serializers
from .models import Bus, BusStaff, Route, Stop, Trip, LocationUpdate, TripStatus
from apps.accounts.serializers import UserSerializer


class BusStaffSerializer(serializers.ModelSerializer):
    """Serializer for BusStaff model."""
    user = UserSerializer(read_only=True)
    user_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = BusStaff
        fields = ['id', 'bus', 'user', 'user_id', 'role', 'is_active']
        read_only_fields = ['id']


class BusSerializer(serializers.ModelSerializer):
    """Serializer for Bus model."""
    staff = BusStaffSerializer(many=True, read_only=True)
    current_trip = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()
    
    driver_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    conductor_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    school_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = Bus
        fields = [
            'id', 'school', 'school_id', 'number', 'registration_number', 'capacity',
            'is_active', 'make', 'model', 'year', 'color',
            'staff', 'driver_id', 'conductor_id', 'current_trip', 'student_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'school', 'created_at', 'updated_at']
        
    def create(self, validated_data):
        """Create a bus and assign staff."""
        driver_id = validated_data.pop('driver_id', None)
        conductor_id = validated_data.pop('conductor_id', None)
        school_id = validated_data.pop('school_id')
        
        # Create bus
        bus = Bus.objects.create(school_id=school_id, **validated_data)
        
        # Assign staff
        if driver_id:
            BusStaff.objects.create(bus=bus, user_id=driver_id, role='driver', is_active=True)
            
        if conductor_id:
            BusStaff.objects.create(bus=bus, user_id=conductor_id, role='conductor', is_active=True)
            
        return bus

    def update(self, instance, validated_data):
        """Update bus and staff."""
        driver_id = validated_data.pop('driver_id', None)
        conductor_id = validated_data.pop('conductor_id', None)
        # Handle school_id if passed (though usually school doesn't change)
        if 'school_id' in validated_data:
            instance.school_id = validated_data.pop('school_id')
            
        # Update fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update Staff
        # Logic: Deactivate old active driver/conductor, add new one if different.
        # Simple approach: Deactivate all current active staff of that role, add new.
        
        if driver_id:
            # Check if current active driver is same
            current_driver = instance.staff.filter(role='driver', is_active=True).first()
            if not current_driver or current_driver.user_id != driver_id:
                 # Deactivate old
                instance.staff.filter(role='driver', is_active=True).update(is_active=False)
                # Add new
                BusStaff.objects.create(bus=instance, user_id=driver_id, role='driver', is_active=True)
        elif driver_id is None and 'driver_id' in self.initial_data:
             # Explicitly cleared? (If None passed)
             pass

        if conductor_id:
            current_conductor = instance.staff.filter(role='conductor', is_active=True).first()
            if not current_conductor or current_conductor.user_id != conductor_id:
                instance.staff.filter(role='conductor', is_active=True).update(is_active=False)
                BusStaff.objects.create(bus=instance, user_id=conductor_id, role='conductor', is_active=True)
                
        return instance
    
    def get_current_trip(self, obj):
        """Get the current active trip."""
        trip = obj.trips.filter(status=TripStatus.IN_PROGRESS).first()
        if trip:
            return {
                'id': str(trip.id),
                'trip_type': trip.trip_type,
                'started_at': trip.started_at,
            }
        return None
    
    def get_student_count(self, obj):
        """Get count of students assigned to this bus's routes."""
        from apps.students.models import Student
        route_ids = obj.routes.values_list('id', flat=True)
        return Student.objects.filter(route_id__in=route_ids, is_active=True).count()


class BusListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing buses."""
    
    school = serializers.SerializerMethodField()
    driver_name = serializers.SerializerMethodField()
    conductor_name = serializers.SerializerMethodField()
    driver_id = serializers.SerializerMethodField()
    conductor_id = serializers.SerializerMethodField()
    
    class Meta:
        model = Bus
        fields = [
            'id', 'school', 'number', 'registration_number', 'capacity', 'is_active',
            'driver_name', 'conductor_name', 'driver_id', 'conductor_id'
        ]
        
    def get_school(self, obj):
        return {'id': str(obj.school.id), 'name': obj.school.name}
        
    def get_driver_name(self, obj):
        driver = obj.staff.filter(role='driver', is_active=True).first()
        return driver.user.full_name if driver else None
        
    def get_conductor_name(self, obj):
        conductor = obj.staff.filter(role='conductor', is_active=True).first()
        return conductor.user.full_name if conductor else None

    def get_driver_id(self, obj):
        driver = obj.staff.filter(role='driver', is_active=True).first()
        return driver.user.id if driver else None

    def get_conductor_id(self, obj):
        conductor = obj.staff.filter(role='conductor', is_active=True).first()
        return conductor.user.id if conductor else None


class StopSerializer(serializers.ModelSerializer):
    """Serializer for Stop model."""
    location = serializers.ReadOnlyField()
    student_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Stop
        fields = [
            'id', 'route', 'name', 'address', 'latitude', 'longitude',
            'location', 'sequence', 'morning_arrival_offset', 
            'evening_arrival_offset', 'is_active', 'student_count'
        ]
        read_only_fields = ['id']
    
    def get_student_count(self, obj):
        """Get count of students at this stop."""
        return obj.students.filter(is_active=True).count()


class RouteSerializer(serializers.ModelSerializer):
    """Serializer for Route model."""
    stops = StopSerializer(many=True, read_only=True)
    bus_number = serializers.CharField(source='bus.number', read_only=True)
    student_count = serializers.SerializerMethodField()
    
    school_id = serializers.UUIDField(write_only=True)
    bus_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = Route
        fields = [
            'id', 'school', 'bus', 'school_id', 'bus_id', 'bus_number', 'name', 'description',
            'morning_start_time', 'evening_start_time', 'route_polyline',
            'estimated_duration', 'distance_km', 'is_active',
            'stops', 'student_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'school', 'bus', 'created_at', 'updated_at']
        
    def create(self, validated_data):
        school_id = validated_data.pop('school_id')
        bus_id = validated_data.pop('bus_id', None)
        return Route.objects.create(school_id=school_id, bus_id=bus_id, **validated_data)
        
    def update(self, instance, validated_data):
        if 'school_id' in validated_data:
            instance.school_id = validated_data.pop('school_id')
        if 'bus_id' in validated_data:
            instance.bus_id = validated_data.pop('bus_id')
            
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
    
    def get_student_count(self, obj):
        """Get count of students on this route."""
        return obj.students.filter(is_active=True).count()


class RouteListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing routes."""
    bus_number = serializers.CharField(source='bus.number', read_only=True)
    stop_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Route
        fields = ['id', 'name', 'bus', 'bus_number', 'morning_start_time', 'is_active', 'stop_count']
    
    def get_stop_count(self, obj):
        return obj.stops.count()


class LocationUpdateSerializer(serializers.ModelSerializer):
    """Serializer for LocationUpdate model."""
    location = serializers.ReadOnlyField()
    
    class Meta:
        model = LocationUpdate
        fields = [
            'id', 'trip', 'bus', 'latitude', 'longitude', 'location',
            'speed', 'heading', 'accuracy', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class TripSerializer(serializers.ModelSerializer):
    """Serializer for Trip model."""
    bus_number = serializers.CharField(source='bus.number', read_only=True)
    route_name = serializers.CharField(source='route.name', read_only=True)
    driver_name = serializers.CharField(source='driver.full_name', read_only=True)
    conductor_name = serializers.CharField(source='conductor.full_name', read_only=True)
    latest_location = serializers.SerializerMethodField()
    
    class Meta:
        model = Trip
        fields = [
            'id', 'bus', 'bus_number', 'route', 'route_name',
            'trip_type', 'status', 'scheduled_start', 'started_at', 'ended_at',
            'driver', 'driver_name', 'conductor', 'conductor_name',
            'total_students', 'students_boarded', 'students_dropped',
            'latest_location', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_latest_location(self, obj):
        """Get the latest location update for this trip."""
        latest = obj.location_updates.first()
        if latest:
            return {
                'latitude': float(latest.latitude),
                'longitude': float(latest.longitude),
                'speed': latest.speed,
                'heading': latest.heading,
                'timestamp': latest.created_at,
            }
        return None


class StartTripSerializer(serializers.Serializer):
    """Serializer for starting a trip."""
    bus_id = serializers.UUIDField()
    route_id = serializers.UUIDField()
    trip_type = serializers.ChoiceField(choices=['morning', 'evening', 'special'])
    
    def create(self, validated_data):
        """Create and start a new trip."""
        from apps.students.models import Student
        
        bus_id = validated_data['bus_id']
        route_id = validated_data['route_id']
        trip_type = validated_data['trip_type']
        user = self.context['request'].user
        
        # Get bus and route
        try:
            bus = Bus.objects.get(id=bus_id)
            route = Route.objects.get(id=route_id)
        except (Bus.DoesNotExist, Route.DoesNotExist):
            raise serializers.ValidationError("Bus or Route not found.")
        
        # Check for existing active trip
        if Trip.objects.filter(bus=bus, status=TripStatus.IN_PROGRESS).exists():
            raise serializers.ValidationError("This bus already has an active trip.")
        
        # Count students on this route
        total_students = Student.objects.filter(route=route, is_active=True).count()
        
        # Create trip
        trip = Trip.objects.create(
            bus=bus,
            route=route,
            trip_type=trip_type,
            status=TripStatus.IN_PROGRESS,
            scheduled_start=timezone.now(),
            started_at=timezone.now(),
            conductor=user if user.role == 'conductor' else None,
            total_students=total_students,
        )
        
        return trip


class EndTripSerializer(serializers.Serializer):
    """Serializer for ending a trip."""
    
    def update(self, instance, validated_data):
        """End the trip."""
        instance.status = TripStatus.COMPLETED
        instance.ended_at = timezone.now()
        instance.save(update_fields=['status', 'ended_at'])
        return instance


class UpdateLocationSerializer(serializers.Serializer):
    """Serializer for updating bus location."""
    latitude = serializers.DecimalField(max_digits=10, decimal_places=7)
    longitude = serializers.DecimalField(max_digits=10, decimal_places=7)
    speed = serializers.FloatField(required=False)
    heading = serializers.FloatField(required=False)
    accuracy = serializers.FloatField(required=False)
    
    def create(self, validated_data):
        """Create location update and broadcast via WebSocket."""
        trip = self.context['trip']
        
        location = LocationUpdate.objects.create(
            trip=trip,
            bus=trip.bus,
            **validated_data
        )
        
        # Broadcast to WebSocket channel
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"trip_{trip.id}",
            {
                'type': 'location_update',
                'data': {
                    'trip_id': str(trip.id),
                    'bus_id': str(trip.bus.id),
                    'latitude': float(location.latitude),
                    'longitude': float(location.longitude),
                    'speed': location.speed,
                    'heading': location.heading,
                    'timestamp': location.created_at.isoformat(),
                }
            }
        )
        
        return location
