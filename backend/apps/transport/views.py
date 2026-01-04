"""
Views for transport app.
"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q

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
        trip = serializer.save()
        
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
        location = serializer.save()
        
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
        
        # Get latest location
        latest_location = trip.location_updates.first()
        
        # Get route stops
        stops = trip.route.stops.all().order_by('sequence')
        
        # Get driver and conductor info
        staff_info = {
            'driver': {
                'name': trip.driver.full_name if trip.driver else None,
                'phone': trip.driver.phone if trip.driver else None,
            } if trip.driver else None,
            'conductor': {
                'name': trip.conductor.full_name if trip.conductor else None,
                'phone': trip.conductor.phone if trip.conductor else None,
            } if trip.conductor else None,
        }
        
        return Response({
            'trip': TripSerializer(trip).data,
            'latest_location': LocationUpdateSerializer(latest_location).data if latest_location else None,
            'stops': StopSerializer(stops, many=True).data,
            'staff': staff_info,
            'route_polyline': trip.route.route_polyline,
        })


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
