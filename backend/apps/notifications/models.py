"""
Notification models.
"""
from django.db import models
from core.models import BaseModel


class NotificationType(models.TextChoices):
    """Notification type choices."""
    CHECKIN = 'checkin', 'Student Checked In'
    CHECKOUT = 'checkout', 'Student Checked Out'
    TRIP_STARTED = 'trip_started', 'Trip Started'
    TRIP_ENDED = 'trip_ended', 'Trip Ended'
    APPROACHING = 'approaching', 'Bus Approaching'
    DELAY = 'delay', 'Bus Delayed'
    EMERGENCY = 'emergency', 'Emergency Alert'
    GENERAL = 'general', 'General'


class Notification(BaseModel):
    """
    Model for storing user notifications.
    """
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    
    # Notification content
    title = models.CharField(max_length=255)
    body = models.TextField()
    notification_type = models.CharField(
        max_length=20,
        choices=NotificationType.choices,
        default=NotificationType.GENERAL
    )
    
    # Related objects (optional)
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications'
    )
    trip = models.ForeignKey(
        'transport.Trip',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications'
    )
    
    # Payload for additional data
    data = models.JSONField(default=dict, blank=True)
    
    # Read status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Push notification status
    is_pushed = models.BooleanField(default=False)
    pushed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'notifications'
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_read']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.user})"
