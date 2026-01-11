"""
Serializers for schools app.
"""
from rest_framework import serializers
from .models import School


class SchoolSerializer(serializers.ModelSerializer):
    """Serializer for School model."""
    full_address = serializers.ReadOnlyField()
    location = serializers.ReadOnlyField()
    
    class Meta:
        model = School
        fields = [
            'id', 'name', 'code', 'email', 'phone', 'website',
            'address', 'city', 'state', 'pincode', 'country',
            'latitude', 'longitude', 'full_address', 'location',
            'logo', 'settings', 'is_active', 'plan', 'plan_expires_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SchoolCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a school."""
    admin_email = serializers.EmailField(write_only=True, required=False)
    admin_phone = serializers.CharField(max_length=20, write_only=True, required=False)
    admin_name = serializers.CharField(max_length=100, write_only=True, required=False)
    admin_password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = School
        fields = [
            'name', 'code', 'email', 'phone', 'website',
            'address', 'city', 'state', 'pincode', 'country',
            'latitude', 'longitude', 'logo', 'settings',
            'admin_email', 'admin_phone', 'admin_name', 'admin_password'
        ]
    
    def create(self, validated_data):
        """Create school and optionally create admin user."""
        from apps.accounts.models import User, SchoolMembership, UserRole
        
        # Extract admin data
        admin_email = validated_data.pop('admin_email', None)
        admin_phone = validated_data.pop('admin_phone', None)
        admin_name = validated_data.pop('admin_name', None)
        admin_password = validated_data.pop('admin_password', None)
        
        # Create school
        school = School.objects.create(**validated_data)
        
        # Create school admin if provided
        if admin_email or admin_phone:
            first_name = admin_name.split()[0] if admin_name else 'Admin'
            last_name = ' '.join(admin_name.split()[1:]) if admin_name and len(admin_name.split()) > 1 else ''
            
            admin_user = User.objects.create_user(
                email=admin_email,
                phone=admin_phone,
                first_name=first_name,
                last_name=last_name,
                password=admin_password,
                role=UserRole.SCHOOL_ADMIN,
                is_staff=True,
            )
            
            SchoolMembership.objects.create(
                user=admin_user,
                school=school,
                role=UserRole.SCHOOL_ADMIN
            )
        
        return school


class SchoolListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing schools."""
    
    class Meta:
        model = School
        fields = [
            'id', 'name', 'code', 'city', 'state', 'pincode', 'address',
            'phone', 'email', 'latitude', 'longitude', 'logo', 'is_active'
        ]
