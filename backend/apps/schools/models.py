"""
School models.
"""
from django.db import models
from core.models import BaseModel


class School(BaseModel):
    """
    Model representing a school/institute.
    Created by root admin, managed by school admin.
    """
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True, blank=True)  # Auto-generated if not provided
    
    def save(self, *args, **kwargs):
        if not self.code:
            # Generate unique code: SCH001, SCH002, etc.
            # Generate unique code: SCH001, SCH002, etc.
            # Since PK is UUID/Random, we count existing objects
            count = School.objects.count()
            next_val = count + 1
            self.code = f"SCH{next_val:03d}"
            
            # Ensure uniqueness
            while School.objects.filter(code=self.code).exists():
                next_val += 1
                self.code = f"SCH{next_val:03d}"
        super().save(*args, **kwargs)
    
    # Contact information
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    website = models.URLField(null=True, blank=True)
    
    # Address
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    country = models.CharField(max_length=100, default='India')
    
    # Location for maps (stored as lat,lng string for simplicity without PostGIS)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    
    # Academic Details
    board = models.CharField(max_length=50, blank=True, help_text='e.g. CBSE, ICSE, State Board')
    medium = models.CharField(max_length=50, blank=True, help_text='e.g. English, Hindi')
    school_type = models.CharField(
        max_length=20, 
        choices=[('co-ed', 'Co-Ed'), ('boys', 'Boys'), ('girls', 'Girls')],
        default='co-ed'
    )
    established_year = models.IntegerField(null=True, blank=True)
    affiliation_number = models.CharField(max_length=50, blank=True)
    
    # New Fields
    udise_code = models.CharField(max_length=50, blank=True)
    low_class = models.CharField(max_length=20, blank=True, help_text='Lowest Grade (e.g. Nursery)')
    high_class = models.CharField(max_length=20, blank=True, help_text='Highest Grade (e.g. Class 12)')
    streams = models.JSONField(default=list, blank=True, help_text='Available streams for 11/12')
    
    # Infrastructure
    capacity = models.IntegerField(default=0, help_text='Total student capacity')
    teacher_count = models.IntegerField(default=0, help_text='Total number of teachers')
    staff_count = models.IntegerField(default=0, help_text='Total number of support staff')
    facilities = models.JSONField(default=list, blank=True, help_text='List of available facilities')
    
    # Principal / Head of School
    principal_name = models.CharField(max_length=100, blank=True)
    principal_email = models.EmailField(blank=True)
    principal_phone = models.CharField(max_length=20, blank=True)
    
    # Branding
    logo = models.ImageField(upload_to='schools/logos/', null=True, blank=True)
    
    # Settings (JSON field for flexible configuration)
    settings = models.JSONField(default=dict, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Subscription/Plan
    plan = models.CharField(max_length=50, default='basic')
    plan_expires_at = models.DateTimeField(null=True, blank=True)
    pricing_plan = models.CharField(max_length=50, default='standard', help_text='Pricing plan tier')
    
    # Usage Stats
    data_usage = models.BigIntegerField(default=0, help_text='Data usage in bytes')
    
    # Feature Configuration
    features_config = models.JSONField(default=dict, blank=True, help_text='Specific feature toggles for this school')
    
    class Meta:
        db_table = 'schools'
        verbose_name = 'School'
        verbose_name_plural = 'Schools'
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    @property
    def full_address(self):
        """Return formatted full address."""
        return f"{self.address}, {self.city}, {self.state} - {self.pincode}"
    
    @property
    def location(self):
        """Return location as dict."""
        if self.latitude and self.longitude:
            return {
                'latitude': float(self.latitude),
                'longitude': float(self.longitude)
            }
        return None


class GlobalSettings(BaseModel):
    """
    System-wide settings managed by Root Admin.
    """
    # Pricing Configuration
    pricing_config = models.JSONField(default=dict, help_text='Global pricing for plans/modules')
    
    # Feature Maintenance/Availability
    maintenance_mode = models.BooleanField(default=False)
    feature_flags = models.JSONField(default=dict, help_text='Global feature toggles')
    
    # System Info
    version = models.CharField(max_length=20, default='1.0.0')
    
    class Meta:
        db_table = 'global_settings'
        verbose_name = 'Global Settings'
        verbose_name_plural = 'Global Settings'
    
    def __str__(self):
        return f"Settings (v{self.version})"
