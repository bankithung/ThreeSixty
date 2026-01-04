"""
Emergency Serializers
"""

from rest_framework import serializers
from django.utils import timezone
from .models import EmergencyAlert, EmergencyContact, EmergencyType, EmergencyStatus


class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = [
            'id', 'name', 'phone', 'designation', 
            'is_primary', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class EmergencyAlertSerializer(serializers.ModelSerializer):
    raised_by_name = serializers.CharField(source='raised_by.full_name', read_only=True)
    bus_number = serializers.CharField(source='trip.bus.number', read_only=True)
    route_name = serializers.CharField(source='trip.route.name', read_only=True)
    
    class Meta:
        model = EmergencyAlert
        fields = [
            'id', 'school', 'trip', 'raised_by', 'raised_by_name',
            'emergency_type', 'status', 'latitude', 'longitude', 'address',
            'description', 'audio_recording',
            'acknowledged_by', 'acknowledged_at',
            'resolved_by', 'resolved_at', 'resolution_notes',
            'bus_number', 'route_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'raised_by', 'acknowledged_by', 'acknowledged_at',
            'resolved_by', 'resolved_at', 'created_at', 'updated_at'
        ]


class RaiseEmergencySerializer(serializers.Serializer):
    emergency_type = serializers.ChoiceField(choices=EmergencyType.choices)
    trip_id = serializers.UUIDField(required=False)
    latitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False)
    longitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True)

    def create(self, validated_data):
        user = self.context['request'].user
        trip_id = validated_data.pop('trip_id', None)
        
        # Get school from user or trip
        from apps.transport.models import Trip
        trip = None
        school = None
        
        if trip_id:
            trip = Trip.objects.filter(id=trip_id).first()
            if trip:
                school = trip.school
        
        if not school:
            # Get school from user membership
            membership = user.school_memberships.first()
            if membership:
                school = membership.school
        
        if not school:
            raise serializers.ValidationError("Could not determine school for emergency")
        
        alert = EmergencyAlert.objects.create(
            school=school,
            trip=trip,
            raised_by=user,
            **validated_data
        )
        
        # Send emergency notifications
        self._send_emergency_notifications(alert)
        
        return alert
    
    def _send_emergency_notifications(self, alert):
        """Send push notifications to school admins and emergency contacts"""
        from apps.notifications.services import NotificationService
        from apps.accounts.models import User, SchoolMembership
        
        # Get school admins
        admin_memberships = SchoolMembership.objects.filter(
            school=alert.school,
            role__in=['school_admin', 'office_staff'],
            is_active=True
        ).select_related('user')
        
        for membership in admin_memberships:
            NotificationService.send_notification(
                user=membership.user,
                title=f"🚨 EMERGENCY: {alert.get_emergency_type_display()}",
                body=f"Emergency raised by {alert.raised_by.full_name}. Location shared.",
                notification_type='emergency',
                data={
                    'emergency_id': str(alert.id),
                    'latitude': str(alert.latitude) if alert.latitude else None,
                    'longitude': str(alert.longitude) if alert.longitude else None,
                }
            )
        
        # Get parents of students on the trip
        if alert.trip:
            from apps.students.models import Student
            students = Student.objects.filter(
                route=alert.trip.route,
                is_active=True
            ).prefetch_related('parents__user')
            
            for student in students:
                for parent in student.parents.all():
                    if parent.user:
                        NotificationService.send_notification(
                            user=parent.user,
                            title="⚠️ Emergency Alert on Bus",
                            body=f"An emergency has been reported on your child's bus. Stay calm, officials are responding.",
                            notification_type='emergency',
                            data={
                                'emergency_id': str(alert.id),
                                'student_id': str(student.id),
                            }
                        )


class AcknowledgeEmergencySerializer(serializers.Serializer):
    def update(self, instance, validated_data):
        user = self.context['request'].user
        instance.status = EmergencyStatus.ACKNOWLEDGED
        instance.acknowledged_by = user
        instance.acknowledged_at = timezone.now()
        instance.save()
        return instance


class ResolveEmergencySerializer(serializers.Serializer):
    resolution_notes = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=[EmergencyStatus.RESOLVED, EmergencyStatus.FALSE_ALARM],
        default=EmergencyStatus.RESOLVED
    )

    def update(self, instance, validated_data):
        user = self.context['request'].user
        instance.status = validated_data.get('status', EmergencyStatus.RESOLVED)
        instance.resolved_by = user
        instance.resolved_at = timezone.now()
        instance.resolution_notes = validated_data.get('resolution_notes', '')
        instance.save()
        return instance
