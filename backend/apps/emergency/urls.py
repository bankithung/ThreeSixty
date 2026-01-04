"""
Emergency URL Configuration
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmergencyAlertViewSet, EmergencyContactViewSet

router = DefaultRouter()
router.register('alerts', EmergencyAlertViewSet, basename='emergency-alert')
router.register('contacts', EmergencyContactViewSet, basename='emergency-contact')

urlpatterns = [
    path('', include(router.urls)),
]
