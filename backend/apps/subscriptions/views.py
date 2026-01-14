from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from .models import Feature, Subscription, Transaction
from .serializers import FeatureSerializer, SubscriptionSerializer, TransactionSerializer
from apps.accounts.models import UserRole, SchoolMembership

class TransactionPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

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
            queryset = Subscription.objects.all()
            school_id = self.request.query_params.get('school')
            if school_id:
                queryset = queryset.filter(school_id=school_id)
                
            feature_id = self.request.query_params.get('feature')
            if feature_id:
                queryset = queryset.filter(feature_id=feature_id)
                
            return queryset
        
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

from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta
from .models import Transaction
from .serializers import TransactionSerializer

class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    pagination_class = TransactionPagination
    permission_classes = [permissions.IsAuthenticated] # Fine-tune later

    def get_queryset(self):
        user = self.request.user
        queryset = Transaction.objects.all()

        if user.role != UserRole.ROOT_ADMIN:
             # School admins only see their own transactions
            school_ids = SchoolMembership.objects.filter(
                user=user,
                role=UserRole.SCHOOL_ADMIN,
                is_active=True
            ).values_list('school_id', flat=True)
            queryset = queryset.filter(school_id__in=school_ids)
        
        # Filters
        school_id = self.request.query_params.get('school')
        if school_id:
            queryset = queryset.filter(school_id=school_id)
            
        status_param = self.request.query_params.get('status')
        if status_param and status_param != 'all':
            queryset = queryset.filter(status=status_param)
            
        feature_param = self.request.query_params.get('feature')
        if feature_param and feature_param != 'all':
             import uuid
             from django.db.models import Q
             try:
                 uuid.UUID(feature_param)
                 # Search by ID OR by name description match (for unlinked transactions)
                 feature_name = Feature.objects.get(id=feature_param).name
                 queryset = queryset.filter(
                    Q(feature__id=feature_param) | 
                    (Q(feature__isnull=True) & Q(description__icontains=feature_name))
                 )
             except (ValueError, Feature.DoesNotExist):
                 # Search in feature name OR description (for unlinked transactions)
                 queryset = queryset.filter(
                    Q(feature__name__icontains=feature_param) | 
                    Q(description__icontains=feature_param)
                 )

        start_date = self.request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(transaction_date__gte=start_date)
            
        end_date = self.request.query_params.get('end_date')
        if end_date:
            queryset = queryset.filter(transaction_date__lte=end_date)
            
        search_query = self.request.query_params.get('search')
        if search_query:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(description__icontains=search_query) | 
                Q(reference_id__icontains=search_query) |
                Q(school__name__icontains=search_query) |
                Q(school__city__icontains=search_query)
            )

        return queryset

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Returns financial stats: Total Earnings, MRR (approx last 30 days revenue), Pending Payouts.
        """
        user = this_user = request.user
        queryset = self.get_queryset()

        # Total Earnings (All time paid)
        total_earnings = queryset.filter(status='paid').aggregate(Sum('amount'))['amount__sum'] or 0
        
        # Pending Payouts
        pending_payouts = queryset.filter(status='pending').aggregate(Sum('amount'))['amount__sum'] or 0

        # MMR (Approximate as revenue in last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        mrr = queryset.filter(status='paid', transaction_date__gte=thirty_days_ago).aggregate(Sum('amount'))['amount__sum'] or 0

        return Response({
            'total_earnings': total_earnings,
            'mrr': mrr,
            'pending_payouts': pending_payouts
        })

