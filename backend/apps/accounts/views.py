"""
Views for user accounts and authentication.
"""
import logging
from django.conf import settings
from rest_framework.exceptions import ValidationError
from rest_framework import status, generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, SchoolMembership
from .serializers import (
    UserSerializer,
    UserProfileSerializer,
    SendOTPSerializer,
    VerifyOTPSerializer,
    AdminLoginSerializer,
    SchoolMembershipSerializer,
    CreateStaffSerializer,
    UpdateStaffSerializer,
    StaffDetailSerializer,
)
from core.permissions import IsRootAdmin, IsSchoolAdmin
from core.utils import get_client_ip

logger = logging.getLogger(__name__)


class SendOTPView(APIView):
    """Send OTP to phone number."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        otp = serializer.save()
        
        # In development, log the OTP to console
        if settings.DEBUG:
            logger.info(f"OTP for {otp.phone}: {otp.otp}")
            print(f"\n{'='*50}")
            print(f"OTP for {otp.phone}: {otp.otp}")
            print(f"{'='*50}\n")
        
        # TODO: Send OTP via SMS service
        # send_sms(otp.phone, f"Your ThreeSixty OTP is: {otp.otp}")
        
        return Response({
            'message': 'OTP sent successfully.',
            'phone': otp.phone,
            # Include OTP in response only during development
            'otp': otp.otp if settings.DEBUG else None,
        }, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    """Verify OTP and authenticate user."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        
        # Update last login IP
        user = result['user']
        user.last_login_ip = get_client_ip(request)
        user.save(update_fields=['last_login_ip'])
        
        return Response({
            'message': 'OTP verified successfully.',
            'user': UserSerializer(user).data,
            'is_new_user': result['is_new_user'],
            'access': result['access'],
            'refresh': result['refresh'],
        }, status=status.HTTP_200_OK)


class AdminLoginView(APIView):
    """Admin email/password login."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = AdminLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        
        # Update last login IP
        user = result['user']
        user.last_login_ip = get_client_ip(request)
        user.save(update_fields=['last_login_ip'])
        
        return Response({
            'message': 'Login successful.',
            'user': UserSerializer(user).data,
            'access': result['access'],
            'refresh': result['refresh'],
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """Logout user by blacklisting refresh token."""
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            return Response({
                'message': 'Logged out successfully.'
            }, status=status.HTTP_200_OK)
        except Exception:
            return Response({
                'message': 'Logged out successfully.'
            }, status=status.HTTP_200_OK)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """Get and update current user profile."""
    serializer_class = UserSerializer
    
    def get_object(self):
        return self.request.user
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserProfileSerializer
        return UserSerializer


class UpdateFCMTokenView(APIView):
    """Update user's FCM token for push notifications."""
    
    def post(self, request):
        fcm_token = request.data.get('fcm_token')
        device_type = request.data.get('device_type')
        
        user = request.user
        if fcm_token:
            user.fcm_token = fcm_token
        if device_type:
            user.device_type = device_type
        user.save(update_fields=['fcm_token', 'device_type'])
        
        return Response({
            'message': 'FCM token updated successfully.'
        }, status=status.HTTP_200_OK)


class UserSchoolsView(generics.ListAPIView):
    """List schools the current user belongs to."""
    serializer_class = SchoolMembershipSerializer
    
    def get_queryset(self):
        return SchoolMembership.objects.filter(
            user=self.request.user,
            is_active=True
        ).select_related('school')


class CreateStaffView(APIView):
    """Create staff members (conductors, drivers, office staff, etc.)."""
    permission_classes = [IsSchoolAdmin]
    
    def post(self, request):
        try:
            serializer = CreateStaffSerializer(
                data=request.data,
                context={'request': request}
            )
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            
            return Response({
                'message': 'Staff member created successfully.',
                'user': UserSerializer(user).data,
            }, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            # Ensure frontend sees the real field errors (400) rather than a generic message
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("Unexpected error while creating staff")
            payload = {"message": "Internal server error while creating staff."}
            if getattr(settings, "DEBUG", False):
                # Include error details in development to speed up debugging
                import traceback
                payload["detail"] = traceback.format_exc()
            return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StaffListView(generics.ListAPIView):
    """List staff members for a school (excludes parents)."""
    serializer_class = SchoolMembershipSerializer
    permission_classes = [IsSchoolAdmin]
    
    def get_queryset(self):
        school_id = self.request.query_params.get('school_id')
        role = self.request.query_params.get('role')
        
        queryset = SchoolMembership.objects.select_related('user', 'school').prefetch_related('user__staff_profile')
        
        # Exclude parents - staff is only for workers
        queryset = queryset.exclude(role='parent')
        
        if school_id:
            queryset = queryset.filter(school_id=school_id)
        
        if role:
            # Support multiple roles via comma-separated list
            role_list = role.split(',')
            queryset = queryset.filter(role__in=role_list)
        
        # Non-root admins can only see their school's staff
        if self.request.user.role != 'root_admin':
            user_schools = SchoolMembership.objects.filter(
                user=self.request.user
            ).values_list('school_id', flat=True)
            queryset = queryset.filter(school_id__in=user_schools)
        
        return queryset


class StaffDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve/Update/Delete a staff membership record.

    The admin UI uses `member.id` from the staff list, which is the `SchoolMembership.id`,
    so this endpoint is keyed by membership UUID.
    """
    serializer_class = SchoolMembershipSerializer
    permission_classes = [IsSchoolAdmin]
    queryset = SchoolMembership.objects.select_related('user', 'school')

    def get_serializer_class(self):
        """Use appropriate serializer based on request method."""
        if self.request.method in ['PUT', 'PATCH']:
            return UpdateStaffSerializer
        # Use StaffDetailSerializer for GET to return full profile data
        return StaffDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset().exclude(role='parent')

        # Non-root admins can only access their school's staff
        if self.request.user.role != 'root_admin':
            user_schools = SchoolMembership.objects.filter(
                user=self.request.user
            ).values_list('school_id', flat=True)
            qs = qs.filter(school_id__in=user_schools)

        return qs

    def perform_update(self, serializer):
        """
        When updating is_active on membership, also sync it to the user model.
        This ensures deactivating a staff member properly disables their login.
        """
        instance = serializer.save()
        
        # If is_active was explicitly set, sync it to the user
        if 'is_active' in serializer.validated_data:
            user = instance.user
            user.is_active = instance.is_active
            user.save(update_fields=['is_active'])
        
        return instance

    def perform_destroy(self, instance: SchoolMembership):
        """
        Soft delete: Deactivate the membership and user instead of hard deleting.
        This preserves all data while effectively disabling the account.
        """
        # Deactivate the membership
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        
        # Also deactivate the user account
        user = instance.user
        user.is_active = False
        user.save(update_fields=['is_active'])

