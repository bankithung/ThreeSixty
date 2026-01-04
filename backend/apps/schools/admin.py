"""
Admin configuration for schools app.
"""
from django.contrib import admin
from .models import School


@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    """Admin for School model."""
    list_display = ['name', 'code', 'city', 'state', 'is_active', 'created_at']
    list_filter = ['is_active', 'state', 'plan']
    search_fields = ['name', 'code', 'city']
    ordering = ['name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        (None, {'fields': ('name', 'code', 'is_active')}),
        ('Contact', {'fields': ('email', 'phone', 'website')}),
        ('Address', {'fields': ('address', 'city', 'state', 'pincode', 'country')}),
        ('Location', {'fields': ('latitude', 'longitude')}),
        ('Branding', {'fields': ('logo',)}),
        ('Settings', {'fields': ('settings', 'plan', 'plan_expires_at')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )
