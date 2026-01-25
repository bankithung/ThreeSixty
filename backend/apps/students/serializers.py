"""
Serializers for students app - Comprehensive Admission System.
"""
from rest_framework import serializers
from .models import (
    Student, Parent, FaceEncoding, 
    StudentHealth, AuthorizedPickup, StudentDocument,
    BLOOD_GROUP_CHOICES, SOCIAL_CATEGORY_CHOICES, RELIGION_CHOICES,
    DISABILITY_TYPE_CHOICES, BOARD_CHOICES, MEDIUM_CHOICES,
    STUDENT_CATEGORY_CHOICES, TRANSPORT_MODE_CHOICES, DOCUMENT_TYPE_CHOICES
)
from apps.accounts.serializers import UserSerializer


class StudentHealthSerializer(serializers.ModelSerializer):
    """Serializer for StudentHealth model."""
    
    class Meta:
        model = StudentHealth
        fields = [
            'id', 'student',
            # Chronic conditions
            'has_asthma', 'asthma_action_plan',
            'has_diabetes', 'diabetes_protocol',
            'has_epilepsy', 'epilepsy_protocol',
            'other_conditions',
            # Allergies
            'allergies_dietary', 'allergies_environmental', 'allergies_medicinal',
            # Vaccinations
            'vaccine_bcg_date', 'vaccine_dpt_date', 'vaccine_polio_date',
            'vaccine_mmr_date', 'vaccine_hepatitis_b_date', 'vaccine_varicella_date',
            # Physical impairments
            'wears_glasses', 'uses_hearing_aid', 'mobility_aid',
            # Emergency
            'doctor_name', 'doctor_phone', 'hospital_preference',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AuthorizedPickupSerializer(serializers.ModelSerializer):
    """Serializer for AuthorizedPickup model."""
    
    class Meta:
        model = AuthorizedPickup
        fields = [
            'id', 'student', 'name', 'relationship', 'phone',
            'photo', 'secret_password', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class StudentDocumentSerializer(serializers.ModelSerializer):
    """Serializer for StudentDocument model."""
    document_type_display = serializers.CharField(
        source='get_document_type_display', read_only=True
    )
    verified_by_name = serializers.CharField(
        source='verified_by.full_name', read_only=True
    )
    
    class Meta:
        model = StudentDocument
        fields = [
            'id', 'student', 'document_type', 'document_type_display',
            'file', 'original_filename', 'file_size',
            'is_verified', 'verified_by', 'verified_by_name', 'verified_at',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'file_size', 'verified_by', 'verified_at', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """Set file size on create."""
        file = validated_data.get('file')
        if file:
            validated_data['file_size'] = file.size
            validated_data['original_filename'] = file.name
        return super().create(validated_data)


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
    age = serializers.SerializerMethodField()
    
    class Meta:
        model = Student
        fields = [
            'id', 'admission_number', 'first_name', 'last_name', 'full_name', 
            'grade', 'section', 'photo', 'route', 'route_name', 'is_active', 'has_face',
            'school', 'pickup_address', 'pickup_latitude', 'pickup_longitude',
            'gender', 'age'
        ]
    
    def get_age(self, obj):
        import datetime
        if not obj.date_of_birth:
            return None
        today = datetime.date.today()
        return today.year - obj.date_of_birth.year - ((today.month, today.day) < (obj.date_of_birth.month, obj.date_of_birth.day))
    
    def get_has_face(self, obj):
        """Check if student has face encoding."""
        return obj.face_encodings.exists()


class StudentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating students with comprehensive nested data support."""
    # Nested write-only fields
    health = StudentHealthSerializer(write_only=True, required=False)
    parents = serializers.ListField(child=serializers.DictField(), write_only=True, required=False)
    
    # Legacy fields (kept for backward compatibility, but 'parents' list is preferred)
    parent_phone = serializers.CharField(max_length=20, write_only=True, required=False)
    parent_relation = serializers.CharField(max_length=20, write_only=True, required=False)
    
    class Meta:
        model = Student
        fields = [
            'school', 'admission_number', 'first_name', 'middle_name', 'last_name',
            'date_of_birth', 'birth_place', 'gender', 'blood_group',
            'grade', 'section', 'photo',
            # Address
            'current_house_number', 'current_building_name', 'current_street', 'current_locality',
            'current_city', 'current_district', 'current_state', 'current_pincode',
            'permanent_house_number', 'permanent_building_name', 'permanent_street', 'permanent_locality',
            'permanent_city', 'permanent_district', 'permanent_state', 'permanent_pincode',
            'same_as_current', 'area_classification',
            # Transport
            'pickup_address', 'pickup_latitude', 'pickup_longitude',
            'drop_address', 'drop_latitude', 'drop_longitude',
            'route', 'stop', 'transport_mode', 'transport_opted',
            # Demographics
            'religion', 'nationality', 'mother_tongue', 'social_category', 'aadhar_number',
            # Socio-economic
            'bpl_status', 'bpl_card_number', 'ews_status', 'ews_certificate_number',
            'is_cwsn', 'disability_type',
            # Academic
            'previous_school_name', 'previous_school_city', 'previous_board', 'previous_medium',
            'last_class_studied', 'last_class_result', 'tc_number', 'tc_date', 'has_tc',
            'third_language', 'skill_subjects',
            # Financial
            'student_category', 'has_sibling_discount', 'sibling_admission_number', 'is_staff_ward',
            'scholarship_type', 'is_rte_quota',
            'bank_account_number', 'bank_account_holder', 'bank_name', 'bank_branch', 'bank_ifsc', 'is_aadhar_seeded',
            # International
            'is_international', 'passport_number', 'passport_country', 'passport_issue_date', 'passport_expiry_date',
            'visa_type', 'is_oci', 'oci_number', 'frro_number', 'arrival_date',
            # Consents
            'consent_website_media', 'consent_yearbook_media', 'consent_social_media',
            'consent_acceptable_use', 'consent_data_processing', 'consent_third_party_sharing',
            'consent_field_trips', 'consent_emergency_medical',
            # Legacy & Extra
            'parent_phone', 'parent_relation', 'parents', 'health'
        ]
    
    def create(self, validated_data):
        """Create student with comprehensive nested data."""
        from apps.accounts.models import User, UserRole, SchoolMembership, ParentProfile
        from core.utils import format_phone_number
        
        # Extract nested data
        health_data = validated_data.pop('health', None)
        parents_data = validated_data.pop('parents', [])
        
        # Handle legacy single parent fields if parents list is empty
        parent_phone = validated_data.pop('parent_phone', None)
        parent_relation = validated_data.pop('parent_relation', 'guardian')
        
        if not parents_data and parent_phone:
            parents_data = [{
                'phone': parent_phone,
                'relation': parent_relation,
                'is_primary': True,
                'name': 'Parent' # Fallback
            }]

        # Create student (standard fields)
        student = Student.objects.create(**validated_data)
        
        # Create health record
        if health_data:
            StudentHealth.objects.create(student=student, **health_data)
            
        # Create parents
        for p_data in parents_data:
            # Handle different field names from frontend vs helper
            phone = p_data.get('phone') or p_data.get('phone_number')
            if not phone: continue
            
            phone = format_phone_number(phone)
            full_name = p_data.get('name') or p_data.get('full_name') or 'Parent'
            
            # Get or create User
            name_parts = full_name.split(' ', 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ''
            
            user, created = User.objects.get_or_create(
                phone=phone,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'email': p_data.get('email'),
                    'role': UserRole.PARENT
                }
            )
            
            if created:
                # Create detailed profile for new user
                ParentProfile.objects.create(
                    user=user,
                    occupation=p_data.get('occupation', ''),
                    designation=p_data.get('designation', ''),
                    organization=p_data.get('organization', ''),
                    annual_income=p_data.get('annual_income'),
                    education_qualification=p_data.get('education_qualification', ''),
                    government_id_type=p_data.get('government_id_type', ''),
                    government_id_number=p_data.get('government_id_number', ''),
                    is_alumni=p_data.get('is_alumni', False),
                    alumni_year=p_data.get('alumni_year'),
                    alumni_house=p_data.get('alumni_house'),
                )
                SchoolMembership.objects.create(user=user, school=student.school, role=UserRole.PARENT)
            else:
                # Update existing user profile if needed
                ParentProfile.objects.update_or_create(
                    user=user,
                    defaults={
                        'occupation': p_data.get('occupation', ''),
                        'designation': p_data.get('designation', ''),
                        'organization': p_data.get('organization', ''),
                        'annual_income': p_data.get('annual_income'),
                        'education_qualification': p_data.get('education_qualification', ''),
                        'government_id_type': p_data.get('government_id_type', ''),
                        'government_id_number': p_data.get('government_id_number', ''),
                        'is_alumni': p_data.get('is_alumni', False),
                        'alumni_year': p_data.get('alumni_year'),
                        'alumni_house': p_data.get('alumni_house'),
                    }
                )
                # Ensure school membership exists
                SchoolMembership.objects.get_or_create(user=user, school=student.school, defaults={'role': UserRole.PARENT})
            
            # Create Link
            Parent.objects.create(
                user=user,
                student=student,
                relation=p_data.get('relation', 'guardian'),
                is_primary=p_data.get('is_primary', False),
                is_custodial_parent=p_data.get('is_custodial_parent', True),
                has_legal_restraining_order=p_data.get('has_legal_restraining_order', False),
                is_primary_payer=p_data.get('is_primary_payer', False),
                is_local_guardian=p_data.get('is_local_guardian', False),
                lg_authorization_level=p_data.get('lg_authorization_level', ''),
                lg_visiting_rights=p_data.get('lg_visiting_rights', ''),
                lg_proximity_km=p_data.get('lg_proximity_km'),
                lg_address=p_data.get('lg_address', ''),
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
    stop_name = serializers.CharField(source='stop.name', read_only=True)
    school_latitude = serializers.DecimalField(source='school.latitude', max_digits=10, decimal_places=7, read_only=True)
    school_longitude = serializers.DecimalField(source='school.longitude', max_digits=10, decimal_places=7, read_only=True)
    current_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Student
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'grade', 'section',
            'photo', 'school_name', 'route_name', 'stop_name', 'current_status',
            'pickup_latitude', 'pickup_longitude',
            'school_latitude', 'school_longitude'
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


# ========== NEW SERIALIZERS FOR COMPREHENSIVE ADMISSION ==========



class ComprehensiveStudentSerializer(serializers.ModelSerializer):
    """Full serializer for Student model with all comprehensive fields."""
    full_name = serializers.ReadOnlyField()
    current_address_full = serializers.ReadOnlyField()
    pickup_location = serializers.ReadOnlyField()
    drop_location = serializers.ReadOnlyField()
    
    # Related data
    parents = ParentSerializer(many=True, read_only=True)
    health = StudentHealthSerializer(read_only=True)
    authorized_pickups = AuthorizedPickupSerializer(many=True, read_only=True)
    documents = StudentDocumentSerializer(many=True, read_only=True)
    face_count = serializers.SerializerMethodField()
    
    # Related names
    route_name = serializers.CharField(source='route.name', read_only=True)
    stop_name = serializers.CharField(source='stop.name', read_only=True)
    school_name = serializers.CharField(source='school.name', read_only=True)
    
    class Meta:
        model = Student
        fields = [
            # Core
            'id', 'school', 'school_name',
            # Section 1: Identity
            'admission_number', 'first_name', 'middle_name', 'last_name', 'full_name',
            'date_of_birth', 'birth_place', 'gender', 'blood_group',
            'photo',
            # Demographics
            'religion', 'nationality', 'mother_tongue', 'social_category', 'aadhar_number',
            # Socio-economic
            'bpl_status', 'bpl_card_number', 'ews_status', 'ews_certificate_number',
            'is_cwsn', 'disability_type',
            # Section 3: Address
            'current_house_number', 'current_building_name', 'current_street',
            'current_locality', 'current_city', 'current_district', 
            'current_state', 'current_pincode', 'current_address_full',
            'same_as_current',
            'permanent_house_number', 'permanent_building_name', 'permanent_street',
            'permanent_locality', 'permanent_city', 'permanent_district',
            'permanent_state', 'permanent_pincode',
            'area_classification',
            # Section 4: Academic
            'grade', 'section',
            'previous_school_name', 'previous_school_city', 'previous_board',
            'previous_medium', 'last_class_studied', 'last_class_result',
            'has_tc', 'tc_number', 'tc_date',
            'third_language', 'skill_subjects',
            # Section 6: Transport
            'transport_opted', 'transport_mode',
            'pickup_address', 'pickup_latitude', 'pickup_longitude', 'pickup_location',
            'drop_address', 'drop_latitude', 'drop_longitude', 'drop_location',
            'route', 'route_name', 'stop', 'stop_name',
            'indemnity_bond_signed', 'behavior_contract_signed',
            # Section 7: Financial
            'student_category',
            'has_sibling_discount', 'sibling_admission_number',
            'is_staff_ward', 'scholarship_type', 'is_rte_quota',
            'bank_account_number', 'bank_account_holder', 'bank_name',
            'bank_branch', 'bank_ifsc', 'is_aadhar_seeded',
            # Section 8: International
            'is_international', 'passport_number', 'passport_country',
            'passport_issue_date', 'passport_expiry_date',
            'visa_type', 'is_oci', 'oci_number', 'frro_number', 'arrival_date',
            # Section 9: Consents
            'consent_website_media', 'consent_yearbook_media', 'consent_social_media',
            'consent_acceptable_use', 'consent_data_processing',
            'consent_third_party_sharing', 'consent_field_trips', 'consent_emergency_medical',
            # Status
            'is_active', 'admission_date',
            # Related
            'parents', 'health', 'authorized_pickups', 'documents', 'face_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_face_count(self, obj):
        return obj.face_encodings.count()


class ComprehensiveParentInputSerializer(serializers.Serializer):
    """Input serializer for parent during comprehensive admission."""
    full_name = serializers.CharField(max_length=200)
    phone_number = serializers.CharField(max_length=20)
    email = serializers.EmailField(required=False, allow_blank=True)
    relation = serializers.ChoiceField(choices=Parent.RELATION_CHOICES)
    is_primary = serializers.BooleanField(default=False)
    
    # Extended fields (ParentProfile)
    occupation = serializers.CharField(max_length=100, required=False, allow_blank=True)
    designation = serializers.CharField(max_length=100, required=False, allow_blank=True)
    organization = serializers.CharField(max_length=200, required=False, allow_blank=True)
    annual_income = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    education_qualification = serializers.CharField(max_length=100, required=False, allow_blank=True)
    government_id_type = serializers.CharField(max_length=30, required=False, allow_blank=True)
    government_id_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    
    # Custodial details
    is_custodial_parent = serializers.BooleanField(default=True)
    has_legal_restraining_order = serializers.BooleanField(default=False)
    is_primary_payer = serializers.BooleanField(default=False)
    
    # Local Guardian
    is_local_guardian = serializers.BooleanField(default=False)
    lg_authorization_level = serializers.CharField(max_length=50, required=False, allow_blank=True)
    lg_visiting_rights = serializers.CharField(max_length=50, required=False, allow_blank=True)
    lg_proximity_km = serializers.IntegerField(required=False, allow_null=True)
    lg_address = serializers.CharField(required=False, allow_blank=True)
    
    def validate_phone_number(self, value):
        from core.utils import format_phone_number
        return format_phone_number(value)


class ComprehensiveStudentInputSerializer(serializers.Serializer):
    """Input serializer for student during comprehensive admission - all 100+ fields."""
    # Section 1: Core Identity
    admission_number = serializers.CharField(max_length=50)
    first_name = serializers.CharField(max_length=100)
    middle_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    birth_place = serializers.CharField(max_length=100, required=False, allow_blank=True)
    gender = serializers.ChoiceField(
        choices=[('male', 'Male'), ('female', 'Female'), ('transgender', 'Transgender')],
        required=False, allow_blank=True
    )
    blood_group = serializers.ChoiceField(choices=BLOOD_GROUP_CHOICES, required=False, allow_blank=True)
    
    # Demographics
    religion = serializers.ChoiceField(choices=RELIGION_CHOICES, required=False, allow_blank=True)
    nationality = serializers.CharField(max_length=50, required=False, default='Indian')
    mother_tongue = serializers.CharField(max_length=50, required=False, allow_blank=True)
    social_category = serializers.ChoiceField(choices=SOCIAL_CATEGORY_CHOICES, required=False, allow_blank=True)
    aadhar_number = serializers.CharField(max_length=12, required=False, allow_blank=True)
    
    # Socio-economic
    bpl_status = serializers.BooleanField(default=False)
    bpl_card_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    ews_status = serializers.BooleanField(default=False)
    ews_certificate_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    is_cwsn = serializers.BooleanField(default=False)
    disability_type = serializers.ChoiceField(choices=DISABILITY_TYPE_CHOICES, required=False, allow_blank=True)
    
    # Academic
    grade = serializers.CharField(max_length=20)
    section = serializers.CharField(max_length=10, required=False, allow_blank=True)
    
    # Academic History
    previous_school_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    previous_school_city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    previous_board = serializers.ChoiceField(choices=BOARD_CHOICES, required=False, allow_blank=True)
    previous_medium = serializers.ChoiceField(choices=MEDIUM_CHOICES, required=False, allow_blank=True)
    last_class_studied = serializers.CharField(max_length=20, required=False, allow_blank=True)
    last_class_result = serializers.CharField(max_length=30, required=False, allow_blank=True)
    has_tc = serializers.BooleanField(default=True)
    tc_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    tc_date = serializers.DateField(required=False, allow_null=True)
    third_language = serializers.CharField(max_length=50, required=False, allow_blank=True)
    skill_subjects = serializers.JSONField(required=False, default=list)
    
    # Address - Current
    current_house_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    current_building_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    current_street = serializers.CharField(max_length=200, required=False, allow_blank=True)
    current_locality = serializers.CharField(max_length=100, required=False, allow_blank=True)
    current_city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    current_district = serializers.CharField(max_length=100, required=False, allow_blank=True)
    current_state = serializers.CharField(max_length=100, required=False, allow_blank=True)
    current_pincode = serializers.CharField(max_length=10, required=False, allow_blank=True)
    
    # Address - Permanent
    same_as_current = serializers.BooleanField(default=True)
    permanent_house_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    permanent_building_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    permanent_street = serializers.CharField(max_length=200, required=False, allow_blank=True)
    permanent_locality = serializers.CharField(max_length=100, required=False, allow_blank=True)
    permanent_city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    permanent_district = serializers.CharField(max_length=100, required=False, allow_blank=True)
    permanent_state = serializers.CharField(max_length=100, required=False, allow_blank=True)
    permanent_pincode = serializers.CharField(max_length=10, required=False, allow_blank=True)
    area_classification = serializers.CharField(max_length=10, required=False, allow_blank=True)
    
    # Transport
    transport_opted = serializers.BooleanField(default=False)
    transport_mode = serializers.ChoiceField(choices=TRANSPORT_MODE_CHOICES, required=False, allow_blank=True)
    pickup_address = serializers.CharField(required=False, allow_blank=True)
    pickup_latitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False, allow_null=True)
    pickup_longitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False, allow_null=True)
    drop_address = serializers.CharField(required=False, allow_blank=True)
    drop_latitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False, allow_null=True)
    drop_longitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False, allow_null=True)
    route = serializers.UUIDField(required=False, allow_null=True)
    indemnity_bond_signed = serializers.BooleanField(default=False)
    behavior_contract_signed = serializers.BooleanField(default=False)
    
    # Financial
    student_category = serializers.ChoiceField(choices=STUDENT_CATEGORY_CHOICES, default='day_scholar')
    has_sibling_discount = serializers.BooleanField(default=False)
    sibling_admission_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    is_staff_ward = serializers.BooleanField(default=False)
    scholarship_type = serializers.CharField(max_length=50, required=False, allow_blank=True)
    is_rte_quota = serializers.BooleanField(default=False)
    bank_account_number = serializers.CharField(max_length=30, required=False, allow_blank=True)
    bank_account_holder = serializers.CharField(max_length=100, required=False, allow_blank=True)
    bank_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    bank_branch = serializers.CharField(max_length=100, required=False, allow_blank=True)
    bank_ifsc = serializers.CharField(max_length=15, required=False, allow_blank=True)
    is_aadhar_seeded = serializers.BooleanField(default=False)
    
    # International
    is_international = serializers.BooleanField(default=False)
    passport_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    passport_country = serializers.CharField(max_length=50, required=False, allow_blank=True)
    passport_issue_date = serializers.DateField(required=False, allow_null=True)
    passport_expiry_date = serializers.DateField(required=False, allow_null=True)
    visa_type = serializers.CharField(max_length=30, required=False, allow_blank=True)
    is_oci = serializers.BooleanField(default=False)
    oci_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    frro_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    arrival_date = serializers.DateField(required=False, allow_null=True)
    
    # Consents
    consent_website_media = serializers.BooleanField(default=False)
    consent_yearbook_media = serializers.BooleanField(default=False)
    consent_social_media = serializers.BooleanField(default=False)
    consent_acceptable_use = serializers.BooleanField(default=False)
    consent_data_processing = serializers.BooleanField(default=False)
    consent_third_party_sharing = serializers.BooleanField(default=False)
    consent_field_trips = serializers.BooleanField(default=False)
    consent_emergency_medical = serializers.BooleanField(default=False)
    
    # Health (nested for creation)
    health = serializers.JSONField(required=False, default=dict)
    
    # Authorized pickups (nested for creation)
    authorized_pickups = serializers.JSONField(required=False, default=list)


class ComprehensiveAdmissionSerializer(serializers.Serializer):
    """
    Full comprehensive admission serializer.
    Parent-first workflow: creates parents, then students, then links them.
    """
    school = serializers.UUIDField()
    parents = ComprehensiveParentInputSerializer(many=True)
    students = ComprehensiveStudentInputSerializer(many=True)
    
    def validate_school(self, value):
        from apps.schools.models import School
        try:
            return School.objects.get(id=value)
        except School.DoesNotExist:
            raise serializers.ValidationError("School not found")
    
    def validate_parents(self, value):
        if not value:
            raise serializers.ValidationError("At least one parent is required")
        
        phone_numbers = [p['phone_number'] for p in value]
        if len(phone_numbers) != len(set(phone_numbers)):
            raise serializers.ValidationError("Duplicate phone numbers in parent list")
        
        return value
    
    def validate_students(self, value):
        if not value:
            raise serializers.ValidationError("At least one student is required")
        return value
    
    def validate(self, data):
        school = data['school']
        students = data['students']
        
        admission_numbers = [s['admission_number'] for s in students]
        if len(admission_numbers) != len(set(admission_numbers)):
            raise serializers.ValidationError({"students": "Duplicate admission numbers"})
        
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
        from django.db import transaction
        from apps.accounts.models import User, UserRole, SchoolMembership, ParentProfile
        
        school = validated_data['school']
        parents_data = validated_data['parents']
        students_data = validated_data['students']
        
        created_students = []
        created_users = []
        
        with transaction.atomic():
            # Step 1: Create parent users and profiles
            parent_users = []
            for parent_data in parents_data:
                phone = parent_data['phone_number']
                full_name = parent_data['full_name']
                
                # Check for existing user
                existing_user = User.objects.filter(phone=phone).first()
                
                if existing_user:
                    user = existing_user
                    created = False
                else:
                    name_parts = full_name.split(' ', 1)
                    first_name = name_parts[0]
                    last_name = name_parts[1] if len(name_parts) > 1 else ''
                    
                    user = User.objects.create(
                        phone=phone,
                        email=parent_data.get('email') or None,
                        first_name=first_name,
                        last_name=last_name,
                        role=UserRole.PARENT,
                    )
                    created = True
                    created_users.append(user)
                    
                    # Create ParentProfile
                    ParentProfile.objects.create(
                        user=user,
                        occupation=parent_data.get('occupation', ''),
                        designation=parent_data.get('designation', ''),
                        organization=parent_data.get('organization', ''),
                        annual_income=parent_data.get('annual_income'),
                        education_qualification=parent_data.get('education_qualification', ''),
                        government_id_type=parent_data.get('government_id_type', ''),
                        government_id_number=parent_data.get('government_id_number', ''),
                    )
                
                # Create school membership
                SchoolMembership.objects.get_or_create(
                    user=user,
                    school=school,
                    defaults={'role': UserRole.PARENT}
                )
                
                parent_users.append({
                    'user': user,
                    'relation': parent_data['relation'],
                    'is_primary': parent_data.get('is_primary', False),
                    'is_custodial_parent': parent_data.get('is_custodial_parent', True),
                    'has_legal_restraining_order': parent_data.get('has_legal_restraining_order', False),
                    'is_primary_payer': parent_data.get('is_primary_payer', False),
                    'is_local_guardian': parent_data.get('is_local_guardian', False),
                    'lg_authorization_level': parent_data.get('lg_authorization_level', ''),
                    'lg_visiting_rights': parent_data.get('lg_visiting_rights', ''),
                    'lg_proximity_km': parent_data.get('lg_proximity_km'),
                    'lg_address': parent_data.get('lg_address', ''),
                })
            
            # Step 2: Create students
            for student_data in students_data:
                health_data = student_data.pop('health', {})
                authorized_pickups_data = student_data.pop('authorized_pickups', [])
                route_uuid = student_data.pop('route', None)
                
                if route_uuid:
                    student_data['route_id'] = route_uuid
                
                student = Student.objects.create(
                    school=school,
                    **student_data
                )
                created_students.append(student)
                
                # Create health record
                if health_data:
                    StudentHealth.objects.create(student=student, **health_data)
                
                # Create authorized pickups
                for pickup_data in authorized_pickups_data:
                    AuthorizedPickup.objects.create(student=student, **pickup_data)
            
            # Step 3: Link parents to students
            for student in created_students:
                for parent_info in parent_users:
                    Parent.objects.create(
                        user=parent_info['user'],
                        student=student,
                        relation=parent_info['relation'],
                        is_primary=parent_info['is_primary'],
                        is_custodial_parent=parent_info['is_custodial_parent'],
                        has_legal_restraining_order=parent_info['has_legal_restraining_order'],
                        is_primary_payer=parent_info['is_primary_payer'],
                        is_local_guardian=parent_info['is_local_guardian'],
                        lg_authorization_level=parent_info['lg_authorization_level'],
                        lg_visiting_rights=parent_info['lg_visiting_rights'],
                        lg_proximity_km=parent_info['lg_proximity_km'],
                        lg_address=parent_info['lg_address'],
                    )
        
        return {
            'students': created_students,
            'parent_users': [p['user'] for p in parent_users],
            'created_users': created_users,
        }

