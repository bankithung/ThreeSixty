"""
Emergency SOS Models
"""

from django.db import models
from django.conf import settings
from core.models import BaseModel


class EmergencyType(models.TextChoices):
    ACCIDENT = 'accident', 'Accident'
    BREAKDOWN = 'breakdown', 'Vehicle Breakdown'
    MEDICAL = 'medical', 'Medical Emergency'
    SECURITY = 'security', 'Security Concern'
    OTHER = 'other', 'Other'


class EmergencyStatus(models.TextChoices):
    ACTIVE = 'active', 'Active'
    ACKNOWLEDGED = 'acknowledged', 'Acknowledged'
    RESPONDING = 'responding', 'Responding'
    RESOLVED = 'resolved', 'Resolved'
    FALSE_ALARM = 'false_alarm', 'False Alarm'


class EmergencyContact(BaseModel):
    """
    Emergency contacts for schools
    """
    school = models.ForeignKey(
        'schools.School',
        on_delete=models.CASCADE,
        related_name='emergency_contacts'
    )
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    designation = models.CharField(max_length=100, blank=True)
    is_primary = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-is_primary', 'name']

    def __str__(self):
        return f"{self.name} - {self.phone}"


class EmergencyAlert(BaseModel):
    """
    SOS Emergency alerts from buses
    """
    school = models.ForeignKey(
        'schools.School',
        on_delete=models.CASCADE,
        related_name='emergency_alerts'
    )
    trip = models.ForeignKey(
        'transport.Trip',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='emergency_alerts'
    )
    raised_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='raised_emergencies'
    )
    
    emergency_type = models.CharField(
        max_length=20,
        choices=EmergencyType.choices,
        default=EmergencyType.OTHER
    )
    status = models.CharField(
        max_length=20,
        choices=EmergencyStatus.choices,
        default=EmergencyStatus.ACTIVE
    )
    
    # Location
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True
    )
    longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True
    )
    address = models.TextField(blank=True)
    
    # Details
    description = models.TextField(blank=True)
    audio_recording = models.FileField(
        upload_to='emergency/audio/',
        null=True,
        blank=True
    )
    
    # Response tracking
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='acknowledged_emergencies'
    )
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_emergencies'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Emergency {self.id} - {self.emergency_type} ({self.status})"

    @property
    def is_active(self):
        return self.status in [EmergencyStatus.ACTIVE, EmergencyStatus.ACKNOWLEDGED, EmergencyStatus.RESPONDING]
