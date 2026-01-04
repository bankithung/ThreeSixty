"""
Emergency Views
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from core.permissions import IsSchoolAdmin, IsStaff, IsConductor, IsDriver
from .models import EmergencyAlert, EmergencyContact, EmergencyStatus
from .serializers import (
    EmergencyAlertSerializer,
    EmergencyContactSerializer,
    RaiseEmergencySerializer,
    AcknowledgeEmergencySerializer,
    ResolveEmergencySerializer,
)


class EmergencyContactViewSet(viewsets.ModelViewSet):
    """
    Manage emergency contacts for a school
    """
    serializer_class = EmergencyContactSerializer
    permission_classes = [IsAuthenticated, IsSchoolAdmin]

    def get_queryset(self):
        user = self.request.user
        school_ids = user.school_memberships.values_list('school_id', flat=True)
        return EmergencyContact.objects.filter(school_id__in=school_ids, is_active=True)

    def perform_create(self, serializer):
        school_id = self.request.data.get('school_id')
        if not school_id:
            membership = self.request.user.school_memberships.first()
            if membership:
                school_id = membership.school_id
        serializer.save(school_id=school_id)


class EmergencyAlertViewSet(viewsets.ModelViewSet):
    """
    Emergency Alert management
    """
    serializer_class = EmergencyAlertSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        school_ids = user.school_memberships.values_list('school_id', flat=True)
        queryset = EmergencyAlert.objects.filter(school_id__in=school_ids)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter active only
        if self.request.query_params.get('active') == 'true':
            queryset = queryset.filter(
                status__in=[
                    EmergencyStatus.ACTIVE,
                    EmergencyStatus.ACKNOWLEDGED,
                    EmergencyStatus.RESPONDING
                ]
            )
        
        return queryset.select_related('school', 'trip', 'raised_by')

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def raise_alert(self, request):
        """
        Raise an emergency alert (SOS button)
        """
        serializer = RaiseEmergencySerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        alert = serializer.save()
        
        return Response(
            {
                'message': 'Emergency alert raised successfully',
                'alert': EmergencyAlertSerializer(alert).data
            },
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsSchoolAdmin])
    def acknowledge(self, request, pk=None):
        """
        Acknowledge an emergency alert
        """
        alert = self.get_object()
        if alert.status != EmergencyStatus.ACTIVE:
            return Response(
                {'detail': 'Alert is not in active status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = AcknowledgeEmergencySerializer(
            alert,
            data={},
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        alert = serializer.save()
        
        return Response({
            'message': 'Emergency acknowledged',
            'alert': EmergencyAlertSerializer(alert).data
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsSchoolAdmin])
    def resolve(self, request, pk=None):
        """
        Resolve an emergency alert
        """
        alert = self.get_object()
        if alert.status == EmergencyStatus.RESOLVED:
            return Response(
                {'detail': 'Alert is already resolved'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ResolveEmergencySerializer(
            alert,
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        alert = serializer.save()
        
        return Response({
            'message': 'Emergency resolved',
            'alert': EmergencyAlertSerializer(alert).data
        })

    @action(detail=False, methods=['get'])
    def my_contacts(self, request):
        """
        Get emergency contacts for user's school
        """
        membership = request.user.school_memberships.first()
        if not membership:
            return Response({'contacts': []})
        
        contacts = EmergencyContact.objects.filter(
            school=membership.school,
            is_active=True
        )
        
        return Response({
            'contacts': EmergencyContactSerializer(contacts, many=True).data
        })
