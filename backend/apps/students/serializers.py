"""
Serializers for students app.
"""
from rest_framework import serializers
from .models import Student, Parent, FaceEncoding
from apps.accounts.serializers import UserSerializer


class FaceEncodingSerializer(serializers.ModelSerializer):
    """Serializer for FaceEncoding model."""
    
    class Meta:
        model = FaceEncoding
        fields = ['id', 'photo', 'is_primary', 'quality_score', 'created_at']
        read_only_fields = ['id', 'quality_score', 'created_at']


class ParentSerializer(serializers.ModelSerializer):
    """Serializer for Parent model."""
    user = UserSerializer(read_only=True)
    user_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = Parent
        fields = ['id', 'user', 'user_id', 'student', 'relation', 'is_primary', 'is_active']
        read_only_fields = ['id']


class ParentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing parents with student info."""
    # Parent user details
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    
    # Student details
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_grade = serializers.CharField(source='student.grade', read_only=True)
    student_section = serializers.CharField(source='student.section', read_only=True)
    student_admission_number = serializers.CharField(source='student.admission_number', read_only=True)
    
    class Meta:
        model = Parent
        fields = [
            'id', 'full_name', 'phone', 'email', 'relation', 'is_primary', 'is_active',
            'student', 'student_name', 'student_grade', 'student_section', 'student_admission_number',
            'created_at'
        ]


class StudentSerializer(serializers.ModelSerializer):
    """Full serializer for Student model."""
    full_name = serializers.ReadOnlyField()
    pickup_location = serializers.ReadOnlyField()
    drop_location = serializers.ReadOnlyField()
    parents = ParentSerializer(many=True, read_only=True)
    face_count = serializers.SerializerMethodField()
    route_name = serializers.CharField(source='route.name', read_only=True)
    stop_name = serializers.CharField(source='stop.name', read_only=True)
    
    class Meta:
        model = Student
        fields = [
            'id', 'school', 'admission_number', 'first_name', 'last_name',
            'full_name', 'date_of_birth', 'gender', 'grade', 'section',
            'photo', 'pickup_address', 'pickup_latitude', 'pickup_longitude',
            'pickup_location', 'drop_address', 'drop_latitude', 'drop_longitude',
            'drop_location', 'route', 'route_name', 'stop', 'stop_name',
            'is_active', 'parents', 'face_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_face_count(self, obj):
        """Return number of face encodings."""
        return obj.face_encodings.count()


class StudentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing students."""
    full_name = serializers.ReadOnlyField()
    route_name = serializers.CharField(source='route.name', read_only=True)
    has_face = serializers.SerializerMethodField()
    
    class Meta:
        model = Student
        fields = [
            'id', 'admission_number', 'first_name', 'last_name', 'full_name', 
            'grade', 'section', 'photo', 'route', 'route_name', 'is_active', 'has_face',
            'school', 'pickup_address', 'pickup_latitude', 'pickup_longitude'
        ]
    
    def get_has_face(self, obj):
        """Check if student has face encoding."""
        return obj.face_encodings.exists()


class StudentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating students with parent linking."""
    parent_phone = serializers.CharField(max_length=20, write_only=True, required=False)
    parent_relation = serializers.CharField(max_length=20, write_only=True, required=False)
    
    class Meta:
        model = Student
        fields = [
            'school', 'admission_number', 'first_name', 'last_name',
            'date_of_birth', 'gender', 'grade', 'section', 'photo',
            'pickup_address', 'pickup_latitude', 'pickup_longitude',
            'drop_address', 'drop_latitude', 'drop_longitude',
            'route', 'stop', 'parent_phone', 'parent_relation'
        ]
    
    def create(self, validated_data):
        """Create student and link parent if phone provided."""
        from apps.accounts.models import User, UserRole, SchoolMembership
        from core.utils import format_phone_number
        
        parent_phone = validated_data.pop('parent_phone', None)
        parent_relation = validated_data.pop('parent_relation', 'guardian')
        
        # Create student
        student = Student.objects.create(**validated_data)
        
        # Link parent if phone provided
        if parent_phone:
            phone = format_phone_number(parent_phone)
            
            # Get or create parent user
            user, created = User.objects.get_or_create(
                phone=phone,
                defaults={
                    'first_name': 'Parent',
                    'role': UserRole.PARENT,
                }
            )
            
            # Create school membership if new user
            if created:
                SchoolMembership.objects.create(
                    user=user,
                    school=student.school,
                    role=UserRole.PARENT
                )
            
            # Create parent link
            Parent.objects.create(
                user=user,
                student=student,
                relation=parent_relation,
                is_primary=True
            )
        
        return student


class AddParentSerializer(serializers.Serializer):
    """Serializer for adding a parent to a student."""
    phone = serializers.CharField(max_length=20)
    relation = serializers.ChoiceField(choices=Parent.RELATION_CHOICES)
    is_primary = serializers.BooleanField(default=False)
    
    def create(self, validated_data):
        """Link parent to student."""
        from apps.accounts.models import User, UserRole, SchoolMembership
        from core.utils import format_phone_number
        
        student = self.context['student']
        phone = format_phone_number(validated_data['phone'])
        relation = validated_data['relation']
        is_primary = validated_data['is_primary']
        
        # Get or create parent user
        user, created = User.objects.get_or_create(
            phone=phone,
            defaults={
                'first_name': 'Parent',
                'role': UserRole.PARENT,
            }
        )
        
        # Create school membership if new user
        if created:
            SchoolMembership.objects.create(
                user=user,
                school=student.school,
                role=UserRole.PARENT
            )
        
        # Create parent link
        parent, _ = Parent.objects.update_or_create(
            user=user,
            student=student,
            defaults={
                'relation': relation,
                'is_primary': is_primary,
            }
        )
        
        return parent


class ParentChildrenSerializer(serializers.ModelSerializer):
    """Serializer for parent's children list."""
    school_name = serializers.CharField(source='school.name', read_only=True)
    route_name = serializers.CharField(source='route.name', read_only=True)
    current_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Student
        fields = [
            'id', 'first_name', 'last_name', 'grade', 'section',
            'photo', 'school_name', 'route_name', 'current_status'
        ]
    
    def get_current_status(self, obj):
        """Get current bus status for the student."""
        from apps.attendance.models import Attendance
        from django.utils import timezone
        
        today = timezone.now().date()
        
        # Get latest attendance record for today
        latest = Attendance.objects.filter(
            student=obj,
            timestamp__date=today
        ).order_by('-timestamp').first()
        
        if latest:
            return {
                'event_type': latest.event_type,
                'timestamp': latest.timestamp,
                'location': {
                    'latitude': float(latest.latitude) if latest.latitude else None,
                    'longitude': float(latest.longitude) if latest.longitude else None,
                }
            }
        
        return {'event_type': 'not_on_bus', 'timestamp': None, 'location': None}


class ParentDetailSerializer(serializers.Serializer):
    """Serializer for parent details during enrollment."""
    full_name = serializers.CharField(max_length=200)
    phone_number = serializers.CharField(max_length=20)
    relation = serializers.ChoiceField(choices=Parent.RELATION_CHOICES)
    is_primary = serializers.BooleanField(default=False)
    
    def validate_phone_number(self, value):
        """Validate and format phone number."""
        from core.utils import format_phone_number
        return format_phone_number(value)


class StudentEnrollmentDataSerializer(serializers.Serializer):
    """Serializer for student data during enrollment."""
    admission_number = serializers.CharField(max_length=50)
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(
        choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')],
        required=False,
        allow_null=True
    )
    grade = serializers.CharField(max_length=20)
    section = serializers.CharField(max_length=10, required=False, allow_blank=True)
    route = serializers.UUIDField(required=False, allow_null=True)  # Optional route assignment
    pickup_address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    pickup_latitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False, allow_null=True)
    pickup_longitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False, allow_null=True)
    drop_address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    drop_latitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False, allow_null=True)
    drop_longitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False, allow_null=True)


