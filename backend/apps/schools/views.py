"""
Views for schools app.
"""
from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from .models import School
from .serializers import SchoolSerializer, SchoolCreateSerializer, SchoolListSerializer
from core.permissions import IsRootAdmin, IsSchoolAdmin


class SchoolListCreateView(generics.ListCreateAPIView):
    """List all schools or create a new school (Root Admin only)."""
    
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsRootAdmin()]
        return [IsSchoolAdmin()]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SchoolCreateSerializer
        return SchoolListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def get_queryset(self):
        from apps.accounts.models import SchoolMembership, UserRole
        from django.db.models import Count, Q
        
        queryset = School.objects.all().annotate(
            student_count=Count('students', filter=Q(students__is_active=True), distinct=True),
            active_staff_count=Count('memberships', filter=~Q(memberships__role=UserRole.PARENT) & Q(memberships__is_active=True), distinct=True)
        )
        
        # Restrict queryset based on user role
        # Root Admin sees all
        if self.request.user.role == UserRole.SCHOOL_ADMIN:
            try:
                # Only show their assigned school
                membership = SchoolMembership.objects.get(
                    user=self.request.user,
                    is_active=True,
                    role=UserRole.SCHOOL_ADMIN
                )
                queryset = queryset.filter(id=membership.school.id)
            except SchoolMembership.DoesNotExist:
                return School.objects.none()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Search by name or city
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(name__icontains=search) |
                models.Q(city__icontains=search) |
                models.Q(code__icontains=search)
            )
        
        return queryset


class SchoolDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a school."""
    queryset = School.objects.all()
    serializer_class = SchoolSerializer
    parser_classes = [MultiPartParser, FormParser]  # Enable file uploads
    
    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsRootAdmin()]
        return [IsSchoolAdmin()]
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete - deactivate instead of deleting."""
        school = self.get_object()
        school.is_active = False
        school.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class SchoolStatsView(APIView):
    """Get statistics for a school."""
    permission_classes = [IsSchoolAdmin]
    
    def get(self, request, pk):
        try:
            school = School.objects.get(pk=pk)
        except School.DoesNotExist:
            return Response(
                {'error': 'School not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Import here to avoid circular imports
        from apps.students.models import Student
        from apps.transport.models import Bus, Route
        from apps.accounts.models import SchoolMembership, UserRole
        from django.db.models import Count
        
        # Get counts
        stats = {
            'total_students': Student.objects.filter(school=school, is_active=True).count(),
            'total_buses': Bus.objects.filter(school=school, is_active=True).count(),
            'total_routes': Route.objects.filter(school=school, is_active=True).count(),
            'total_staff': SchoolMembership.objects.filter(
                school=school, is_active=True
            ).exclude(role=UserRole.PARENT).count(),
            'total_teachers': SchoolMembership.objects.filter(
                school=school, role=UserRole.TEACHER, is_active=True
            ).count(),
            'total_conductors': SchoolMembership.objects.filter(
                school=school, role=UserRole.CONDUCTOR, is_active=True
            ).count(),
            'total_drivers': SchoolMembership.objects.filter(
                school=school, role=UserRole.DRIVER, is_active=True
            ).count(),
            'total_parents': SchoolMembership.objects.filter(
                school=school, role=UserRole.PARENT, is_active=True
            ).count(),
            'students_with_face_data': Student.objects.filter(
                school=school, is_active=True
            ).annotate(face_count=Count('face_encodings')).filter(face_count__gt=0).count(),
            'students_without_face_data': Student.objects.filter(
                school=school, is_active=True
            ).annotate(face_count=Count('face_encodings')).filter(face_count=0).count(),
        }
        
        return Response(stats)



class SchoolBlockView(APIView):
    """
    Block or unblock a school.
    Only Root Admin can perform this action.
    """
    permission_classes = [IsRootAdmin]

    def post(self, request, pk):
        try:
            school = School.objects.get(pk=pk)
        except School.DoesNotExist:
            return Response({'error': 'School not found'}, status=status.HTTP_404_NOT_FOUND)
        
        action = request.data.get('action') # 'block' or 'unblock'
        if action not in ['block', 'unblock']:
            return Response({'error': 'Invalid action. Use "block" or "unblock".'}, status=status.HTTP_400_BAD_REQUEST)
        
        school.is_active = (action == 'unblock')
        school.save()
        
        # If blocking, we might want to invalidate sessions or tokens for all users of this school
        # This can be handled by a signal or here.
        # For now, simply setting is_active=False on School should be checked in Permission classes or Login.
        
        status_msg = "unblocked" if school.is_active else "blocked"
        return Response({'message': f'School has been {status_msg}.', 'is_active': school.is_active})


class SchoolDashboardView(APIView):
    """Get dashboard stats for logic-determined school."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        from apps.students.models import Student
        from apps.transport.models import Bus, Route, Trip, TripStatus, BusExpense, BusEarning
        from apps.accounts.models import SchoolMembership, UserRole
        from apps.subscriptions.models import Subscription, Transaction
        from apps.attendance.models import Attendance, EventType
        from django.db.models import Sum, Count, Q
        from django.db.models.functions import TruncMonth, TruncDate
        from django.utils import timezone
        from datetime import timedelta

        # Root Admin: Global Stats (Kept as is)
        if request.user.role == UserRole.ROOT_ADMIN:
             # Basic Counts
             total_schools = School.objects.count()
             active_schools = School.objects.filter(is_active=True).count()
             blocked_schools = School.objects.filter(is_active=False).count()
             
             # MRR
             mrr = Subscription.objects.filter(is_active=True).aggregate(
                 total=Sum('feature__price')
             )['total'] or 0

             # Users
             total_students = Student.objects.filter(is_active=True).count()
             total_staff = SchoolMembership.objects.filter(
                 is_active=True
             ).exclude(role=UserRole.PARENT).count()
             
             # Recent Activity
             recent_schools = School.objects.order_by('-created_at')[:5]
             recent_activity = [{
                 'id': s.id,
                 'name': s.name, 
                 'created_at': s.created_at,
                 'city': s.city,
                 'logo': request.build_absolute_uri(s.logo.url) if s.logo else None,
                 'status': 'Active' if s.is_active else 'Blocked'
             } for s in recent_schools]

             # Charts
             six_months_ago = timezone.now() - timedelta(days=180)
             school_growth = School.objects.filter(created_at__gte=six_months_ago)\
                 .annotate(month=TruncMonth('created_at'))\
                 .values('month')\
                 .annotate(count=Count('id'))\
                 .order_by('month')
            
             revenue_growth = Transaction.objects.filter(transaction_date__gte=six_months_ago, status='paid')\
                 .annotate(month=TruncMonth('transaction_date'))\
                 .values('month')\
                 .annotate(total=Sum('amount'))\
                 .order_by('month')
            
             stats = {
                'total_schools': total_schools,
                'active_schools': active_schools,
                'blocked_schools': blocked_schools,
                'total_students': total_students,
                'total_staff': total_staff,
                'total_revenue': mrr,
                'active_subscriptions': Subscription.objects.filter(is_active=True).count(),
                'recent_activity': recent_activity,
                'charts': {
                    'school_growth': list(school_growth),
                    'revenue_growth': list(revenue_growth)
                }
            }
             return Response(stats)

        # School Admin: Detailed School Specific Stats
        try:
            membership = SchoolMembership.objects.get(
                user=request.user, 
                is_active=True,
                role__in=[UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL]
            )
            school = membership.school
        except SchoolMembership.DoesNotExist:
             return Response({'error': 'No active school membership'}, status=403)
        
        today = timezone.localdate()
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # 0. Active Features & Branding
        active_features = Subscription.objects.filter(
            school=school, 
            is_active=True
        ).values_list('feature__code', flat=True)
        
        school_logo = request.build_absolute_uri(school.logo.url) if school.logo else None

        # 1. Overview Counts
        total_students = Student.objects.filter(school=school, is_active=True).count()
        total_staff = SchoolMembership.objects.filter(school=school, is_active=True).exclude(role=UserRole.PARENT).count()
        total_buses = Bus.objects.filter(school=school, is_active=True).count()
        
        # 2. Attendance (Today)
        # Unique students who generated a checkin event today
        present_count = Attendance.objects.filter(
            student__school=school,
            timestamp__date=today,
            event_type=EventType.CHECKIN
        ).values('student').distinct().count()
        
        attendance_percentage = (present_count / total_students * 100) if total_students > 0 else 0
        
        # 3. Trip Status (Today)
        # Only calculate if TRANSPORT feature is active to save query, or just calculate generally
        todays_trips = Trip.objects.filter(
            bus__school=school, 
            scheduled_start__date=today
        )
        trip_stats = {
            'total': todays_trips.count(),
            'scheduled': todays_trips.filter(status=TripStatus.SCHEDULED).count(),
            'in_progress': todays_trips.filter(status=TripStatus.IN_PROGRESS).count(),
            'completed': todays_trips.filter(status=TripStatus.COMPLETED).count(),
            'cancelled': todays_trips.filter(status=TripStatus.CANCELLED).count(),
        }

        # 4. Financials (Current Month)
        current_month_start = today.replace(day=1)
        
        monthly_earnings = BusEarning.objects.filter(
            bus__school=school, date__gte=current_month_start
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        monthly_expenses = BusExpense.objects.filter(
            bus__school=school, date__gte=current_month_start
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # 5. Charts Logic (Last 7 Days Attendance)
        last_7_days = [(today - timedelta(days=i)) for i in range(6, -1, -1)]
        attendance_chart = []
        for d in last_7_days:
            count = Attendance.objects.filter(
                student__school=school,
                timestamp__date=d,
                event_type=EventType.CHECKIN
            ).values('student').distinct().count()
            attendance_chart.append({
                'date': d.strftime('%Y-%m-%d'),
                'count': count
            })

        # 6. Recent Trips (Live Status)
        recent_trips = Trip.objects.filter(
            bus__school=school,
            scheduled_start__gte=today_start
        ).select_related('bus', 'route', 'driver').order_by('-scheduled_start')[:5]
        
        recent_trips_data = [{
            'id': t.id,
            'bus': t.bus.number,
            'route': t.route.name,
            'driver': t.driver.full_name if t.driver else 'Unassigned',
            'status': t.status,
            'time': t.scheduled_start,
            'passengers': f"{t.students_boarded}/{t.total_students}" if t.status in ['in_progress', 'completed'] else f"Est. {t.total_students}"
        } for t in recent_trips]

        # 7. Notifications / Alerts
        # Fetch high priority notifications or recent ones for the user (School Admin)
        from apps.notifications.models import Notification, NotificationType
        recent_notifications = Notification.objects.filter(
            user=request.user
        ).select_related('trip', 'student').order_by('-created_at')[:5]

        alerts_data = [{
            'id': n.id,
            'title': n.title,
            'desc': n.body,
            'type': 'critical' if n.notification_type in [NotificationType.EMERGENCY, NotificationType.DELAY] else 
                    'warning' if n.notification_type in [NotificationType.APPROACHING] else 'info',
            'time': n.created_at
        } for n in recent_notifications]

        stats = {
            'school_name': school.name,
            'school_logo': school_logo,
            'active_features': list(active_features),
            'overview': {
                'total_students': total_students,
                'total_staff': total_staff,
                'total_buses': total_buses,
                'present_today': present_count,
                'attendance_percentage': round(attendance_percentage, 1),
                'active_fleet_count': trip_stats['in_progress']
            },
            'trips': trip_stats,
            'finance': {
                'month_earnings': monthly_earnings,
                'month_expenses': monthly_expenses,
                'net_profit': monthly_earnings - monthly_expenses
            },
            'charts': {
                'attendance_7_days': attendance_chart
            },
            'live_activity': recent_trips_data,
            'alerts': alerts_data
        }
        
        return Response(stats)
