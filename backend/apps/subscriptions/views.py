from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Feature, Subscription
from .serializers import FeatureSerializer, SubscriptionSerializer
from apps.accounts.models import UserRole, SchoolMembership

class IsRootAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role == UserRole.ROOT_ADMIN

class IsSchoolAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.user.role == UserRole.ROOT_ADMIN:
            return True
        return SchoolMembership.objects.filter(
            user=request.user, 
            role=UserRole.SCHOOL_ADMIN,
            is_active=True
        ).exists()

class FeatureViewSet(viewsets.ModelViewSet):
    queryset = Feature.objects.filter(is_active=True)
    serializer_class = FeatureSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsRootAdmin()]
        return [permissions.IsAuthenticated()]

class SubscriptionViewSet(viewsets.ModelViewSet):
    queryset = Subscription.objects.all()
    serializer_class = SubscriptionSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.ROOT_ADMIN:
            return Subscription.objects.all()
        
        # School admins can only see subscriptions for their school
        school_ids = SchoolMembership.objects.filter(
            user=user,
            role=UserRole.SCHOOL_ADMIN,
            is_active=True
        ).values_list('school_id', flat=True)
        return Subscription.objects.filter(school_id__in=school_ids)

    def get_permissions(self):
        # Only Root Admin can manage subscriptions (create/delete)
        # School Admins can view (in get_queryset) and potentially 'request' (custom action later)
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsRootAdmin()]
        return [permissions.IsAuthenticated(), IsSchoolAdmin()]

    @action(detail=False, methods=['get'])
    def my_subscriptions(self, request):
        """Helper endpoint to get simple list of active feature codes for the current user's school context"""
        if request.user.role == UserRole.ROOT_ADMIN:
            # Root admin has access to everything by definition, but for UI specific school context might fail.
            # Returning all features as active for Root Admin for now, or handle specifically.
            features = Feature.objects.filter(is_active=True).values_list('code', flat=True)
            return Response(features)
            
        school_ids = SchoolMembership.objects.filter(
            user=request.user,
            is_active=True
        ).values_list('school_id', flat=True)
        
        features = Subscription.objects.filter(
            school_id__in=school_ids,
            is_active=True
        ).values_list('feature__code', flat=True).distinct()
        
        return Response(features)
