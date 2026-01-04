"""
Views for attendance app.
"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from datetime import timedelta

from .models import Attendance, EventType
from .serializers import (
    AttendanceSerializer,
    FaceScanSerializer,
    ManualAttendanceSerializer,
    TripAttendanceSerializer,
)
from core.permissions import IsConductorOrDriver, IsStaff, IsParent, IsSchoolAdmin
from apps.transport.models import Trip, TripStatus
from apps.students.models import Student
from apps.accounts.models import SchoolMembership, UserRole


class FaceScanCheckinView(APIView):
    """Face scan check-in endpoint."""
    permission_classes = [IsConductorOrDriver]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        data = request.data.dict()
        data['event_type'] = EventType.CHECKIN
        
        serializer = FaceScanSerializer(
            data=data,
            context={'request': request}
        )
        if not serializer.is_valid():
            print(f"Check-in Serializer errors: {serializer.errors}")
            serializer.is_valid(raise_exception=True)
        attendance = serializer.save()
        
        return Response({
            'message': f'{attendance.student.full_name} checked in successfully',
            'attendance': AttendanceSerializer(attendance).data
        }, status=status.HTTP_201_CREATED)


class FaceScanCheckoutView(APIView):
    """Face scan check-out endpoint."""
    permission_classes = [IsConductorOrDriver]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        data = request.data.dict()
        data['event_type'] = EventType.CHECKOUT
        
        serializer = FaceScanSerializer(
            data=data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        attendance = serializer.save()
        
        return Response({
            'message': f'{attendance.student.full_name} checked out successfully',
            'attendance': AttendanceSerializer(attendance).data
        }, status=status.HTTP_201_CREATED)


class ManualAttendanceView(APIView):
    """Manual attendance marking endpoint."""
    permission_classes = [IsConductorOrDriver]
    
    def post(self, request):
        serializer = ManualAttendanceSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        attendance = serializer.save()
        
        return Response({
            'message': f'{attendance.student.full_name} marked as {attendance.event_type}',
            'attendance': AttendanceSerializer(attendance).data
        }, status=status.HTTP_201_CREATED)


class TripAttendanceView(APIView):
    """Get attendance for a specific trip."""
    permission_classes = [IsConductorOrDriver]
    
    def get(self, request, trip_id):
        try:
            trip = Trip.objects.get(pk=trip_id)
        except Trip.DoesNotExist:
            return Response(
                {'error': 'Trip not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get all students on this route
        students = Student.objects.filter(
            route=trip.route,
            is_active=True
        )
        
        # Get attendance records for this trip
        attendance_records = Attendance.objects.filter(
            trip=trip
        ).select_related('student')
        
        # Build attendance map
        checkin_map = {}
        checkout_map = {}
        
        for record in attendance_records:
            if record.event_type == EventType.CHECKIN:
                checkin_map[record.student_id] = record
            else:
                checkout_map[record.student_id] = record
        
        # Build response
        results = []
        for student in students:
            checkin = checkin_map.get(student.id)
            checkout = checkout_map.get(student.id)
            
            if checkout:
                student_status = 'dropped'
            elif checkin:
                student_status = 'on_bus'
            else:
                student_status = 'not_boarded'
            
            results.append({
                'student': {
                    'id': str(student.id),
                    'full_name': student.full_name,
                    'first_name': student.first_name,
                    'last_name': student.last_name,
                    'photo': request.build_absolute_uri(student.photo.url) if student.photo else None,
                    'grade': student.grade,
                    'section': student.section,
                    'route_name': student.route.name if student.route else None,
                },
                'checkin': AttendanceSerializer(checkin).data if checkin else None,
                'checkout': AttendanceSerializer(checkout).data if checkout else None,
                'status': student_status,
            })
        
        return Response({
            'trip_id': str(trip.id),
            'trip': {
                'id': str(trip.id),
                'bus_number': trip.bus.number if trip.bus else None,
                'route_name': trip.route.name if trip.route else None,
                'trip_type': trip.trip_type,
                'status': trip.status,
                'started_at': trip.started_at,
            },
            'total_students': len(results),
            'checked_in_count': sum(1 for r in results if r['status'] in ['on_bus', 'dropped']),
            'checked_out_count': sum(1 for r in results if r['status'] == 'dropped'),
            'students': results,
        })


class StudentAttendanceHistoryView(generics.ListAPIView):
    """Get attendance history for a student."""
    serializer_class = AttendanceSerializer
    permission_classes = [IsStaff]
    
    def get_queryset(self):
        user = self.request.user
        student_id = self.kwargs['student_id']
        
        # Verify student belongs to school for School Admin
        if user.role != UserRole.ROOT_ADMIN:
             allowed_schools = SchoolMembership.objects.filter(
                user=user,
                is_active=True
            ).values_list('school_id', flat=True)
             
             student_exists = Student.objects.filter(
                 id=student_id,
                 school_id__in=allowed_schools
             ).exists()
             
             if not student_exists:
                 return Attendance.objects.none()

        # Default to last 30 days
        days = int(self.request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        return Attendance.objects.filter(
            student_id=student_id,
            timestamp__gte=start_date
        ).select_related('trip', 'conductor')


class ChildAttendanceHistoryView(generics.ListAPIView):
    """Get attendance history for parent's child."""
    serializer_class = AttendanceSerializer
    permission_classes = [IsParent]
    
    def get_queryset(self):
        from apps.students.models import Parent
        
        student_id = self.kwargs['student_id']
        
        # Verify parent access
        if not Parent.objects.filter(
            user=self.request.user,
            student_id=student_id,
            is_active=True
        ).exists():
            return Attendance.objects.none()
        
        # Default to last 7 days for parents
        days = int(self.request.query_params.get('days', 7))
        start_date = timezone.now() - timedelta(days=days)
        
        return Attendance.objects.filter(
            student_id=student_id,
            timestamp__gte=start_date
        ).select_related('trip')


