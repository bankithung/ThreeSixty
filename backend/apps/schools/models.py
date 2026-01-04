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
    code = models.CharField(max_length=50, unique=True)  # Short code for the school
    
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
    
    # Branding
    logo = models.ImageField(upload_to='schools/logos/', null=True, blank=True)
    
    # Settings (JSON field for flexible configuration)
    settings = models.JSONField(default=dict, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Subscription/Plan (for future use)
    plan = models.CharField(max_length=50, default='basic')
    plan_expires_at = models.DateTimeField(null=True, blank=True)
    
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