class StudentEnrollmentSerializer(serializers.Serializer):
    """Comprehensive serializer for enrolling students with parents."""
    school = serializers.UUIDField()
    parents = ParentDetailSerializer(many=True)
    students = StudentEnrollmentDataSerializer(many=True)
    
    def validate_school(self, value):
        """Validate school exists."""
        from apps.schools.models import School
        try:
            return School.objects.get(id=value)
        except School.DoesNotExist:
            raise serializers.ValidationError("School not found")
    
    def validate_parents(self, value):
        """Validate parents data."""
        if not value:
            raise serializers.ValidationError("At least one parent is required")
        
        # Check for duplicate phone numbers in request
        phone_numbers = [p['phone_number'] for p in value]
        if len(phone_numbers) != len(set(phone_numbers)):
            raise serializers.ValidationError("Duplicate phone numbers in parent list")
        
        # Check if phone numbers already exist for different users
        from apps.accounts.models import User
        for parent_data in value:
            phone = parent_data['phone_number']
            existing_user = User.objects.filter(phone=phone).first()
            if existing_user:
                # Phone exists - this is okay, we'll link to existing user
                # Store the existing user for later use
                parent_data['_existing_user'] = existing_user
        
        return value
    
    def validate_students(self, value):
        """Validate students data."""
        if not value:
            raise serializers.ValidationError("At least one student is required")
        return value
    
    def validate(self, data):
        """Cross-field validation."""
        school = data['school']
        students = data['students']
        
        # Check for duplicate admission numbers in this request
        admission_numbers = [s['admission_number'] for s in students]
        if len(admission_numbers) != len(set(admission_numbers)):
            raise serializers.ValidationError({"students": "Duplicate admission numbers"})
        
        # Check if admission numbers already exist in this school
        for student_data in students:
            if Student.objects.filter(
                school=school,
                admission_number=student_data['admission_number']
            ).exists():
                raise serializers.ValidationError({
                    "students": f"Admission number {student_data['admission_number']} already exists"
                })
        
        return data
    
    def create(self, validated_data):
        """Create students and link parents in a transaction."""
        from django.db import transaction
        from apps.accounts.models import User, UserRole, SchoolMembership
        
        school = validated_data['school']
        parents_data = validated_data['parents']
        students_data = validated_data['students']
        
        created_students = []
        created_users = []
        
        with transaction.atomic():
            # Step 1: Create or get parent User accounts
            parent_users = []
            for parent_data in parents_data:
                phone = parent_data['phone_number']
                full_name = parent_data['full_name']
                
                # Check if we already found an existing user during validation
                existing_user = parent_data.get('_existing_user')
                
                if existing_user:
                    user = existing_user
                    created = False
                else:
                    # Create new user
                    name_parts = full_name.split(' ', 1)
                    first_name = name_parts[0]
                    last_name = name_parts[1] if len(name_parts) > 1 else ''
                    
                    user, created = User.objects.get_or_create(
                        phone=phone,
                        defaults={
                            'first_name': first_name,
                            'last_name': last_name,
                            'role': UserRole.PARENT,
                        }
                    )
                
                # Create school membership if needed
                SchoolMembership.objects.get_or_create(
                    user=user,
                    school=school,
                    defaults={'role': UserRole.PARENT}
                )
                
                parent_users.append({
                    'user': user,
                    'relation': parent_data['relation'],
                    'is_primary': parent_data.get('is_primary', False),
                    'created': created
                })
                
                if created:
                    created_users.append(user)
            
            # Step 2: Create Student records
            for student_data in students_data:
                # Handle route UUID - convert to route_id for ForeignKey
                route_uuid = student_data.pop('route', None)
                if route_uuid:
                    student_data['route_id'] = route_uuid
                
                student = Student.objects.create(
                    school=school,
                    **student_data
                )
                created_students.append(student)
            
            # Step 3: Create Parent relationships (link all parents to all students)
            for student in created_students:
                for parent_info in parent_users:
                    Parent.objects.create(
                        user=parent_info['user'],
                        student=student,
                        relation=parent_info['relation'],
                        is_primary=parent_info['is_primary']
                    )
        
        return {
            'students': created_students,
            'parent_users': [p['user'] for p in parent_users],
            'created_users': created_users,
        }
