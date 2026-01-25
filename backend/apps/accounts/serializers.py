"""
Serializers for user accounts and authentication.
"""
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.db import IntegrityError, transaction

from .models import User, OTP, SchoolMembership, UserRole
from core.utils import generate_otp, format_phone_number


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = [
            'id', 'phone', 'email', 'first_name', 'last_name',
            'full_name', 'avatar', 'role', 'is_active',
            'is_phone_verified', 'is_email_verified', 'created_at'
        ]
        read_only_fields = ['id', 'is_phone_verified', 'is_email_verified', 'created_at']


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile updates."""
    
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'avatar']


class SendOTPSerializer(serializers.Serializer):
    """Serializer for sending OTP."""
    phone = serializers.CharField(max_length=20)
    purpose = serializers.ChoiceField(
        choices=['login', 'register', 'reset'],
        default='login'
    )
    
    def validate_phone(self, value):
        """Format and validate phone number."""
        formatted = format_phone_number(value)
        if not formatted:
            raise serializers.ValidationError("Invalid phone number format.")
        return formatted
    
    def create(self, validated_data):
        """Create OTP and return it."""
        phone = validated_data['phone']
        purpose = validated_data['purpose']
        
        # Invalidate any existing OTPs for this phone
        OTP.objects.filter(phone=phone, is_verified=False).update(is_verified=True)
        
        # Generate new OTP
        otp_code = generate_otp()
        expires_at = timezone.now() + timedelta(minutes=settings.OTP_VALIDITY_MINUTES)
        
        otp = OTP.objects.create(
            phone=phone,
            otp=otp_code,
            purpose=purpose,
            expires_at=expires_at
        )
        
        return otp


class VerifyOTPSerializer(serializers.Serializer):
    """Serializer for verifying OTP and authenticating user."""
    phone = serializers.CharField(max_length=20)
    otp = serializers.CharField(max_length=10)
    fcm_token = serializers.CharField(max_length=500, required=False, allow_blank=True)
    device_type = serializers.ChoiceField(choices=['android', 'ios'], required=False)
    
    def validate_phone(self, value):
        """Format phone number."""
        formatted = format_phone_number(value)
        if not formatted:
            raise serializers.ValidationError("Invalid phone number format.")
        return formatted
    
    def validate(self, attrs):
        """Validate OTP."""
        phone = attrs['phone']
        otp_code = attrs['otp']
        
        try:
            otp = OTP.objects.filter(
                phone=phone,
                is_verified=False
            ).latest('created_at')
        except OTP.DoesNotExist:
            raise serializers.ValidationError({"otp": "No OTP found for this phone number."})
        
        # Check if OTP is expired
        if otp.is_expired:
            raise serializers.ValidationError({"otp": "OTP has expired. Please request a new one."})
        
        # Check max attempts
        if otp.attempts >= 3:
            raise serializers.ValidationError({"otp": "Too many attempts. Please request a new OTP."})
        
        # Verify OTP
        if otp.otp != otp_code:
            otp.increment_attempts()
            raise serializers.ValidationError({"otp": "Invalid OTP."})
        
        # Mark OTP as verified
        otp.is_verified = True
        otp.save(update_fields=['is_verified'])
        
        attrs['otp_instance'] = otp
        return attrs
    
    def create(self, validated_data):
        """Get or create user and return tokens."""
        phone = validated_data['phone']
        fcm_token = validated_data.get('fcm_token')
        device_type = validated_data.get('device_type')
        
        # Get or create user
        user, created = User.objects.get_or_create(
            phone=phone,
            defaults={
                'first_name': 'User',
                'is_phone_verified': True,
            }
        )
        
        if not created:
            user.is_phone_verified = True
        
        # Update FCM token if provided
        if fcm_token:
            user.fcm_token = fcm_token
        if device_type:
            user.device_type = device_type
        
        user.save()
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        return {
            'user': user,
            'is_new_user': created,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }


class AdminLoginSerializer(serializers.Serializer):
    """Serializer for admin email/password login."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        """Validate credentials."""
        email = attrs['email']
        password = attrs['password']
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "No user found with this email."})
        
        if not user.check_password(password):
            raise serializers.ValidationError({"password": "Incorrect password."})
        
        if not user.is_active:
            raise serializers.ValidationError({"email": "This account is deactivated."})
        
        # Check if user is staff/admin
        if user.role not in [UserRole.ROOT_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.OFFICE_STAFF]:
            raise serializers.ValidationError({"email": "This account cannot access the admin portal."})
        
        attrs['user'] = user
        return attrs
    
    def create(self, validated_data):
        """Return tokens for authenticated user."""
        user = validated_data['user']
        
        refresh = RefreshToken.for_user(user)
        
        return {
            'user': user,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }


class SchoolMembershipSerializer(serializers.ModelSerializer):
    """Serializer for school memberships."""
    user = UserSerializer(read_only=True)
    school_name = serializers.CharField(source='school.name', read_only=True)
    school_logo = serializers.ImageField(source='school.logo', read_only=True)
    # Flat user fields for convenient frontend access
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    avatar = serializers.ImageField(source='user.avatar', read_only=True)
    # Staff profile photo (if available)
    photo = serializers.SerializerMethodField()
    
    def get_photo(self, obj):
        """Get staff profile photo if available."""
        try:
            if hasattr(obj.user, 'staff_profile') and obj.user.staff_profile and obj.user.staff_profile.photo:
                photo_url = obj.user.staff_profile.photo.url
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(photo_url)
                return photo_url
        except (AttributeError, Exception):
            pass
        return None
    
    class Meta:
        model = SchoolMembership
        fields = [
            'id', 'user', 'school', 'school_name', 'school_logo', 'role', 'is_active', 'created_at',
            'first_name', 'last_name', 'full_name', 'phone', 'email', 'avatar', 'photo'
        ]
        read_only_fields = ['id', 'created_at']


class CreateStaffSerializer(serializers.Serializer):
    """Serializer for creating staff members with extended profile."""
    # Basic User fields
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False)
    role = serializers.ChoiceField(choices=UserRole.choices)
    school_id = serializers.UUIDField()
    
    # Extended Profile fields - Personal
    father_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    gender = serializers.CharField(max_length=10, required=False, allow_blank=True)
    dob = serializers.DateField(required=False, allow_null=True)
    marital_status = serializers.CharField(max_length=20, required=False, allow_blank=True)
    nationality = serializers.CharField(max_length=50, required=False, allow_blank=True)
    permanent_address = serializers.CharField(required=False, allow_blank=True)
    present_address = serializers.CharField(required=False, allow_blank=True)
    photo = serializers.ImageField(required=False, allow_null=True)
    
    # Emergency Contact
    emergency_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    emergency_relation = serializers.CharField(max_length=50, required=False, allow_blank=True)
    emergency_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    # Identification
    id_type = serializers.CharField(max_length=20, required=False, allow_blank=True)
    id_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    languages = serializers.CharField(max_length=200, required=False, allow_blank=True)
    id_proof_document = serializers.FileField(required=False, allow_null=True)
    address_proof_document = serializers.FileField(required=False, allow_null=True)
    education_certificate = serializers.FileField(required=False, allow_null=True)
    experience_certificate = serializers.FileField(required=False, allow_null=True)
    license_document = serializers.FileField(required=False, allow_null=True)
    medical_certificate = serializers.FileField(required=False, allow_null=True)
    police_verification_certificate = serializers.FileField(required=False, allow_null=True)
    criminal_record_certificate = serializers.FileField(required=False, allow_null=True)
    
    # Driving License (Driver)
    license_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    license_class = serializers.CharField(max_length=20, required=False, allow_blank=True)
    license_rta = serializers.CharField(max_length=100, required=False, allow_blank=True)
    license_issue = serializers.DateField(required=False, allow_null=True)
    license_expiry = serializers.DateField(required=False, allow_null=True)
    endorsements = serializers.CharField(max_length=200, required=False, allow_blank=True)
    
    # Conductor License
    conductor_license = serializers.CharField(max_length=50, required=False, allow_blank=True)
    license_authority = serializers.CharField(max_length=100, required=False, allow_blank=True)
    license_valid = serializers.DateField(required=False, allow_null=True)
    willing_get_license = serializers.BooleanField(required=False, default=False)
    
    # Experience
    experience_years = serializers.IntegerField(required=False, allow_null=True)
    education = serializers.CharField(max_length=200, required=False, allow_blank=True)
    prev_employment = serializers.CharField(required=False, allow_blank=True)
    training = serializers.CharField(max_length=300, required=False, allow_blank=True)
    
    # Health
    height = serializers.IntegerField(required=False, allow_null=True)
    weight = serializers.IntegerField(required=False, allow_null=True)
    vision = serializers.CharField(max_length=20, required=False, allow_blank=True)
    medical_history = serializers.CharField(required=False, allow_blank=True)
    fitness_confirmed = serializers.BooleanField(required=False, default=False)
    health_status = serializers.CharField(required=False, allow_blank=True)
    
    # Background
    police_verified = serializers.BooleanField(required=False, default=False)
    no_criminal_record = serializers.BooleanField(required=False, default=False)
    
    # Employment
    start_date = serializers.DateField(required=False, allow_null=True)
    working_hours = serializers.CharField(max_length=100, required=False, allow_blank=True)
    last_salary = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    expected_salary = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    fulltime = serializers.BooleanField(required=False, default=True)
    understand_duties = serializers.BooleanField(required=False, default=False)
    
    def validate(self, attrs):
        """Validate permissions and inputs."""
        user = self.context['request'].user
        
        # Verify school permission
        school_id = attrs.get('school_id')
        if school_id:
            if user.role != UserRole.ROOT_ADMIN:
                has_permission = SchoolMembership.objects.filter(
                    user=user,
                    school_id=school_id,
                    role=UserRole.SCHOOL_ADMIN,
                    is_active=True
                ).exists()
                
                if not has_permission:
                    raise serializers.ValidationError({"school_id": "You do not have permission to add staff to this school."})

        # Validate that phone or email is provided
        if not attrs.get('phone') and not attrs.get('email'):
            raise serializers.ValidationError("Either phone or email is required.")

        # Format phone number
        if attrs.get('phone'):
            try:
                attrs['phone'] = format_phone_number(attrs['phone'])
            except Exception as e:
                raise serializers.ValidationError({"phone": f"Invalid phone format: {str(e)}"})

        # Prevent hard 500s from unique constraints by validating upfront (after formatting phone)
        phone = attrs.get('phone')
        email = attrs.get('email')
        if phone and User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError({"phone": "A user with this phone number already exists."})
        if email and User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "A user with this email address already exists."})
        
        return attrs
    
    def create(self, validated_data):
        """Create user, school membership, and staff profile."""
        from apps.schools.models import School
        from .models import StaffProfile
        
        # Extract basic user fields
        school_id = validated_data.pop('school_id')
        role = validated_data.pop('role')
        password = validated_data.pop('password', None)
        
        user_fields = ['phone', 'email', 'first_name', 'last_name']
        user_data = {k: validated_data.pop(k) for k in user_fields if k in validated_data}
        
        # Get school
        try:
            school = School.objects.get(id=school_id)
        except School.DoesNotExist:
            raise serializers.ValidationError({"school_id": "School not found."})
        
        try:
            with transaction.atomic():
                # Create user
                user = User.objects.create_user(**user_data, password=password, role=role)
                
                # Create school membership
                SchoolMembership.objects.create(
                    user=user,
                    school=school,
                    role=role
                )
                
                # Create staff profile with extended data (for Driver/Conductor)
                if role in [UserRole.DRIVER, UserRole.CONDUCTOR] or validated_data:
                    profile_data = {
                        'user': user,
                'father_name': validated_data.get('father_name', ''),
                'gender': validated_data.get('gender', ''),
                'date_of_birth': validated_data.get('dob'),
                'marital_status': validated_data.get('marital_status', ''),
                'nationality': validated_data.get('nationality', 'Indian'),
                'permanent_address': validated_data.get('permanent_address', ''),
                'present_address': validated_data.get('present_address', ''),
                'emergency_contact_name': validated_data.get('emergency_name', ''),
                'emergency_contact_relation': validated_data.get('emergency_relation', ''),
                'emergency_contact_phone': validated_data.get('emergency_phone', ''),
                'id_type': validated_data.get('id_type', ''),
                'id_number': validated_data.get('id_number', ''),
                'languages_known': validated_data.get('languages', ''),
                'license_number': validated_data.get('license_number', ''),
                'license_class': validated_data.get('license_class', ''),
                'license_rta': validated_data.get('license_rta', ''),
                'license_issue_date': validated_data.get('license_issue'),
                'license_expiry_date': validated_data.get('license_expiry'),
                'license_endorsements': validated_data.get('endorsements', ''),
                'conductor_license_number': validated_data.get('conductor_license', ''),
                'conductor_license_authority': validated_data.get('license_authority', ''),
                'conductor_license_valid_until': validated_data.get('license_valid'),
                'willing_to_obtain_license': validated_data.get('willing_get_license', False),
                'experience_years': validated_data.get('experience_years'),
                'education': validated_data.get('education', ''),
                'previous_employment': validated_data.get('prev_employment', ''),
                'professional_training': validated_data.get('training', ''),
                'height_cm': validated_data.get('height'),
                'weight_kg': validated_data.get('weight'),
                'vision_status': validated_data.get('vision', ''),
                'medical_history': validated_data.get('medical_history', '') or validated_data.get('health_status', ''),
                'fitness_confirmed': validated_data.get('fitness_confirmed', False),
                'medical_certificate': validated_data.get('medical_certificate'),
                'police_verification_obtained': validated_data.get('police_verified', False),
                'police_verification_certificate': validated_data.get('police_verification_certificate'),
                'no_criminal_record': validated_data.get('no_criminal_record', False),
                'criminal_record_certificate': validated_data.get('criminal_record_certificate'),
                'available_start_date': validated_data.get('start_date'),
                'preferred_working_hours': validated_data.get('working_hours', ''),
                'last_drawn_salary': validated_data.get('last_salary'),
                'expected_salary': validated_data.get('expected_salary'),
                'willing_fulltime': validated_data.get('fulltime', True),
                'understands_duties': validated_data.get('understand_duties', False),
                'photo': validated_data.get('photo'),
                'id_proof_document': validated_data.get('id_proof_document'),
                'address_proof_document': validated_data.get('address_proof_document'),
                'education_certificate': validated_data.get('education_certificate'),
                'experience_certificate': validated_data.get('experience_certificate'),
                'license_document': validated_data.get('license_document'),
                'medical_certificate': validated_data.get('medical_certificate'),
                'police_verification_certificate': validated_data.get('police_verification_certificate'),
                'criminal_record_certificate': validated_data.get('criminal_record_certificate'),
                    }
                    # Remove None/empty values to use model defaults
                    profile_data = {k: v for k, v in profile_data.items() if v not in [None, '']}
                    profile_data['user'] = user  # Always include user
                    
                    StaffProfile.objects.create(**profile_data)
        except IntegrityError:
            # Handle any uniqueness collisions (email/phone, membership uniqueness, etc.)
            raise serializers.ValidationError("Unable to create staff user due to a conflicting record (duplicate email/phone or membership).")
        
        return user


class StaffProfileSerializer(serializers.ModelSerializer):
    """Serializer for StaffProfile model with all fields."""
    # Build absolute URLs for file fields
    photo_url = serializers.SerializerMethodField()
    medical_certificate_url = serializers.SerializerMethodField()
    police_verification_certificate_url = serializers.SerializerMethodField()
    criminal_record_certificate_url = serializers.SerializerMethodField()
    id_proof_document_url = serializers.SerializerMethodField()
    address_proof_document_url = serializers.SerializerMethodField()
    education_certificate_url = serializers.SerializerMethodField()
    experience_certificate_url = serializers.SerializerMethodField()
    license_document_url = serializers.SerializerMethodField()
    
    def _get_file_url(self, file_field):
        if file_field:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(file_field.url)
            return file_field.url
        return None
    
    def get_photo_url(self, obj):
        return self._get_file_url(obj.photo) if obj.photo else None
    
    def get_medical_certificate_url(self, obj):
        return self._get_file_url(obj.medical_certificate) if obj.medical_certificate else None
    
    def get_police_verification_certificate_url(self, obj):
        return self._get_file_url(obj.police_verification_certificate) if obj.police_verification_certificate else None
    
    def get_criminal_record_certificate_url(self, obj):
        return self._get_file_url(obj.criminal_record_certificate) if obj.criminal_record_certificate else None
    
    def get_id_proof_document_url(self, obj):
        return self._get_file_url(obj.id_proof_document) if obj.id_proof_document else None
    
    def get_address_proof_document_url(self, obj):
        return self._get_file_url(obj.address_proof_document) if obj.address_proof_document else None
    
    def get_education_certificate_url(self, obj):
        return self._get_file_url(obj.education_certificate) if obj.education_certificate else None
    
    def get_experience_certificate_url(self, obj):
        return self._get_file_url(obj.experience_certificate) if obj.experience_certificate else None
    
    def get_license_document_url(self, obj):
        return self._get_file_url(obj.license_document) if obj.license_document else None
    
    class Meta:
        from .models import StaffProfile
        model = StaffProfile
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class StaffDetailSerializer(serializers.ModelSerializer):
    """
    Comprehensive serializer for staff detail view.
    Returns all user data, staff profile, assigned buses, and students.
    """
    # User fields
    user = UserSerializer(read_only=True)
    school_name = serializers.CharField(source='school.name', read_only=True)
    school_logo = serializers.SerializerMethodField()
    
    # Flat user fields for convenience
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    
    # Full staff profile
    staff_profile = serializers.SerializerMethodField()
    
    # Assigned buses (for drivers/conductors)
    assigned_buses = serializers.SerializerMethodField()
    
    # Assigned students (students on their assigned bus routes)
    assigned_students = serializers.SerializerMethodField()
    
    # Photo URL
    photo = serializers.SerializerMethodField()
    
    def get_school_logo(self, obj):
        if obj.school and obj.school.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.school.logo.url)
            return obj.school.logo.url
        return None
    
    def get_photo(self, obj):
        """Get staff profile photo."""
        try:
            if hasattr(obj.user, 'staff_profile') and obj.user.staff_profile and obj.user.staff_profile.photo:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.user.staff_profile.photo.url)
                return obj.user.staff_profile.photo.url
        except (AttributeError, Exception):
            pass
        # Fallback to user avatar
        if obj.user.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.user.avatar.url)
            return obj.user.avatar.url
        return None
    
    def get_staff_profile(self, obj):
        """Get full staff profile data."""
        try:
            if hasattr(obj.user, 'staff_profile') and obj.user.staff_profile:
                return StaffProfileSerializer(obj.user.staff_profile, context=self.context).data
        except (AttributeError, Exception):
            pass
        return None
    
    def get_assigned_buses(self, obj):
        """Get buses assigned to this staff member."""
        from apps.transport.models import BusStaff
        
        if obj.role not in ['driver', 'conductor']:
            return []
        
        try:
            assignments = BusStaff.objects.filter(
                user=obj.user,
                is_active=True
            ).select_related('bus', 'bus__school')
            
            buses = []
            for assignment in assignments:
                bus = assignment.bus
                buses.append({
                    'id': str(bus.id),
                    'number': bus.number,
                    'registration': bus.registration_number,
                    'capacity': bus.capacity,
                    'make': bus.make,
                    'model': bus.model,
                    'role': assignment.role,
                    'is_active': bus.is_active,
                })
            return buses
        except Exception:
            return []
    
    def get_assigned_students(self, obj):
        """Get students assigned to buses this staff member operates."""
        from apps.transport.models import BusStaff
        from apps.students.models import Student
        
        if obj.role not in ['driver', 'conductor']:
            return []
        
        try:
            # Get all buses assigned to this staff
            bus_ids = BusStaff.objects.filter(
                user=obj.user,
                is_active=True
            ).values_list('bus_id', flat=True)
            
            # Get students assigned to these buses
            students = Student.objects.filter(
                assigned_bus_id__in=bus_ids,
                is_active=True
            ).select_related('school').order_by('first_name')[:50]  # Limit to 50
            
            result = []
            for student in students:
                result.append({
                    'id': str(student.id),
                    'first_name': student.first_name,
                    'last_name': student.last_name,
                    'full_name': f"{student.first_name} {student.last_name}".strip(),
                    'class_name': getattr(student, 'class_name', '') or getattr(student, 'grade', ''),
                    'section': getattr(student, 'section', ''),
                    'photo': None,  # Could add photo URL if needed
                    'roll_number': getattr(student, 'roll_number', ''),
                })
            return result
        except Exception:
            return []
    
    class Meta:
        model = SchoolMembership
        fields = [
            'id', 'user', 'school', 'school_name', 'school_logo', 'role', 'is_active', 'created_at',
            'first_name', 'last_name', 'full_name', 'phone', 'email', 'photo',
            'staff_profile', 'assigned_buses', 'assigned_students',
        ]
        read_only_fields = ['id', 'created_at']



class UpdateStaffSerializer(serializers.ModelSerializer):
    """
    Serializer for updating staff members.
    Handles both SchoolMembership and related StaffProfile updates.
    """
    # Fields that can be updated directly on User
    first_name = serializers.CharField(max_length=100, required=False)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    
    # StaffProfile fields
    father_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    gender = serializers.CharField(max_length=10, required=False, allow_blank=True)
    dob = serializers.DateField(required=False, allow_null=True)
    marital_status = serializers.CharField(max_length=20, required=False, allow_blank=True)
    nationality = serializers.CharField(max_length=50, required=False, allow_blank=True)
    permanent_address = serializers.CharField(required=False, allow_blank=True)
    present_address = serializers.CharField(required=False, allow_blank=True)
    photo = serializers.ImageField(required=False, allow_null=True)
    
    # Emergency Contact
    emergency_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    emergency_relation = serializers.CharField(max_length=50, required=False, allow_blank=True)
    emergency_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    # Identification
    id_type = serializers.CharField(max_length=20, required=False, allow_blank=True)
    id_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    id_proof_document = serializers.FileField(required=False, allow_null=True)
    address_proof_document = serializers.FileField(required=False, allow_null=True)
    education_certificate = serializers.FileField(required=False, allow_null=True)
    experience_certificate = serializers.FileField(required=False, allow_null=True)
    license_document = serializers.FileField(required=False, allow_null=True)
    medical_certificate = serializers.FileField(required=False, allow_null=True)
    police_verification_certificate = serializers.FileField(required=False, allow_null=True)
    criminal_record_certificate = serializers.FileField(required=False, allow_null=True)
    
    # Driver license fields
    license_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    license_class = serializers.CharField(max_length=20, required=False, allow_blank=True)
    license_rta = serializers.CharField(max_length=100, required=False, allow_blank=True)
    license_issue = serializers.DateField(required=False, allow_null=True)
    license_expiry = serializers.DateField(required=False, allow_null=True)
    
    # Employment
    experience_years = serializers.IntegerField(required=False, allow_null=True)
    working_hours = serializers.CharField(max_length=100, required=False, allow_blank=True)
    start_date = serializers.DateField(required=False, allow_null=True)
    last_salary = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    expected_salary = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    fulltime = serializers.BooleanField(required=False, default=True)
    
    # Health & Verification
    height = serializers.IntegerField(required=False, allow_null=True)
    weight = serializers.IntegerField(required=False, allow_null=True)
    vision = serializers.CharField(max_length=20, required=False, allow_blank=True)
    fitness_confirmed = serializers.BooleanField(required=False)
    police_verified = serializers.BooleanField(required=False)
    no_criminal_record = serializers.BooleanField(required=False)
    
    class Meta:
        model = SchoolMembership
        fields = [
            'id', 'role', 'is_active',
            # User fields
            'first_name', 'last_name', 'phone', 'email',
            # StaffProfile fields (included for handling)
            'father_name', 'gender', 'dob', 'marital_status', 'nationality',
            'permanent_address', 'present_address', 'photo',
            'emergency_name', 'emergency_relation', 'emergency_phone',
            'id_type', 'id_number',
            'license_number', 'license_class', 'license_rta', 'license_issue', 'license_expiry',
            'experience_years', 'working_hours', 'start_date', 'last_salary', 'expected_salary', 'fulltime',
            'height', 'weight', 'vision', 'fitness_confirmed', 'police_verified', 'no_criminal_record',
            # Documents
            'id_proof_document', 'address_proof_document',
            'education_certificate', 'experience_certificate',
            'license_document', 'medical_certificate',
            'police_verification_certificate', 'criminal_record_certificate',
        ]
        read_only_fields = ['id']
    
    def update(self, instance: SchoolMembership, validated_data):
        """Update membership, user, and staff profile."""
        from .models import StaffProfile
        
        # Extract user fields
        user_fields = {
            'first_name': validated_data.pop('first_name', None),
            'last_name': validated_data.pop('last_name', None),
            'phone': validated_data.pop('phone', None),
            'email': validated_data.pop('email', None),
        }
        user_fields = {k: v for k, v in user_fields.items() if v is not None}
        
        # Extract staff profile fields
        profile_field_mapping = {
            'father_name': 'father_name',
            'gender': 'gender',
            'dob': 'date_of_birth',
            'marital_status': 'marital_status',
            'nationality': 'nationality',
            'permanent_address': 'permanent_address',
            'present_address': 'present_address',
            'photo': 'photo',
            'emergency_name': 'emergency_contact_name',
            'emergency_relation': 'emergency_contact_relation',
            'emergency_phone': 'emergency_contact_phone',
            'id_type': 'id_type',
            'id_number': 'id_number',
            'license_number': 'license_number',
            'license_class': 'license_class',
            'license_rta': 'license_rta',
            'license_issue': 'license_issue_date',
            'license_expiry': 'license_expiry_date',
            'experience_years': 'experience_years',
            'working_hours': 'preferred_working_hours',
            'start_date': 'available_start_date',
            'last_salary': 'last_drawn_salary',
            'expected_salary': 'expected_salary',
            'fulltime': 'willing_fulltime',
            'height': 'height_cm',
            'weight': 'weight_kg',
            'vision': 'vision_status',
            'fitness_confirmed': 'fitness_confirmed',
            'police_verified': 'police_verification_obtained',
            'fitness_confirmed': 'fitness_confirmed',
            'police_verified': 'police_verification_obtained',
            'no_criminal_record': 'no_criminal_record',
            'id_proof_document': 'id_proof_document',
            'address_proof_document': 'address_proof_document',
            'education_certificate': 'education_certificate',
            'experience_certificate': 'experience_certificate',
            'license_document': 'license_document',
            'medical_certificate': 'medical_certificate',
            'police_verification_certificate': 'police_verification_certificate',
            'criminal_record_certificate': 'criminal_record_certificate',
        }
        
        profile_data = {}
        for form_field, model_field in profile_field_mapping.items():
            if form_field in validated_data:
                profile_data[model_field] = validated_data.pop(form_field)
        
        # Update membership fields (role, is_active)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Sync is_active to user
        if 'is_active' in validated_data:
            instance.user.is_active = instance.is_active
            instance.user.save(update_fields=['is_active'])
        
        # Update user fields
        if user_fields:
            for attr, value in user_fields.items():
                setattr(instance.user, attr, value)
            instance.user.save()
        
        # Update or create staff profile
        if profile_data:
            staff_profile, created = StaffProfile.objects.get_or_create(user=instance.user)
            for attr, value in profile_data.items():
                if value is not None:
                    setattr(staff_profile, attr, value)
            staff_profile.save()
        
        return instance

