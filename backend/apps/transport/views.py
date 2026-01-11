"""
Views for transport app.
"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from django.db import transaction

from .models import Bus, BusStaff, Route, Stop, Trip, LocationUpdate, TripStatus
from .serializers import (
    BusSerializer,
    BusListSerializer,
    BusStaffSerializer,
    RouteSerializer,
    RouteListSerializer,
    StopSerializer,
    TripSerializer,
    StartTripSerializer,
    EndTripSerializer,
    UpdateLocationSerializer,
    LocationUpdateSerializer,
)
from core.permissions import IsSchoolAdmin, IsStaff, IsConductorOrDriver, IsParent
from apps.accounts.models import SchoolMembership, UserRole
from apps.students.models import Student


class BusListCreateView(generics.ListCreateAPIView):
    """List buses or create a new bus."""
    
    def get_permissions(self):
        if self.request.method == 'GET':
            return [(IsStaff | IsConductorOrDriver)()]
        return [IsStaff()]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return BusSerializer
        return BusListSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Bus.objects.select_related('school').prefetch_related('staff__user')
        
        # Filter by user's schools
        if user.role != UserRole.ROOT_ADMIN:
            school_ids = SchoolMembership.objects.filter(
                user=user,
                is_active=True
            ).values_list('school_id', flat=True)
            queryset = queryset.filter(school_id__in=school_ids)
        
        # Filter by school
        school_id = self.request.query_params.get('school_id')
        if school_id:
            queryset = queryset.filter(school_id=school_id)
        
        return queryset


class BusDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a bus."""
    queryset = Bus.objects.all()
    serializer_class = BusSerializer
    permission_classes = [IsStaff]

    def get_queryset(self):
        user = self.request.user
        queryset = Bus.objects.select_related('school')
        
        # Filter by user's schools
        if user.role != UserRole.ROOT_ADMIN:
             school_ids = SchoolMembership.objects.filter(
                user=user,
                is_active=True
            ).values_list('school_id', flat=True)
             queryset = queryset.filter(school_id__in=school_ids)
             
        return queryset


class BusStaffView(generics.ListCreateAPIView):
    """List or assign staff to a bus."""
    serializer_class = BusStaffSerializer
    permission_classes = [IsSchoolAdmin]
    
    def get_queryset(self):
        bus_id = self.kwargs['pk']
        return BusStaff.objects.filter(bus_id=bus_id).select_related('user')
    
    def perform_create(self, serializer):
        bus_id = self.kwargs['pk']
        serializer.save(bus_id=bus_id)


class RouteListCreateView(generics.ListCreateAPIView):
    """List routes or create a new route."""
    
    def get_permissions(self):
        if self.request.method == 'GET':
            return [(IsStaff | IsConductorOrDriver)()]
        return [IsStaff()]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return RouteSerializer
        
        # Use full serializer (with stops) if requested
        if self.request.query_params.get('include_stops') == 'true':
            return RouteSerializer
            
        return RouteListSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Route.objects.select_related('school', 'bus')
        
        # Filter by user's schools
        if user.role != UserRole.ROOT_ADMIN:
            school_ids = SchoolMembership.objects.filter(
                user=user,
                is_active=True
            ).values_list('school_id', flat=True)
            queryset = queryset.filter(school_id__in=school_ids)
        
        # Filter by school
        school_id = self.request.query_params.get('school_id')
        if school_id:
            queryset = queryset.filter(school_id=school_id)
        
        # Filter by bus
        bus_id = self.request.query_params.get('bus_id')
        if bus_id:
            queryset = queryset.filter(bus_id=bus_id)
        
        return queryset


class RouteDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a route."""
    queryset = Route.objects.prefetch_related('stops')
    serializer_class = RouteSerializer
    permission_classes = [IsStaff]

    def get_queryset(self):
        user = self.request.user
        queryset = Route.objects.prefetch_related('stops')
        
        # Filter by user's schools
        if user.role != UserRole.ROOT_ADMIN:
             school_ids = SchoolMembership.objects.filter(
                user=user,
                is_active=True
            ).values_list('school_id', flat=True)
             queryset = queryset.filter(school_id__in=school_ids)
             
        return queryset


class RouteUpdateStopsView(APIView):
    """Update all stops for a route in bulk."""
    permission_classes = [IsStaff]
    
    def post(self, request, pk):
        print(f"🔍 RouteUpdateStopsView called for route {pk}")
        print(f"📦 Request data: {request.data}")
        
        try:
            route = Route.objects.get(pk=pk)
            print(f"✅ Route found: {route.name}")
        except Route.DoesNotExist:
            print(f"❌ Route not found: {pk}")
            return Response({'error': 'Route not found'}, status=404)
            
        stops_data = request.data.get('stops', [])
        print(f"📍 Processing {len(stops_data)} stops")
        
        with transaction.atomic():
            existing_ids = [s['id'] for s in stops_data if 'id' in s and not str(s['id']).startswith('temp-')]
            print(f"🔄 Existing stop IDs: {existing_ids}")
            
            deleted_count = Stop.objects.filter(route=route).exclude(id__in=existing_ids).delete()[0]
            print(f"🗑️ Deleted {deleted_count} old stops")
            
            for index, stop_data in enumerate(stops_data):
                stop_id = stop_data.get('id')
                if stop_id and str(stop_id).startswith('temp-'):
                    stop_id = None
                
                defaults = {
                    'name': stop_data['name'],
                    'latitude': stop_data['latitude'],
                    'longitude': stop_data['longitude'],
                    'address': stop_data.get('address', ''),
                    'sequence': index + 1,
                }
                
                if stop_id:
                    updated = Stop.objects.filter(id=stop_id, route=route).update(**defaults)
                    print(f"✏️ Updated stop #{index+1}: {stop_data['name']} (ID: {stop_id})")
                else:
                    new_stop = Stop.objects.create(route=route, **defaults)
                    print(f"➕ Created stop #{index+1}: {stop_data['name']} (ID: {new_stop.id})")
        
        final_count = Stop.objects.filter(route=route).count()
        print(f"✅ Save complete! Route now has {final_count} stops")
        return Response({'status': 'success', 'stops_count': final_count})



class StopListCreateView(generics.ListCreateAPIView):
    """List or create stops for a route."""
    serializer_class = StopSerializer
    permission_classes = [IsStaff]
    
    def get_queryset(self):
        route_id = self.kwargs['route_id']
        return Stop.objects.filter(route_id=route_id).order_by('sequence')
    
    def perform_create(self, serializer):
        route_id = self.kwargs['route_id']
        serializer.save(route_id=route_id)


class StopDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a stop."""
    queryset = Stop.objects.all()
    serializer_class = StopSerializer
    permission_classes = [IsStaff]


class TripListView(generics.ListAPIView):
    """List trips."""
    serializer_class = TripSerializer
    permission_classes = [IsStaff]
    
    def get_queryset(self):
        user = self.request.user
        queryset = Trip.objects.select_related('bus', 'route', 'driver', 'conductor')

        # Filter by user's schools
        if user.role != UserRole.ROOT_ADMIN:
             school_ids = SchoolMembership.objects.filter(
                user=user,
                is_active=True
            ).values_list('school_id', flat=True)
             queryset = queryset.filter(bus__school_id__in=school_ids)
        
        # Filter by bus
        bus_id = self.request.query_params.get('bus_id')
        if bus_id:
            queryset = queryset.filter(bus_id=bus_id)
        
        # Filter by status
        trip_status = self.request.query_params.get('status')
        if trip_status:
            queryset = queryset.filter(status=trip_status)
        
        # Filter by date
        date = self.request.query_params.get('date')
        if date:
            queryset = queryset.filter(scheduled_start__date=date)
        
        return queryset[:50]  # Limit to last 50 trips


class ActiveTripsView(generics.ListAPIView):
    """List all currently active trips."""
    serializer_class = TripSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Trip.objects.filter(
            status=TripStatus.IN_PROGRESS
        ).select_related('bus', 'route', 'driver', 'conductor')

        # Filter by user's schools
        if user.role != UserRole.ROOT_ADMIN:
             school_ids = SchoolMembership.objects.filter(
                user=user,
                is_active=True
            ).values_list('school_id', flat=True)
             queryset = queryset.filter(bus__school_id__in=school_ids)
        
        return queryset


