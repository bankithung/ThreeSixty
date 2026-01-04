"""
Admin configuration for students app.
"""
from django.contrib import admin
from .models import Student, Parent, FaceEncoding


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    """Admin for Student model."""
    list_display = ['admission_number', 'full_name', 'school', 'grade', 'section', 'route', 'is_active']
    list_filter = ['school', 'grade', 'is_active', 'route']
    search_fields = ['first_name', 'last_name', 'admission_number']
    ordering = ['first_name', 'last_name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        (None, {'fields': ('school', 'admission_number', 'is_active')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'date_of_birth', 'gender', 'photo')}),
        ('Academic', {'fields': ('grade', 'section')}),
        ('Pickup Location', {'fields': ('pickup_address', 'pickup_latitude', 'pickup_longitude')}),
        ('Drop Location', {'fields': ('drop_address', 'drop_latitude', 'drop_longitude')}),
        ('Route', {'fields': ('route', 'stop')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )


@admin.register(Parent)
class ParentAdmin(admin.ModelAdmin):
    """Admin for Parent model."""
    list_display = ['user', 'student', 'relation', 'is_primary', 'is_active']
    list_filter = ['relation', 'is_primary', 'is_active']
    search_fields = ['user__phone', 'user__email', 'student__first_name', 'student__last_name']
    ordering = ['-created_at']


@admin.register(FaceEncoding)
class FaceEncodingAdmin(admin.ModelAdmin):
    """Admin for FaceEncoding model."""
    list_display = ['student', 'is_primary', 'quality_score', 'created_at']
    list_filter = ['is_primary']
    search_fields = ['student__first_name', 'student__last_name']
    ordering = ['-created_at']
    readonly_fields = ['encoding', 'created_at', 'updated_at']
