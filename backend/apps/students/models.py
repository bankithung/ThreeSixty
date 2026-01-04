"""
Student models.
"""
from django.db import models
from core.models import BaseModel


class Student(BaseModel):
    """
    Model representing a student enrolled in a school.
    """
    school = models.ForeignKey(
        'schools.School',
        on_delete=models.CASCADE,
        related_name='students'
    )
    
    # Student information
    admission_number = models.CharField(max_length=50)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=10,
        choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')],
        null=True,
        blank=True
    )
    
    # Academic info
    grade = models.CharField(max_length=20)  # e.g., "5", "10", "12"
    section = models.CharField(max_length=10, blank=True)  # e.g., "A", "B"
    
    # Photo for identification
    photo = models.ImageField(upload_to='students/photos/', null=True, blank=True)
    
    # Pickup/Drop locations
    pickup_address = models.TextField(null=True, blank=True)
    pickup_latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    pickup_longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    
    drop_address = models.TextField(blank=True)
    drop_latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    drop_longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    
    # Route assignment
    route = models.ForeignKey(
        'transport.Route',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='students'
    )
    stop = models.ForeignKey(
        'transport.Stop',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='students'
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'students'
        verbose_name = 'Student'
        verbose_name_plural = 'Students'
        unique_together = ('school', 'admission_number')
        ordering = ['first_name', 'last_name']
    
    def __str__(self):
        return f"{self.full_name} ({self.admission_number})"
    
    @property
    def full_name(self):
        """Return full name."""
        return f"{self.first_name} {self.last_name}".strip()
    
    @property
    def pickup_location(self):
        """Return pickup location as dict."""
        return {
            'address': self.pickup_address,
            'latitude': float(self.pickup_latitude),
            'longitude': float(self.pickup_longitude)
        }
    
    @property
    def drop_location(self):
        """Return drop location as dict."""
        if self.drop_latitude and self.drop_longitude:
            return {
                'address': self.drop_address or self.pickup_address,
                'latitude': float(self.drop_latitude),
                'longitude': float(self.drop_longitude)
            }
        return self.pickup_location


class Parent(BaseModel):
    """
    Model linking parents to students.
    A parent can have multiple children, a student can have multiple parents.
    """
    RELATION_CHOICES = [
        ('father', 'Father'),
        ('mother', 'Mother'),
        ('guardian', 'Guardian'),
        ('other', 'Other'),
    ]
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='parent_profiles'
    )
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='parents'
    )
    relation = models.CharField(max_length=20, choices=RELATION_CHOICES)
    is_primary = models.BooleanField(default=False)  # Primary contact
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'parents'
        verbose_name = 'Parent'
        verbose_name_plural = 'Parents'
        unique_together = ('user', 'student')
    
    def __str__(self):
        return f"{self.user.full_name} - {self.relation} of {self.student.full_name}"


class FaceEncoding(BaseModel):
    """
    Model to store face encodings for students.
    Multiple encodings per student for better accuracy.
    """
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='face_encodings'
    )
    
    # Face encoding as JSON (128-dimensional vector)
    encoding = models.JSONField()
    
    # Original photo used for this encoding
    photo = models.ImageField(upload_to='students/face_photos/')
    
    # Metadata
    is_primary = models.BooleanField(default=False)
    quality_score = models.FloatField(default=0.0)  # Face detection confidence
    
    class Meta:
        db_table = 'face_encodings'
        verbose_name = 'Face Encoding'
        verbose_name_plural = 'Face Encodings'
    
    def __str__(self):
        return f"Face encoding for {self.student.full_name}"
