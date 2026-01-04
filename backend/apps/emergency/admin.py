"""
Emergency Admin Configuration
"""

from django.contrib import admin
from .models import EmergencyAlert, EmergencyContact


@admin.register(EmergencyContact)
class EmergencyContactAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'school', 'designation', 'is_primary', 'is_active']
    list_filter = ['school', 'is_primary', 'is_active']
    search_fields = ['name', 'phone']
    ordering = ['-is_primary', 'name']


@admin.register(EmergencyAlert)
class EmergencyAlertAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'school', 'emergency_type', 'status', 
        'raised_by', 'created_at'
    ]
    list_filter = ['status', 'emergency_type', 'school', 'created_at']
    search_fields = ['description', 'raised_by__first_name', 'raised_by__last_name']
    readonly_fields = ['created_at', 'updated_at', 'acknowledged_at', 'resolved_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('school', 'trip', 'raised_by', 'emergency_type', 'status')
        }),
        ('Location', {
            'fields': ('latitude', 'longitude', 'address')
        }),
        ('Details', {
            'fields': ('description', 'audio_recording')
        }),
        ('Response', {
            'fields': (
                'acknowledged_by', 'acknowledged_at',
                'resolved_by', 'resolved_at', 'resolution_notes'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
