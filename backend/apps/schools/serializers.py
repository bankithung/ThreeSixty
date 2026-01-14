"""
Serializers for schools app.
"""
from rest_framework import serializers
from .models import School


class SchoolSerializer(serializers.ModelSerializer):
    """Serializer for School model."""
    full_address = serializers.ReadOnlyField()
    location = serializers.ReadOnlyField()
    
    active_features = serializers.SerializerMethodField()
    
    # helper fields for editing
    admin_email = serializers.SerializerMethodField()
    admin_phone = serializers.SerializerMethodField()

    class Meta:
        model = School
        fields = [
            'id', 'name', 'code', 'email', 'phone', 'website',
            'address', 'city', 'state', 'pincode', 'country',
            'latitude', 'longitude', 'full_address', 'location',
            'board', 'medium', 'school_type', 'established_year', 'affiliation_number',
            'udise_code', 'low_class', 'high_class', 'streams',
            'capacity', 'teacher_count', 'staff_count', 'facilities',
            'principal_name', 'principal_email', 'principal_phone',
            'logo', 'settings', 'is_active', 'plan', 'plan_expires_at',
            'pricing_plan', 'data_usage', 'features_config', 'active_features',
            'admin_email', 'admin_phone', # Exposed fields
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'active_features', 'code']

    def get_admin_user(self, obj):
        from apps.accounts.models import UserRole
        return obj.memberships.filter(role=UserRole.SCHOOL_ADMIN, is_active=True).first()

    def get_admin_email(self, obj):
        membership = self.get_admin_user(obj)
        return membership.user.email if membership else None

    def get_admin_phone(self, obj):
        membership = self.get_admin_user(obj)
        return membership.user.phone if membership else None

    def get_active_features(self, obj):
        """
        Get effectively active features.
        Base: Active Subscriptions.
        Override: active_features_config (DB).
        """
        from apps.subscriptions.models import Subscription
        
        # 1. Start with subscriptions
        active_subs = Subscription.objects.filter(school=obj, is_active=True).select_related('feature')
        features = {sub.feature.code: True for sub in active_subs}
        
        # 2. Apply DB overrides (features_config)
        if obj.features_config:
            for code, is_enabled in obj.features_config.items():
                if is_enabled is False:
                   if code in features:
                       del features[code]
                elif is_enabled is True:
                   features[code] = True
                   
        return features

    def update(self, instance, validated_data):
        """Handle updating school and optionally its admin."""
        # Check for admin updates (fields passed in initial_data but not in validated_data due to being read_only/custom)
        request = self.context.get('request')
        if request and request.data:
            admin_data = {}
            if 'admin_email' in request.data: admin_data['email'] = request.data['admin_email']
            if 'admin_phone' in request.data: admin_data['phone'] = request.data['admin_phone']
            if 'admin_password' in request.data and request.data['admin_password']: 
                admin_data['password'] = request.data['admin_password']
            
            if admin_data:
                membership = self.get_admin_user(instance)
                if membership and membership.user:
                    user = membership.user
                    for key, val in admin_data.items():
                        if key == 'password':
                            user.set_password(val)
                        else:
                            setattr(user, key, val)
                    user.save()

        # Handle JSON fields if they come as strings (Multipart/Form-data support)
        import json
        for field in ['streams', 'facilities', 'settings']:
            if field in validated_data and isinstance(validated_data[field], str):
                try:
                     validated_data[field] = json.loads(validated_data[field])
                except:
                    pass # Keep as is if failed

        return super().update(instance, validated_data)


class SchoolCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a school."""
    code = serializers.CharField(read_only=True)
    admin_email = serializers.EmailField(write_only=True, required=False)
    admin_phone = serializers.CharField(max_length=20, write_only=True, required=False)
    admin_name = serializers.CharField(max_length=100, write_only=True, required=False)
    admin_password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = School
        fields = [
            'name', 'email', 'phone', 'website',
            'code',
            'address', 'city', 'state', 'pincode', 'country',
            'latitude', 'longitude', 
            'board', 'medium', 'school_type', 'established_year', 'affiliation_number',
            'udise_code', 'low_class', 'high_class', 'streams',
            'capacity', 'teacher_count', 'staff_count', 'facilities',
            'principal_name', 'principal_email', 'principal_phone',
            'logo', 'settings',
            'admin_email', 'admin_phone', 'admin_name', 'admin_password'
        ]

    def to_internal_value(self, data):
        """Handle multipart form data where JSON fields comes as strings."""
        # Print for debugging
        print("Raw Data:", data)
        
        data = data.copy() # Make mutable
        import json
        
        for field in ['streams', 'facilities', 'settings']:
            if field in data:
                val = data[field]
                if isinstance(val, str):
                    try:
                        if val.strip(): # Only parse if not empty string
                           data[field] = json.loads(val)
                        else:
                           data[field] = [] if field != 'settings' else {}
                    except json.JSONDecodeError:
                        pass # Let validation fail if it's invalid JSON

        # Cleanup "NA" or "N/A" for optional fields that require specific format (Email/URL)
        # The user seems to be entering "NA" for fields they don't have, which breaks validation.
        for key in ['website', 'email', 'principal_email', 'admin_email']:
            if key in data and isinstance(data[key], str):
                if data[key].strip().upper() in ['NA', 'N/A', 'NONE', 'NULL', '']:
                    data[key] = ''
        
        # Cleanup Phone numbers if "NA"
        for key in ['phone', 'admin_phone', 'principal_phone']:
             if key in data and isinstance(data[key], str):
                if data[key].strip().upper() in ['NA', 'N/A', 'NONE', 'NULL']:
                    data[key] = ''

        # Handle empty logo which might come as empty dict or string
        if 'logo' in data and (data['logo'] == '{}' or not data['logo']):
            data.pop('logo')
            
        # Round Latitude/Longitude to avoid precision errors (max_digits=10)
        # Input: 25.931878745236695 (18 digits) -> 400 Bad Request
        for key in ['latitude', 'longitude']:
            if key in data and data[key]:
                try:
                    val = float(data[key])
                    data[key] = f"{val:.6f}" # Round to 6 decimals, sufficient for maps
                except (ValueError, TypeError):
                    pass
        
        try:
            return super().to_internal_value(data)
        except serializers.ValidationError as e:
            print("Validation Error:", e.detail)
            raise e

    def validate(self, data):
        """Check if admin credentials are unique."""
        from apps.accounts.models import User
        
        admin_email = data.get('admin_email')
        admin_phone = data.get('admin_phone')
        
        if admin_email and User.objects.filter(email=admin_email).exists():
            raise serializers.ValidationError({
                'admin_email': 'A user with this email already exists.'
            })
            
        if admin_phone and User.objects.filter(phone=admin_phone).exists():
            raise serializers.ValidationError({
                'admin_phone': 'A user with this phone number already exists.'
            })
            
        return data
    
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
    
    student_count = serializers.IntegerField(read_only=True)
    staff_count = serializers.IntegerField(source='active_staff_count', read_only=True)
    
    class Meta:
        model = School
        fields = [
            'id', 'name', 'code', 'city', 'state', 'pincode', 'address',
            'phone', 'email', 'latitude', 'longitude', 'logo', 'is_active',
            'created_at', 'pricing_plan', 'student_count', 'staff_count'
        ]
