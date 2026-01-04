"""
Admin configuration for accounts app.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, OTP, SchoolMembership


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin for User model."""
    list_display = ['email', 'phone', 'full_name', 'role', 'is_active', 'created_at']
    list_filter = ['role', 'is_active', 'is_staff', 'is_phone_verified']
    search_fields = ['email', 'phone', 'first_name', 'last_name']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {'fields': ('email', 'phone', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'avatar')}),
        ('Role & Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser')}),
        ('Verification', {'fields': ('is_phone_verified', 'is_email_verified')}),
        ('Device', {'fields': ('fcm_token', 'device_type')}),
        ('Important dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    
    readonly_fields = ['created_at', 'updated_at', 'last_login']
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'phone', 'first_name', 'last_name', 'role', 'password1', 'password2'),
        }),
    )


@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    """Admin for OTP model."""
    list_display = ['phone', 'otp', 'purpose', 'is_verified', 'expires_at', 'attempts']
    list_filter = ['purpose', 'is_verified']
    search_fields = ['phone']
    ordering = ['-created_at']
    readonly_fields = ['created_at']


@admin.register(SchoolMembership)
class SchoolMembershipAdmin(admin.ModelAdmin):
    """Admin for SchoolMembership model."""
    list_display = ['user', 'school', 'role', 'is_active', 'created_at']
    list_filter = ['role', 'is_active']
    search_fields = ['user__email', 'user__phone', 'school__name']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
