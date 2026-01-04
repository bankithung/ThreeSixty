"""
Admin configuration for transport app.
"""
from django.contrib import admin
from .models import Bus, BusStaff, Route, Stop, Trip, LocationUpdate


@admin.register(Bus)
class BusAdmin(admin.ModelAdmin):
    """Admin for Bus model."""
    list_display = ['number', 'registration_number', 'school', 'capacity', 'is_active']
    list_filter = ['school', 'is_active']
    search_fields = ['number', 'registration_number']
    ordering = ['school', 'number']


@admin.register(BusStaff)
class BusStaffAdmin(admin.ModelAdmin):
    """Admin for BusStaff model."""
    list_display = ['user', 'bus', 'role', 'is_active']
    list_filter = ['role', 'is_active']
    search_fields = ['user__phone', 'user__first_name', 'bus__number']


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    """Admin for Route model."""
    list_display = ['name', 'school', 'bus', 'morning_start_time', 'is_active']
    list_filter = ['school', 'is_active']
    search_fields = ['name']
    ordering = ['school', 'name']


@admin.register(Stop)
class StopAdmin(admin.ModelAdmin):
    """Admin for Stop model."""
    list_display = ['name', 'route', 'sequence', 'is_active']
    list_filter = ['route', 'is_active']
    search_fields = ['name']
    ordering = ['route', 'sequence']


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    """Admin for Trip model."""
    list_display = ['bus', 'route', 'trip_type', 'status', 'scheduled_start', 'started_at', 'ended_at']
    list_filter = ['status', 'trip_type', 'bus']
    search_fields = ['bus__number', 'route__name']
    ordering = ['-scheduled_start']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(LocationUpdate)
class LocationUpdateAdmin(admin.ModelAdmin):
    """Admin for LocationUpdate model."""
    list_display = ['bus', 'trip', 'latitude', 'longitude', 'speed', 'created_at']
    list_filter = ['bus', 'trip']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
