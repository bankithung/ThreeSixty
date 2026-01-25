"""
URL configuration for accounts app.
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    SendOTPView,
    VerifyOTPView,
    AdminLoginView,
    LogoutView,
    UserProfileView,
    UpdateFCMTokenView,
    UserSchoolsView,
    CreateStaffView,
    StaffListView,
    StaffDetailView,
)

app_name = 'accounts'

urlpatterns = [
    # OTP Authentication (for mobile app)
    path('send-otp/', SendOTPView.as_view(), name='send-otp'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    
    # Admin Authentication (for web portal)
    path('login/', AdminLoginView.as_view(), name='admin-login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    
    # Token management
    path('refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    
    # User profile
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('fcm-token/', UpdateFCMTokenView.as_view(), name='fcm-token'),
    
    # Schools and staff
    path('schools/', UserSchoolsView.as_view(), name='user-schools'),
    path('staff/', StaffListView.as_view(), name='staff-list'),
    path('staff/create/', CreateStaffView.as_view(), name='staff-create'),
    path('staff/<uuid:pk>/', StaffDetailView.as_view(), name='staff-detail'),
]
