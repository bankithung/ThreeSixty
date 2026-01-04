"""
Serializers for user accounts and authentication.
"""
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

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
    # Flat user fields for convenient frontend access
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = SchoolMembership
        fields = [
            'id', 'user', 'school', 'school_name', 'role', 'is_active', 'created_at',
            'first_name', 'last_name', 'full_name', 'phone', 'email'
        ]
        read_only_fields = ['id', 'created_at']


class CreateStaffSerializer(serializers.Serializer):
    """Serializer for creating staff members."""
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False)
    role = serializers.ChoiceField(choices=UserRole.choices)
    school_id = serializers.UUIDField()
    
    def validate(self, attrs):
        """Validate permissions and inputs."""
        print(f"DEBUG: CreateStaffSerializer input: {attrs}")
        user = self.context['request'].user
        
        # Verify school permission
        school_id = attrs.get('school_id')
        if school_id:
            # Root admin can do anything, others must be school admin of that school
            if user.role != UserRole.ROOT_ADMIN:
                has_permission = SchoolMembership.objects.filter(
                    user=user,
                    school_id=school_id,
                    role=UserRole.SCHOOL_ADMIN,
                    is_active=True
                ).exists()
                
                if not has_permission:
                    print("DEBUG: Permission denied for school_id")
                    raise serializers.ValidationError({"school_id": "You do not have permission to add staff to this school."})

        """Validate that phone or email is provided."""
        if not attrs.get('phone') and not attrs.get('email'):
            print("DEBUG: Missing phone/email")
            raise serializers.ValidationError("Either phone or email is required.")
        
        # Format phone number
        if attrs.get('phone'):
            try:
                attrs['phone'] = format_phone_number(attrs['phone'])
            except Exception as e:
                print(f"DEBUG: Phone format error: {e}")
                raise serializers.ValidationError({"phone": f"Invalid phone format: {str(e)}"})
        
        return attrs
    
    def create(self, validated_data):
        """Create user and school membership."""
        from apps.schools.models import School
        
        school_id = validated_data.pop('school_id')
        role = validated_data.pop('role')
        password = validated_data.pop('password', None)
        
        # Get school
        try:
            school = School.objects.get(id=school_id)
        except School.DoesNotExist:
            raise serializers.ValidationError({"school_id": "School not found."})
        
        # Create user
        user = User.objects.create_user(**validated_data, password=password, role=role)
        
        # Create school membership
        SchoolMembership.objects.create(
            user=user,
            school=school,
            role=role
        )
        
        return user