class ConductorTripHistoryView(APIView):
    """List trip history for the current conductor/driver with pagination."""
    permission_classes = [IsConductorOrDriver]
    
    def get(self, request):
        user = request.user
        # Get trips where user was conductor or driver
        queryset = Trip.objects.filter(
            Q(conductor=user) | Q(driver=user)
        ).select_related('bus', 'route', 'driver', 'conductor').order_by('-scheduled_start')
        
        # Filter by status
        trip_status = request.query_params.get('status')
        if trip_status:
            queryset = queryset.filter(status=trip_status)
        
        # Get total counts before pagination
        total_count = queryset.count()
        completed_count = queryset.filter(status=TripStatus.COMPLETED).count()
        
        # Get today's count
        from django.utils import timezone
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_count = queryset.filter(scheduled_start__gte=today_start).count()
        
        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        start = (page - 1) * page_size
        end = start + page_size
        
        trips = queryset[start:end]
        has_next = queryset.count() > end
        
        return Response({
            'results': TripSerializer(trips, many=True).data,
            'total_count': total_count,
            'completed_count': completed_count,
            'today_count': today_count,
            'page': page,
            'page_size': page_size,
            'has_next': has_next,
        })


class StartTripView(APIView):
    """Start a new trip."""
    permission_classes = [IsConductorOrDriver]
    
    def post(self, request):
        serializer = StartTripSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.is_valid(raise_exception=True)
        trip = serializer.save()
        
        # Broadcast "trip_started" to all parents of students on this route
        from apps.students.models import Student
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        # Get students on route
        students = Student.objects.filter(
            route=trip.route,
            is_active=True
        ).prefetch_related('parents__user')
        
        # Collect parent user IDs
        parent_user_ids = set()
        for student in students:
            for parent in student.parents.all():
                if parent.user:
                    parent_user_ids.add(str(parent.user.id))
        
        # Broadcast to each parent
        channel_layer = get_channel_layer()
        for user_id in parent_user_ids:
            async_to_sync(channel_layer.group_send)(
                f"user_{user_id}",
                {
                    'type': 'trip_event',
                    'event_type': 'trip_started',
                    'data': {
                        'trip_id': str(trip.id), # Make sure this matches frontend expectations
                        'message': f"Trip started for {trip.route.name}"
                    }
                }
            )
        
        return Response(
            TripSerializer(trip).data,
            status=status.HTTP_201_CREATED
        )


