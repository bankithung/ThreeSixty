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
        from apps.transport.models import Bus, Route
        from apps.accounts.models import SchoolMembership, UserRole
        from apps.subscriptions.models import Subscription, Transaction
        from django.db.models import Sum, Count, F
        from django.db.models.functions import TruncMonth
        from django.utils import timezone
        from datetime import timedelta

        # Root Admin: Global Stats
        if request.user.role == UserRole.ROOT_ADMIN:
             # Basic Counts
             total_schools = School.objects.count()
             active_schools = School.objects.filter(is_active=True).count()
             blocked_schools = School.objects.filter(is_active=False).count()
             
             # Calculate MRR (Monthly Recurring Revenue) from active subscriptions
             # Assuming Subscription.feature.price is monthly
             mrr = Subscription.objects.filter(is_active=True).aggregate(
                 total=Sum('feature__price')
             )['total'] or 0

             # Total Users (Students + Staff + Admins)
             # Filter Active only and exclude Parents from staff count
             total_students = Student.objects.filter(is_active=True).count()
             total_staff = SchoolMembership.objects.filter(
                 is_active=True
             ).exclude(role=UserRole.PARENT).count()
             
             # Recent Activity (Last 5 newly created schools)
             recent_schools = School.objects.order_by('-created_at')[:5]
             recent_activity = [{
                 'id': s.id,
                 'name': s.name, 
                 'created_at': s.created_at,
                 'city': s.city,
                 'logo': request.build_absolute_uri(s.logo.url) if s.logo else None,
                 'status': 'Active' if s.is_active else 'Blocked'
             } for s in recent_schools]

             # Growth Chart: New Schools per Month (Last 6 months)
             six_months_ago = timezone.now() - timedelta(days=180)
             school_growth = School.objects.filter(created_at__gte=six_months_ago)\
                 .annotate(month=TruncMonth('created_at'))\
                 .values('month')\
                 .annotate(count=Count('id'))\
                 .order_by('month')
            
             # Revenue Growth (Real Transactions)
             revenue_growth = Transaction.objects.filter(transaction_date__gte=six_months_ago, status='paid')\
                 .annotate(month=TruncMonth('transaction_date'))\
                 .values('month')\
                 .annotate(total=Sum('amount'))\
                 .order_by('month')
            
             # MRR (Last 30 days paid transactions)
             thirty_days_ago = timezone.now() - timedelta(days=30)
             mrr = Transaction.objects.filter(
                 status='paid', 
                 transaction_date__gte=thirty_days_ago
             ).aggregate(total=Sum('amount'))['total'] or 0

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

        # School Admin: School Specific Stats
        try:
            membership = SchoolMembership.objects.get(
                user=request.user, 
                is_active=True,
                role__in=[UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL]
            )
            school = membership.school
        except SchoolMembership.DoesNotExist:
             return Response({'error': 'No active school membership'}, status=403)
        
        # School Admin Stats...
        stats = {
            'school_name': school.name,
            'total_students': Student.objects.filter(school=school, is_active=True).count(),
            'total_buses': Bus.objects.filter(school=school, is_active=True).count(),
            'total_routes': Route.objects.filter(school=school, is_active=True).count(),
            'total_conductors': SchoolMembership.objects.filter(
                school=school, role=UserRole.CONDUCTOR, is_active=True
            ).count(),
            'total_drivers': SchoolMembership.objects.filter(
                school=school, role=UserRole.DRIVER, is_active=True
            ).count(),
             # Add recent trips or alerts for local dash
             'active_trips_count': 0, # Placeholder, fetch real count if needed
             'pending_alerts': 0 
        }
        
        return Response(stats)
