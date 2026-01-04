"""
User and authentication models.
"""
import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone

from core.models import TimeStampedModel


class UserRole(models.TextChoices):
    """User role choices."""
    ROOT_ADMIN = 'root_admin', 'Root Admin'
    SCHOOL_ADMIN = 'school_admin', 'School Admin'
    OFFICE_STAFF = 'office_staff', 'Office Staff'
    TEACHER = 'teacher', 'Teacher'
    CONDUCTOR = 'conductor', 'Conductor'
    DRIVER = 'driver', 'Driver'
    PARENT = 'parent', 'Parent'
    ACCOUNTANT = 'accountant', 'Accountant'
    LIBRARIAN = 'librarian', 'Librarian'
    NURSE = 'nurse', 'Nurse'
    SECURITY = 'security', 'Security'
    HELPER = 'helper', 'Helper'
    PRINCIPAL = 'principal', 'Principal'
    VICE_PRINCIPAL = 'vice_principal', 'Vice Principal'
    HEAD_MASTER = 'head_master', 'Head Master'
    SUPERVISOR = 'supervisor', 'Supervisor'
    LAB_ASSISTANT = 'lab_assistant', 'Lab Assistant'
    COACH = 'coach', 'Coach'


class UserManager(BaseUserManager):
    """Custom user manager."""
    
    def create_user(self, phone=None, email=None, password=None, **extra_fields):
        """Create and return a regular user."""
        if not phone and not email:
            raise ValueError('Users must have either a phone number or email address')
        
        if email:
            email = self.normalize_email(email)
        
        user = self.model(phone=phone, email=email, **extra_fields)
        
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and return a superuser."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', UserRole.ROOT_ADMIN)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email=email, password=password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    """
    Custom User model with phone and email authentication support.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Authentication fields
    phone = models.CharField(max_length=20, unique=True, null=True, blank=True)
    email = models.EmailField(unique=True, null=True, blank=True)
    
    # Profile fields
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    
    # Role and permissions
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.PARENT
    )
    
    # Status fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_phone_verified = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    
    # Tracking
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    
    # Device tokens for push notifications
    fcm_token = models.CharField(max_length=500, null=True, blank=True)
    device_type = models.CharField(max_length=20, null=True, blank=True)  # android/ios
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name']
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return self.full_name or self.phone or self.email or str(self.id)
    
    @property
    def full_name(self):
        """Return the full name."""
        return f"{self.first_name} {self.last_name}".strip()
    
    def get_short_name(self):
        """Return the short name."""
        return self.first_name


class OTP(TimeStampedModel):
    """
    Model to store OTP for phone verification.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(max_length=20, db_index=True)
    otp = models.CharField(max_length=10)
    purpose = models.CharField(max_length=50, default='login')  # login, register, reset
    is_verified = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    attempts = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'otps'
        verbose_name = 'OTP'
        verbose_name_plural = 'OTPs'
    
    def __str__(self):
        return f"OTP for {self.phone}"
    
    @property
    def is_expired(self):
        """Check if OTP has expired."""
        return timezone.now() > self.expires_at
    
    def increment_attempts(self):
        """Increment verification attempts."""
        self.attempts += 1
        self.save(update_fields=['attempts'])


class SchoolMembership(TimeStampedModel):
    """
    Model to link users to schools with specific roles.
    Allows a user to be part of multiple schools.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='school_memberships'
    )
    school = models.ForeignKey(
        'schools.School',
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    role = models.CharField(max_length=20, choices=UserRole.choices)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'school_memberships'
        unique_together = ('user', 'school')
        verbose_name = 'School Membership'
        verbose_name_plural = 'School Memberships'
    
    def __str__(self):
        return f"{self.user} @ {self.school} ({self.role})"
