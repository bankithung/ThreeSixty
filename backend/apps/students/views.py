"""
Views for students app.
"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q

from .models import Student, Parent, FaceEncoding
from .serializers import (
    StudentSerializer,
    StudentListSerializer,
    StudentCreateSerializer,
    ParentSerializer,
    ParentListSerializer,
    AddParentSerializer,
    FaceEncodingSerializer,
    ParentChildrenSerializer,
)
from core.permissions import IsSchoolAdmin, IsStaff, IsParent, IsConductor
from apps.accounts.models import SchoolMembership, UserRole


class StudentListCreateView(generics.ListCreateAPIView):
    """List students or create a new student."""
    
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsStaff()]
        return [IsStaff()]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return StudentCreateSerializer
        return StudentListSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Student.objects.select_related('school', 'route', 'stop')
        
        # Filter by user's schools (unless root admin)
        if user.role != UserRole.ROOT_ADMIN:
            school_ids = SchoolMembership.objects.filter(
                user=user,
                is_active=True
            ).values_list('school_id', flat=True)
            queryset = queryset.filter(school_id__in=school_ids)
        
        # Default: only show active students (unless explicitly requested otherwise)
        is_active = self.request.query_params.get('is_active')
        if is_active is None:
            # Default to active students only
            queryset = queryset.filter(is_active=True)
        elif is_active is not None:
            # Explicit filter requested
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by school
        school_id = self.request.query_params.get('school_id')
        if school_id:
            queryset = queryset.filter(school_id=school_id)
        
        # Filter by route
        route_id = self.request.query_params.get('route_id')
        if route_id:
            queryset = queryset.filter(route_id=route_id)
        
        # Filter by grade
        grade = self.request.query_params.get('grade')
        if grade:
            queryset = queryset.filter(grade=grade)
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(admission_number__icontains=search)
            )
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset


class StudentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a student."""
    queryset = Student.objects.select_related('school', 'route', 'stop')
    permission_classes = [IsStaff]

    def get_queryset(self):
        user = self.request.user
        queryset = Student.objects.select_related('school', 'route', 'stop')
        
        # Filter by user's schools (unless root admin)
        if hasattr(user, 'role') and user.role != UserRole.ROOT_ADMIN:
             school_ids = SchoolMembership.objects.filter(
                user=user,
                is_active=True
            ).values_list('school_id', flat=True)
             queryset = queryset.filter(school_id__in=school_ids)
             
        return queryset
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return StudentCreateSerializer
        return StudentSerializer
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete."""
        student = self.get_object()
        student.is_active = False
        student.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class StudentParentsView(generics.ListCreateAPIView):
    """List or add parents for a student."""
    permission_classes = [IsStaff]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AddParentSerializer
        return ParentSerializer
    
    def get_queryset(self):
        student_id = self.kwargs['pk']
        return Parent.objects.filter(
            student_id=student_id
        ).select_related('user')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['student'] = Student.objects.get(pk=self.kwargs['pk'])
        return context


class ParentListView(generics.ListAPIView):
    """List all parents for admin portal."""
    serializer_class = ParentListSerializer
    permission_classes = [IsStaff]
    
    def get_queryset(self):
        user = self.request.user
        search = self.request.query_params.get('search', '')
        school_id = self.request.query_params.get('school_id')
        
        queryset = Parent.objects.select_related(
            'user', 'student', 'student__school'
        ).filter(is_active=True)
        
        # Filter by user's schools (unless root admin)
        if hasattr(user, 'role') and user.role != UserRole.ROOT_ADMIN:
            school_ids = SchoolMembership.objects.filter(
                user=user,
                is_active=True
            ).values_list('school_id', flat=True)
            queryset = queryset.filter(student__school_id__in=school_ids)
        
        # Filter by specific school
        if school_id:
            queryset = queryset.filter(student__school_id=school_id)
        
        # Search
        if search:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__phone__icontains=search) |
                Q(student__first_name__icontains=search) |
                Q(student__last_name__icontains=search)
            )
        
        return queryset.order_by('user__first_name', 'user__last_name')


class StudentFaceEncodingsView(generics.ListCreateAPIView):
    """List or add face encodings for a student."""
    serializer_class = FaceEncodingSerializer
    permission_classes = [IsStaff]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        student_id = self.kwargs['pk']
        return FaceEncoding.objects.filter(student_id=student_id)
    
    def create(self, request, *args, **kwargs):
        """Upload photo and generate face encoding."""
        from apps.attendance.face_recognition import generate_face_encoding
        
        student_id = self.kwargs['pk']
        
        try:
            student = Student.objects.get(pk=student_id)
        except Student.DoesNotExist:
            return Response(
                {'error': 'Student not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        photo = request.FILES.get('photo')
        if not photo:
            return Response(
                {'error': 'Photo is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate face encoding
        result = generate_face_encoding(photo)
        
        if not result['success']:
            return Response(
                {'error': result['error']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if this is the first encoding
        is_primary = not FaceEncoding.objects.filter(student=student).exists()
        
        # Create face encoding record
        face_encoding = FaceEncoding.objects.create(
            student=student,
            encoding=result['encoding'],
            photo=photo,
            is_primary=is_primary,
            quality_score=result['confidence']
        )
        
        # Update student profile photo if not set or if this is primary
        if not student.photo or is_primary:
            # We need to re-open the file or save the field using the same file object
            # Since the file pointer might be at the end, let's just assign the file object
            # Django's ImageField handles this correctly
            student.photo = photo
            student.save(update_fields=['photo'])
        
        return Response(
            FaceEncodingSerializer(face_encoding).data,
            status=status.HTTP_201_CREATED
        )


class ParentChildrenView(generics.ListAPIView):
    """List children for the logged-in parent."""
    serializer_class = ParentChildrenSerializer
    permission_classes = [IsParent]
    
    def get_queryset(self):
        user = self.request.user
        student_ids = Parent.objects.filter(
            user=user,
            is_active=True
        ).values_list('student_id', flat=True)
        
        return Student.objects.filter(
            id__in=student_ids,
            is_active=True
        ).select_related('school', 'route')


class ConductorStudentListView(generics.ListAPIView):
    """List students for a conductor's bus/route."""
    serializer_class = StudentListSerializer
    permission_classes = [IsConductor]
    
    def get_queryset(self):
        route_id = self.request.query_params.get('route_id')
        
        queryset = Student.objects.filter(is_active=True)
        
        if route_id:
            queryset = queryset.filter(route_id=route_id)
        
        return queryset.select_related('route', 'stop').prefetch_related('face_encodings')


