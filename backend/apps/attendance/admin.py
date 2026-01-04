"""
Admin configuration for attendance app.
"""
from django.contrib import admin
from .models import Attendance


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    """Admin for Attendance model."""
    list_display = ['student', 'trip', 'event_type', 'timestamp', 'confidence_score', 'is_manual']
    list_filter = ['event_type', 'is_manual', 'trip']
    search_fields = ['student__first_name', 'student__last_name', 'student__admission_number']
    ordering = ['-timestamp']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        (None, {'fields': ('student', 'trip', 'conductor', 'event_type')}),
        ('Location', {'fields': ('latitude', 'longitude')}),
        ('Face Recognition', {'fields': ('confidence_score', 'scan_photo')}),
        ('Manual Entry', {'fields': ('is_manual', 'notes')}),
        ('Timestamps', {'fields': ('timestamp', 'created_at', 'updated_at')}),
    )
