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


class GenderChoices(models.TextChoices):
    """Gender choices."""
    MALE = 'male', 'Male'
    FEMALE = 'female', 'Female'
    OTHER = 'other', 'Other'


class MaritalStatusChoices(models.TextChoices):
    """Marital status choices."""
    SINGLE = 'single', 'Single'
    MARRIED = 'married', 'Married'
    DIVORCED = 'divorced', 'Divorced'
    WIDOWED = 'widowed', 'Widowed'


class IDTypeChoices(models.TextChoices):
    """ID type choices."""
    AADHAR = 'aadhar', 'Aadhar Card'
    VOTER_ID = 'voter_id', 'Voter ID'
    PASSPORT = 'passport', 'Passport'
    PAN = 'pan', 'PAN Card'
    DRIVING_LICENSE = 'driving_license', 'Driving License'


class LicenseClassChoices(models.TextChoices):
    """Driving license class choices."""
    HMV = 'hmv', 'HMV (Heavy Motor Vehicle)'
    TRANSPORT = 'transport', 'Transport Vehicle'
    PSV = 'psv', 'PSV/PSC (Passenger Stage Carriage)'
    LMV = 'lmv', 'LMV (Light Motor Vehicle)'


class VisionStatusChoices(models.TextChoices):
    """Vision status choices."""
    NORMAL = 'normal', 'Normal'
    WITH_GLASSES = 'with_glasses', 'With Glasses'
    WITH_CONTACTS = 'with_contacts', 'With Contact Lenses'


class StaffProfile(TimeStampedModel):
    """
    Extended profile for staff members (Drivers, Conductors, etc.)
    Stores all detailed application form data.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='staff_profile'
    )
    
    # Personal Details
    father_name = models.CharField(max_length=150, blank=True, null=True, verbose_name="Father's/Spouse Name")
    gender = models.CharField(max_length=10, choices=GenderChoices.choices, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    marital_status = models.CharField(max_length=20, choices=MaritalStatusChoices.choices, blank=True, null=True)
    nationality = models.CharField(max_length=50, default='Indian', blank=True)
    permanent_address = models.TextField(blank=True, null=True)
    present_address = models.TextField(blank=True, null=True)
    photo = models.ImageField(upload_to='staff_photos/', blank=True, null=True)
    
    # Emergency Contact
    emergency_contact_name = models.CharField(max_length=100, blank=True, null=True)
    emergency_contact_relation = models.CharField(max_length=50, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True, null=True)
    
    # Identification
    id_type = models.CharField(max_length=20, choices=IDTypeChoices.choices, blank=True, null=True)
    id_number = models.CharField(max_length=50, blank=True, null=True)
    languages_known = models.CharField(max_length=200, blank=True, null=True, help_text="Comma-separated list of languages")
    
    # Driving License (for Drivers)
    license_number = models.CharField(max_length=50, blank=True, null=True)
    license_class = models.CharField(max_length=20, choices=LicenseClassChoices.choices, blank=True, null=True)
    license_rta = models.CharField(max_length=100, blank=True, null=True, verbose_name="Issuing RTA/State")
    license_issue_date = models.DateField(blank=True, null=True)
    license_expiry_date = models.DateField(blank=True, null=True)
    license_endorsements = models.CharField(max_length=200, blank=True, null=True, help_text="PSV Badge, etc.")
    
    # Conductor License (for Conductors)
    conductor_license_number = models.CharField(max_length=50, blank=True, null=True)
    conductor_license_authority = models.CharField(max_length=100, blank=True, null=True)
    conductor_license_valid_until = models.DateField(blank=True, null=True)
    willing_to_obtain_license = models.BooleanField(default=False)
    
    # Experience & Qualifications
    experience_years = models.PositiveIntegerField(blank=True, null=True, verbose_name="Years of Experience")
    education = models.CharField(max_length=200, blank=True, null=True, verbose_name="Educational Qualification")
    previous_employment = models.TextField(blank=True, null=True, help_text="Previous employer details")
    professional_training = models.CharField(max_length=300, blank=True, null=True, help_text="First aid, defensive driving, etc.")
    
    # Health & Fitness
    height_cm = models.PositiveIntegerField(blank=True, null=True, verbose_name="Height (cm)")
    weight_kg = models.PositiveIntegerField(blank=True, null=True, verbose_name="Weight (kg)")
    vision_status = models.CharField(max_length=20, choices=VisionStatusChoices.choices, blank=True, null=True)
    medical_history = models.TextField(blank=True, null=True, help_text="Chronic illnesses, prior accidents")
    fitness_confirmed = models.BooleanField(default=False, verbose_name="Physically fit to work")
    medical_certificate = models.FileField(upload_to='medical_certificates/', blank=True, null=True)
    
    # Background Check
    police_verification_obtained = models.BooleanField(default=False)
    police_verification_certificate = models.FileField(upload_to='police_certificates/', blank=True, null=True)
    no_criminal_record = models.BooleanField(default=False)
    criminal_record_certificate = models.FileField(upload_to='criminal_certificates/', blank=True, null=True)
    
    # Employment Details
    available_start_date = models.DateField(blank=True, null=True)
    preferred_working_hours = models.CharField(max_length=100, blank=True, null=True)
    last_drawn_salary = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    expected_salary = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    willing_fulltime = models.BooleanField(default=True)
    understands_duties = models.BooleanField(default=False)
    
    # Declaration
    declaration_signed = models.BooleanField(default=False)
    declaration_date = models.DateField(blank=True, null=True)
    
    # Documents (stored as file fields)
    id_proof_document = models.FileField(upload_to='staff_documents/id/', blank=True, null=True)
    address_proof_document = models.FileField(upload_to='staff_documents/address/', blank=True, null=True)
    education_certificate = models.FileField(upload_to='staff_documents/education/', blank=True, null=True)
    experience_certificate = models.FileField(upload_to='staff_documents/experience/', blank=True, null=True)
    license_document = models.FileField(upload_to='staff_documents/license/', blank=True, null=True)
    
    class Meta:
        db_table = 'staff_profiles'
        verbose_name = 'Staff Profile'
        verbose_name_plural = 'Staff Profiles'
    
    def __str__(self):
        return f"Profile: {self.user.full_name}"


class ParentProfile(TimeStampedModel):
    """
    Extended profile for parent/guardian users (Section 2).
    Stores professional details, government ID, alumni status.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='parent_profile'
    )
    
    # Professional Details
    occupation = models.CharField(max_length=100, blank=True)
    designation = models.CharField(max_length=100, blank=True)
    organization = models.CharField(max_length=200, blank=True)
    annual_income = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    education_qualification = models.CharField(max_length=100, blank=True)
    
    # Government ID
    government_id_type = models.CharField(max_length=30, blank=True, choices=IDTypeChoices.choices)
    government_id_number = models.CharField(max_length=50, blank=True)
    
    # Alumni Status
    is_alumni = models.BooleanField(default=False)
    alumni_year = models.CharField(max_length=4, blank=True)
    alumni_house = models.CharField(max_length=50, blank=True)
    
    # Address
    address = models.TextField(blank=True)
    
    # Photo
    photo = models.ImageField(upload_to='parent_photos/', null=True, blank=True)
    
    class Meta:
        db_table = 'parent_profiles'
        verbose_name = 'Parent Profile'
        verbose_name_plural = 'Parent Profiles'
    
    def __str__(self):
        return f"Parent Profile: {self.user.full_name}"