class EnrollStudentsView(APIView):
    """Enroll students with parent details (parent-first workflow)."""
    permission_classes = [IsStaff]
    
    def post(self, request):
        """Create students and parent accounts in single transaction."""
        from .serializers import StudentEnrollmentSerializer
        
        serializer = StudentEnrollmentSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            result = serializer.save()
            
            # Prepare response
            students = result['students']
            parent_users = result['parent_users']
            created_users = result['created_users']
            
            return Response({
                'success': True,
                'message': f'Successfully enrolled {len(students)} student(s) with {len(parent_users)} parent(s)',
                'data': {
                    'students': StudentListSerializer(students, many=True).data,
                    'parent_count': len(parent_users),
                    'created_parent_accounts': len(created_users),
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Enrollment failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StudentIdentifyView(APIView):
    """Identify a student from a face image."""
    permission_classes = [IsStaff]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request, *args, **kwargs):
        from apps.attendance.face_recognition import match_face
        
        photo = request.FILES.get('photo')
        if not photo:
            return Response(
                {'error': 'Photo is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Get all student encodings
        encodings = list(FaceEncoding.objects.values('student_id', 'encoding'))
        
        if not encodings:
            return Response(
                {'error': 'No registered faces found'},
                status=status.HTTP_404_NOT_FOUND
            )
            
        # Match face
        result = match_face(photo, encodings)
        
        if not result['success']:
            return Response(
                {'identified': False, 'message': result['error'] or 'No match found'},
                status=status.HTTP_200_OK
            )
            
        if result['student_id']:
            student = Student.objects.get(id=result['student_id'])
            return Response({
                'identified': True,
                'student': {
                    'id': student.id,
                    'full_name': student.full_name,
                    'admission_number': student.admission_number,
                    'grade': student.grade,
                    'section': student.section,
                    'photo': request.build_absolute_uri(student.photo.url) if student.photo else None
                },
                'confidence': result['confidence']
            })
            
        return Response(
            {'identified': False, 'message': 'No match found'},
            status=status.HTTP_200_OK
        )
