"""
Views for user accounts and authentication.
"""
import logging
from django.conf import settings
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


class StaffListView(generics.ListAPIView):
    """List staff members for a school (excludes parents)."""
    serializer_class = SchoolMembershipSerializer
    permission_classes = [IsSchoolAdmin]
    
    def get_queryset(self):
        school_id = self.request.query_params.get('school_id')
        role = self.request.query_params.get('role')
        
        queryset = SchoolMembership.objects.select_related('user', 'school')
        
        # Exclude parents - staff is only for workers
        queryset = queryset.exclude(role='parent')
        
        if school_id:
            queryset = queryset.filter(school_id=school_id)
        
        if role:
            queryset = queryset.filter(role=role)
        
        # Non-root admins can only see their school's staff
        if self.request.user.role != 'root_admin':
            user_schools = SchoolMembership.objects.filter(
                user=self.request.user
            ).values_list('school_id', flat=True)
            queryset = queryset.filter(school_id__in=user_schools)
        
        return queryset
