"""
Views for schools app.
"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import School
from .serializers import SchoolSerializer, SchoolCreateSerializer, SchoolListSerializer
from core.permissions import IsRootAdmin, IsSchoolAdmin


class SchoolListCreateView(generics.ListCreateAPIView):
    """List all schools or create a new school (Root Admin only)."""
    queryset = School.objects.all()
    
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
            print("\n" + "="*50)
            print("Validation Errors:", serializer.errors)
            print("="*50 + "\n")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def get_queryset(self):
        from apps.accounts.models import SchoolMembership, UserRole
        
        queryset = School.objects.all()
        
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
        
        # Get counts
        stats = {
            'total_students': Student.objects.filter(school=school, is_active=True).count(),
            'total_buses': Bus.objects.filter(school=school, is_active=True).count(),
            'total_routes': Route.objects.filter(school=school, is_active=True).count(),
            'total_conductors': SchoolMembership.objects.filter(
                school=school, role=UserRole.CONDUCTOR, is_active=True
            ).count(),
            'total_drivers': SchoolMembership.objects.filter(
                school=school, role=UserRole.DRIVER, is_active=True
            ).count(),
            'total_parents': SchoolMembership.objects.filter(
                school=school, role=UserRole.PARENT, is_active=True
            ).count(),
        }
        
        return Response(stats)


class SchoolDashboardView(APIView):
    """Get dashboard stats for logic-determined school."""
    permission_classes = [IsSchoolAdmin]
    
    def get(self, request):
        # Import here to avoid circular imports
        from apps.students.models import Student
        from apps.transport.models import Bus, Route
        from apps.accounts.models import SchoolMembership, UserRole

        # Determine school
        if request.user.role == UserRole.ROOT_ADMIN:
            # For root admin, maybe return global stats or require a param?
            # For now, let's return aggregate or error.
            # Let's count all.
            pass
        else:
            # For school admin, get their school
             try:
                membership = SchoolMembership.objects.get(
                    user=request.user, 
                    is_active=True,
                    role__in=[UserRole.SCHOOL_ADMIN]
                )
                school = membership.school
             except SchoolMembership.DoesNotExist:
                 return Response({'error': 'No active school membership'}, status=403)
        
        # If root admin and no school specific context, return total counts
        
        # If root admin and no school specific context, return total counts
        if request.user.role == UserRole.ROOT_ADMIN:
             stats = {
                'total_schools': School.objects.filter(is_active=True).count(),
                'total_students': Student.objects.filter(is_active=True).count(),
                'total_buses': Bus.objects.filter(is_active=True).count(),
                'active_trips': 0 # TODO: implement
            }
             return Response(stats)

        # School specific stats
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
        }
        
        return Response(stats)