class ChildCurrentStatusView(APIView):
    """Get current bus status for a child."""
    permission_classes = [IsParent]
    
    def get(self, request, student_id):
        from apps.students.models import Student, Parent
        
        # Verify parent access
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
        
        # Get today's attendance
        today = timezone.now().date()
        today_records = Attendance.objects.filter(
            student=student,
            timestamp__date=today
        ).order_by('timestamp')
        
        # Determine status
        latest = today_records.last()
        
        if not latest:
            current_status = 'not_on_bus'
            message = 'Not on bus today'
        elif latest.event_type == EventType.CHECKIN:
            current_status = 'on_bus'
            message = f'On bus since {latest.timestamp.strftime("%I:%M %p")}'
        else:
            current_status = 'dropped'
            message = f'Dropped at {latest.timestamp.strftime("%I:%M %p")}'
        
        # Get active trip if student is on bus
        active_trip = None
        if current_status == 'on_bus' and student.route:
            active_trip = Trip.objects.filter(
                route=student.route,
                status=TripStatus.IN_PROGRESS
            ).first()
        
        return Response({
            'student': {
                'id': str(student.id),
                'name': student.full_name,
                'photo': student.photo.url if student.photo else None,
            },
            'status': current_status,
            'message': message,
            'today_records': AttendanceSerializer(today_records, many=True).data,
            'active_trip_id': str(active_trip.id) if active_trip else None,
        })


class AttendanceListView(generics.ListAPIView):
    """List all attendance records (with filtering)."""
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsSchoolAdmin] # Or IsStaff?
    
    def get_queryset(self):
        user = self.request.user
        queryset = Attendance.objects.all()
        
        # Filter by user's schools
        if user.role != UserRole.ROOT_ADMIN:
             school_ids = SchoolMembership.objects.filter(
                user=user,
                is_active=True
            ).values_list('school_id', flat=True)
             queryset = queryset.filter(student__school_id__in=school_ids)
        
        # Filter by date
        date_str = self.request.query_params.get('date')
        if date_str:
            try:
                queryset = queryset.filter(timestamp__date=date_str)
            except ValueError:
                pass
        
        # Filter by trip
        trip_id = self.request.query_params.get('trip_id')
        if trip_id:
            queryset = queryset.filter(trip_id=trip_id)
            
        # Filter by student
        student_id = self.request.query_params.get('student_id')
        if student_id:
            queryset = queryset.filter(student_id=student_id)
            
        return queryset.order_by('-timestamp')