class EndTripView(APIView):
    """End an active trip."""
    permission_classes = [IsConductorOrDriver]
    
    
    def post(self, request, pk):
        try:
            # First check if trip exists at all
            trip = Trip.objects.get(pk=pk)
            
            # If already completed, return success (idempotent)
            if trip.status == TripStatus.COMPLETED:
                print(f"DEBUG: Trip {pk} already completed. Returning success.")
                return Response(TripSerializer(trip).data)
                
            # If not in progress and not completed (e.g. cancelled/scheduled), cannot end it
            if trip.status != TripStatus.IN_PROGRESS:
                return Response(
                    {'error': f'Cannot end trip with status {trip.status}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Trip.DoesNotExist:
            return Response(
                {'error': 'Trip not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = EndTripSerializer(trip, data={})
        serializer.is_valid(raise_exception=True)
        trip = serializer.save()
        
        # Broadcast "trip_ended" to all parents
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        # Get students on route
        students = Student.objects.filter(
            route=trip.route,
            is_active=True
        ).prefetch_related('parents__user')
        
        # Collect parent user IDs
        parent_user_ids = set()
        for student in students:
            for parent in student.parents.all():
                if parent.user:
                    parent_user_ids.add(str(parent.user.id))
        
        # Broadcast to each parent
        channel_layer = get_channel_layer()
        for user_id in parent_user_ids:
            async_to_sync(channel_layer.group_send)(
                f"user_{user_id}",
                {
                    'type': 'trip_event',
                    'event_type': 'trip_ended',
                    'data': {
                        'trip_id': str(trip.id),
                        'message': f"Trip ended for {trip.route.name}"
                    }
                }
            )
        
        return Response(TripSerializer(trip).data)


class UpdateLocationView(APIView):
    """Update bus location during a trip."""
    permission_classes = [IsConductorOrDriver]
    
    def post(self, request, pk):
        try:
            trip = Trip.objects.get(pk=pk, status=TripStatus.IN_PROGRESS)
        except Trip.DoesNotExist:
            return Response(
                {'error': 'Active trip not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = UpdateLocationSerializer(
            data=request.data,
            context={'trip': trip}
        )
        serializer.is_valid(raise_exception=True)
        
        # Get previous location before saving new one
        previous_location = trip.location_updates.first()
        
        location = serializer.save()
        
        # Calculate and update telemetry
        try:
            if previous_location:
                from .utils import calculate_distance
                dist = calculate_distance(
                    previous_location.latitude, previous_location.longitude,
                    location.latitude, location.longitude
                )
                
                if dist > 0:
                    dist_decimal = Decimal(str(dist))
                    
                    # Update Trip stats
                    trip.distance_traveled += dist_decimal
                    
                    if trip.started_at:
                        duration = (timezone.now() - trip.started_at).total_seconds() / 60
                        trip.duration_minutes = int(duration)
                    
                    trip.save(update_fields=['distance_traveled', 'duration_minutes', 'updated_at'])
                    
                    # Update Bus stats
                    trip.bus.total_distance_km += dist_decimal
                    # Approximate duration addition (time since last update)
                    time_diff = (location.created_at - previous_location.created_at).total_seconds() / 3600
                    if time_diff > 0 and time_diff < 1: # Ignore large jumps/pauses > 1 hour
                        trip.bus.total_duration_hours += Decimal(str(time_diff))
                    
                    trip.bus.save(update_fields=['total_distance_km', 'total_duration_hours', 'updated_at'])
                    
        except Exception as e:
            print(f"Telemetry update failed: {e}")
        
        # Broadcast to trip subscribers
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"trip_{trip.id}",
            {
                'type': 'location_update',
                'data': {
                    'trip_id': str(trip.id),
                    'bus_id': str(location.bus_id),
                    'latitude': float(location.latitude),
                    'longitude': float(location.longitude),
                    'speed': location.speed,
                    'heading': location.heading,
                    'timestamp': location.created_at.isoformat(),
                }
            }
        )
        
        return Response({
            'message': 'Location updated',
            'location': LocationUpdateSerializer(location).data
        })


class TripTrackingView(APIView):
    """Get tracking data for a trip (for parents)."""
    permission_classes = [IsParent]
    
    def get(self, request, pk):
        try:
            trip = Trip.objects.select_related(
                'bus', 'route', 'driver', 'conductor'
            ).get(pk=pk)
        except Trip.DoesNotExist:
            return Response(
                {'error': 'Trip not found'},
                status=status.HTTP_404_NOT_FOUND
            )
            
        from .serializers import TripTrackingSerializer
        serializer = TripTrackingSerializer(trip)
        return Response(serializer.data)


class ChildTripView(APIView):
    """Get active trip for a specific child (for parents)."""
    permission_classes = [IsParent]
    
    def get(self, request, student_id):
        from apps.students.models import Student, Parent
        
        # Verify parent has access to this student
        if not Parent.objects.filter(
            user=request.user,
            student_id=student_id,
            is_active=True
        ).exists():
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            student = Student.objects.get(pk=student_id)
        except Student.DoesNotExist:
            return Response(
                {'error': 'Student not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Find active trip for student's route
        if not student.route:
            return Response({
                'message': 'No route assigned to student',
                'trip': None
            })
        
        active_trip = Trip.objects.filter(
            route=student.route,
            status=TripStatus.IN_PROGRESS
        ).select_related('bus', 'route', 'driver', 'conductor').first()
        
        if not active_trip:
            return Response({
                'message': 'No active trip',
                'trip': None
            })
        
        # Get latest location
        latest_location = active_trip.location_updates.first()
        
        return Response({
            'trip': TripSerializer(active_trip).data,
            'latest_location': LocationUpdateSerializer(latest_location).data if latest_location else None,
            'student_stop': StopSerializer(student.stop).data if student.stop else None,
        })


# === BUS PROFILE VIEWS ===

class BusProfileView(generics.RetrieveUpdateAPIView):
    """Get or update detailed bus profile."""
    permission_classes = [IsStaff]
    
    def get_serializer_class(self):
        from .serializers import BusProfileSerializer
        return BusProfileSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'root_admin':
            return Bus.objects.prefetch_related('staff', 'staff__user', 'trips', 'earnings', 'expenses', 'fuel_entries')
        
        school_ids = SchoolMembership.objects.filter(
            user=user
        ).values_list('school_id', flat=True)
        
        return Bus.objects.filter(
            school_id__in=school_ids
        ).prefetch_related('staff', 'staff__user', 'trips', 'earnings', 'expenses', 'fuel_entries')


class BusFuelEntryListCreateView(generics.ListCreateAPIView):
    """List or create fuel entries for a bus."""
    permission_classes = [IsStaff]
    
    def get_serializer_class(self):
        from .serializers import BusFuelEntrySerializer
        return BusFuelEntrySerializer
    
    def get_queryset(self):
        from .models import BusFuelEntry
        bus_id = self.kwargs.get('pk')
        return BusFuelEntry.objects.filter(bus_id=bus_id).order_by('-date')
    
    def perform_create(self, serializer):
        bus_id = self.kwargs.get('pk')
        serializer.save(bus_id=bus_id)


class BusFuelEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a fuel entry."""
    permission_classes = [IsStaff]
    
    def get_serializer_class(self):
        from .serializers import BusFuelEntrySerializer
        return BusFuelEntrySerializer
    
    def get_queryset(self):
        from .models import BusFuelEntry
        bus_id = self.kwargs.get('bus_pk')
        return BusFuelEntry.objects.filter(bus_id=bus_id)


class BusExpenseListCreateView(generics.ListCreateAPIView):
    """List or create expenses for a bus."""
    permission_classes = [IsStaff]
    
    def get_serializer_class(self):
        from .serializers import BusExpenseSerializer
        return BusExpenseSerializer
    
    def get_queryset(self):
        from .models import BusExpense
        bus_id = self.kwargs.get('pk')
        category = self.request.query_params.get('category')
        qs = BusExpense.objects.filter(bus_id=bus_id).order_by('-date')
        if category:
            qs = qs.filter(category=category)
        return qs
    
    def perform_create(self, serializer):
        bus_id = self.kwargs.get('pk')
        serializer.save(bus_id=bus_id)


class BusExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete an expense."""
    permission_classes = [IsStaff]
    
    def get_serializer_class(self):
        from .serializers import BusExpenseSerializer
        return BusExpenseSerializer
    
    def get_queryset(self):
        from .models import BusExpense
        bus_id = self.kwargs.get('bus_pk')
        return BusExpense.objects.filter(bus_id=bus_id)


class BusEarningListCreateView(generics.ListCreateAPIView):
    """List or create earnings for a bus."""
    permission_classes = [IsStaff]
    
    def get_serializer_class(self):
        from .serializers import BusEarningSerializer
        return BusEarningSerializer
    
    def get_queryset(self):
        from .models import BusEarning
        bus_id = self.kwargs.get('pk')
        return BusEarning.objects.filter(bus_id=bus_id).order_by('-date')
    
    def perform_create(self, serializer):
        bus_id = self.kwargs.get('pk')
        serializer.save(bus_id=bus_id)


class BusEarningDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete an earning."""
    permission_classes = [IsStaff]
    
    def get_serializer_class(self):
        from .serializers import BusEarningSerializer
        return BusEarningSerializer
    
    def get_queryset(self):
        from .models import BusEarning
        bus_id = self.kwargs.get('bus_pk')
        return BusEarning.objects.filter(bus_id=bus_id)


class BusStudentsView(APIView):
    """List students assigned to a bus and assign/remove students."""
    permission_classes = [IsStaff]
    
    def get(self, request, pk):
        """Get all students assigned to routes for this bus."""
        students = Student.objects.filter(route__bus_id=pk).select_related('stop', 'route')
        data = [{
            'id': str(s.id),
            'full_name': s.full_name,
            'grade': s.grade or '',
            'section': s.section or '',
            'route_name': s.route.name if s.route else None,
            'stop_name': s.stop.name if s.stop else None,
            'stop_id': str(s.stop.id) if s.stop else None,
            'photo': s.photo.url if s.photo else None,
        } for s in students]
        return Response({'students': data})


class BusLiveStatusView(APIView):
    """Get live status of a bus including current trip and location."""
    permission_classes = [IsStaff]
    
    def get(self, request, pk):
        try:
            bus = Bus.objects.get(id=pk)
        except Bus.DoesNotExist:
            return Response({'error': 'Bus not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get active trip
        active_trip = bus.trips.filter(status=TripStatus.IN_PROGRESS).select_related(
            'route', 'driver', 'conductor'
        ).first()
        
        if not active_trip:
            return Response({
                'has_active_trip': False,
                'trip': None,
                'location': None,
                'students': [],
            })
        
        # Get latest location
        latest_loc = active_trip.location_updates.first()
        
        # Get students on trip with attendance status
        from apps.attendance.models import Attendance
        attendances = Attendance.objects.filter(trip=active_trip).select_related('student')
        
        students_data = [{
            'id': str(att.student.id),
            'name': att.student.full_name,
            'photo': att.student.photo.url if att.student.photo else None,
            'status': att.status,
            'boarded_at': att.boarded_at.isoformat() if att.boarded_at else None,
            'dropped_at': att.dropped_at.isoformat() if att.dropped_at else None,
        } for att in attendances]
        
        return Response({
            'has_active_trip': True,
            'trip': {
                'id': str(active_trip.id),
                'trip_type': active_trip.trip_type,
                'status': active_trip.status,
                'route_name': active_trip.route.name if active_trip.route else None,
                'driver_name': active_trip.driver.full_name if active_trip.driver else None,
                'conductor_name': active_trip.conductor.full_name if active_trip.conductor else None,
                'started_at': active_trip.actual_start.isoformat() if active_trip.actual_start else None,
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
        })


class BusUploadImageView(APIView):
    """Upload an image for a bus."""
    permission_classes = [IsStaff]
    
    def post(self, request, pk):
        try:
            bus = Bus.objects.get(id=pk)
        except Bus.DoesNotExist:
            return Response({'error': 'Bus not found'}, status=404)
        
        image = request.FILES.get('image')
        if not image:
            return Response({'error': 'No image provided'}, status=400)
        
        # Save image
        from django.core.files.storage import default_storage
        file_path = f'buses/{bus.id}/{image.name}'
        saved_path = default_storage.save(file_path, image)
        image_url = request.build_absolute_uri(default_storage.url(saved_path))
        
        # Add to images array
        images = bus.images or []
        images.append(image_url)
        bus.images = images
        bus.save()
        
        return Response({'images': bus.images})


class BusDeleteImageView(APIView):
    """Delete a bus image by index."""
    permission_classes = [IsStaff]
    
    def delete(self, request, pk, image_index):
        try:
            bus = Bus.objects.get(id=pk)
        except Bus.DoesNotExist:
            return Response({'error': 'Bus not found'}, status=404)
        
        images = bus.images or []
        image_index = int(image_index)
        
        if image_index >= len(images) or image_index < 0:
            return Response({'error': 'Invalid image index'}, status=400)
        
        # Remove image
        images.pop(image_index)
        bus.images = images
        bus.save()
        
        return Response({'images': bus.images})


class BusAnalyticsView(APIView):
    """Get analytics data for charts."""
    permission_classes = [IsStaff]
    
    def get(self, request, pk):
        from django.db.models import Sum, Count
        from django.db.models.functions import TruncMonth, TruncDate
        from datetime import datetime, timedelta
        from .models import BusFuelEntry, BusExpense, BusEarning
        
        try:
            bus = Bus.objects.get(id=pk)
        except Bus.DoesNotExist:
            return Response({'error': 'Bus not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Date range from query params
        days = int(request.query_params.get('days', 30))
        start_date = datetime.now().date() - timedelta(days=days)
        
        # Fuel usage by date
        fuel_by_date = BusFuelEntry.objects.filter(
            bus=bus, date__gte=start_date
        ).values('date').annotate(
            liters=Sum('liters'),
            cost=Sum('cost')
        ).order_by('date')
        
        # Expenses by category
        expenses_by_category = BusExpense.objects.filter(
            bus=bus, date__gte=start_date
        ).values('category').annotate(
            total=Sum('amount')
        ).order_by('-total')
        
        # Monthly earnings vs expenses
        monthly_summary = []
        for i in range(6):  # Last 6 months
            month_start = (datetime.now().replace(day=1) - timedelta(days=30*i)).replace(day=1)
            month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            earnings = BusEarning.objects.filter(
                bus=bus, date__gte=month_start, date__lte=month_end
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            expenses = BusExpense.objects.filter(
                bus=bus, date__gte=month_start, date__lte=month_end
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            monthly_summary.append({
                'month': month_start.strftime('%b %Y'),
                'earnings': float(earnings),
                'expenses': float(expenses),
            })
        
        # Trip frequency by day (last 30 days)
        trip_counts = bus.trips.filter(
            scheduled_start__date__gte=start_date
        ).extra(
            select={'day': 'date(scheduled_start)'}
        ).values('day').annotate(count=Count('id')).order_by('day')
        
        return Response({
            'fuel_usage': list(fuel_by_date),
            'expenses_by_category': list(expenses_by_category),
            'monthly_summary': monthly_summary[::-1],  # Reverse to show oldest first
            'trip_frequency': list(trip_counts),
        })

