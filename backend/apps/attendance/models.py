"""
Attendance models.
"""
from django.db import models
from core.models import BaseModel


class EventType(models.TextChoices):
    """Attendance event types."""
    CHECKIN = 'checkin', 'Checked In (Boarded Bus)'
    CHECKOUT = 'checkout', 'Checked Out (Left Bus)'


class Attendance(BaseModel):
    """
    Model for recording student attendance on bus.
    Each record represents a check-in or check-out event.
    """
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    trip = models.ForeignKey(
        'transport.Trip',
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    conductor = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='attendance_scans'
    )
    
    # Event details
    event_type = models.CharField(
        max_length=20,
        choices=EventType.choices
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Location where scan happened
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    
    # Face recognition details
    confidence_score = models.FloatField(default=0.0)  # Match confidence
    scan_photo = models.ImageField(
        upload_to='attendance/scans/',
        null=True,
        blank=True
    )  # Photo taken during scan
    
    # Manual override
    is_manual = models.BooleanField(default=False)  # True if manually marked
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'attendance'
        verbose_name = 'Attendance'
        verbose_name_plural = 'Attendance Records'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['student', 'timestamp']),
            models.Index(fields=['trip', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.student.full_name} - {self.event_type} @ {self.timestamp}"
    
    @property
    def location(self):
        """Return location as dict."""
        if self.latitude and self.longitude:
            return {
                'latitude': float(self.latitude),
                'longitude': float(self.longitude)
            }
        return None
