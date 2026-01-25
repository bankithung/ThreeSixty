"""
Student models - Comprehensive Admission System.
All models use UUID primary keys (via BaseModel) and link to School UUID.
"""
from django.db import models
from core.models import BaseModel


# ========== CHOICES ==========
BLOOD_GROUP_CHOICES = [
    ('A+', 'A+'), ('A-', 'A-'), ('B+', 'B+'), ('B-', 'B-'),
    ('O+', 'O+'), ('O-', 'O-'), ('AB+', 'AB+'), ('AB-', 'AB-'),
    ('unknown', 'Unknown'),
]

SOCIAL_CATEGORY_CHOICES = [
    ('general', 'General'),
    ('sc', 'SC (Scheduled Caste)'),
    ('st', 'ST (Scheduled Tribe)'),
    ('obc', 'OBC (Other Backward Class)'),
    ('ews', 'EWS (Economically Weaker Section)'),
]

RELIGION_CHOICES = [
    ('hindu', 'Hindu'), ('muslim', 'Muslim'), ('christian', 'Christian'),
    ('sikh', 'Sikh'), ('buddhist', 'Buddhist'), ('jain', 'Jain'),
    ('parsi', 'Parsi'), ('jewish', 'Jewish'), ('other', 'Other'),
]

DISABILITY_TYPE_CHOICES = [
    ('visual', 'Visual Impairment'),
    ('hearing', 'Hearing Impairment'),
    ('locomotor', 'Locomotor Disability'),
    ('cognitive', 'Cognitive/Intellectual'),
    ('multiple', 'Multiple Disabilities'),
    ('other', 'Other'),
]

BOARD_CHOICES = [
    ('cbse', 'CBSE'), ('icse', 'ICSE/ISC'), ('ib', 'IB'),
    ('igcse', 'Cambridge IGCSE'), ('state', 'State Board'), ('other', 'Other'),
]

MEDIUM_CHOICES = [
    ('english', 'English'), ('hindi', 'Hindi'), ('regional', 'Regional Language'),
]

STUDENT_CATEGORY_CHOICES = [
    ('day_scholar', 'Day Scholar'),
    ('boarder', 'Boarder'),
    ('weekly_boarder', 'Weekly Boarder'),
]

TRANSPORT_MODE_CHOICES = [
    ('school_bus', 'School Bus'),
    ('private_car', 'Private Car'),
    ('walk', 'Walk'),
    ('public_transport', 'Public Transport'),
    ('bicycle', 'Bicycle'),
]

CLASS_RESULT_CHOICES = [
    ('passed', 'Passed'),
    ('failed', 'Failed'),
    ('promoted', 'Promoted on Trial'),
]

AREA_CLASSIFICATION_CHOICES = [
    ('urban', 'Urban'),
    ('rural', 'Rural'),
]


class Student(BaseModel):
    """
    Comprehensive Student model for admission system.
    UUID primary key via BaseModel, linked to School UUID.
    """
    # ========== CORE LINKING ==========
    school = models.ForeignKey(
        'schools.School',
        on_delete=models.CASCADE,
        related_name='students',
        help_text='School UUID - ensures data isolation'
    )
    
    # ========== SECTION 1: CORE IDENTITY ==========
    admission_number = models.CharField(max_length=50)
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    birth_place = models.CharField(max_length=100, blank=True)
    gender = models.CharField(
        max_length=15,
        choices=[('male', 'Male'), ('female', 'Female'), ('transgender', 'Transgender')],
        blank=True
    )
    blood_group = models.CharField(max_length=10, blank=True, choices=BLOOD_GROUP_CHOICES)
    
    # Demographics
    religion = models.CharField(max_length=50, blank=True, choices=RELIGION_CHOICES)
    nationality = models.CharField(max_length=50, default='Indian')
    mother_tongue = models.CharField(max_length=50, blank=True)
    social_category = models.CharField(max_length=20, blank=True, choices=SOCIAL_CATEGORY_CHOICES)
    aadhar_number = models.CharField(max_length=12, blank=True, help_text='12-digit Aadhaar')
    
    # Socio-Economic Status (Section 1.2)
    bpl_status = models.BooleanField(default=False, help_text='Below Poverty Line')
    bpl_card_number = models.CharField(max_length=50, blank=True)
    ews_status = models.BooleanField(default=False, help_text='Economically Weaker Section')
    ews_certificate_number = models.CharField(max_length=50, blank=True)
    is_cwsn = models.BooleanField(default=False, help_text='Children with Special Needs')
    disability_type = models.CharField(max_length=50, blank=True, choices=DISABILITY_TYPE_CHOICES)
    
    # Photo
    photo = models.ImageField(upload_to='students/photos/', null=True, blank=True)
    
    # ========== SECTION 3: ADDRESS (DUAL) ==========
    # Current/Correspondence Address
    current_house_number = models.CharField(max_length=50, blank=True)
    current_building_name = models.CharField(max_length=100, blank=True)
    current_street = models.CharField(max_length=200, blank=True)
    current_locality = models.CharField(max_length=100, blank=True)
    current_city = models.CharField(max_length=100, blank=True)
    current_district = models.CharField(max_length=100, blank=True)
    current_state = models.CharField(max_length=100, blank=True)
    current_pincode = models.CharField(max_length=10, blank=True)
    
    # Permanent Address
    same_as_current = models.BooleanField(default=True)
    permanent_house_number = models.CharField(max_length=50, blank=True)
    permanent_building_name = models.CharField(max_length=100, blank=True)
    permanent_street = models.CharField(max_length=200, blank=True)
    permanent_locality = models.CharField(max_length=100, blank=True)
    permanent_city = models.CharField(max_length=100, blank=True)
    permanent_district = models.CharField(max_length=100, blank=True)
    permanent_state = models.CharField(max_length=100, blank=True)
    permanent_pincode = models.CharField(max_length=10, blank=True)
    
    # UDISE+ Classification
    area_classification = models.CharField(max_length=10, blank=True, choices=AREA_CLASSIFICATION_CHOICES)
    
    # ========== SECTION 4: ACADEMIC ==========
    grade = models.CharField(max_length=20)
    section = models.CharField(max_length=10, blank=True)
    
    # Academic History
    previous_school_name = models.CharField(max_length=200, blank=True)
    previous_school_city = models.CharField(max_length=100, blank=True)
    previous_board = models.CharField(max_length=50, blank=True, choices=BOARD_CHOICES)
    previous_medium = models.CharField(max_length=50, blank=True, choices=MEDIUM_CHOICES)
    last_class_studied = models.CharField(max_length=20, blank=True)
    last_class_result = models.CharField(max_length=30, blank=True, choices=CLASS_RESULT_CHOICES)
    has_tc = models.BooleanField(default=True, help_text='Has Transfer Certificate')
    tc_number = models.CharField(max_length=50, blank=True)
    tc_date = models.DateField(null=True, blank=True)
    
    # Curriculum Selection
    third_language = models.CharField(max_length=50, blank=True, help_text='Sanskrit/French/German etc.')
    skill_subjects = models.JSONField(default=list, blank=True, help_text='For Class 9-10')
    
    # ========== SECTION 6: TRANSPORT ==========
    transport_opted = models.BooleanField(default=False)
    transport_mode = models.CharField(max_length=20, blank=True, choices=TRANSPORT_MODE_CHOICES)
    
    # Pickup location
    pickup_address = models.TextField(blank=True)
    pickup_latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    pickup_longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    
    # Drop location
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
    
    # Transport Agreements
    indemnity_bond_signed = models.BooleanField(default=False)
    behavior_contract_signed = models.BooleanField(default=False)
    
    # ========== SECTION 7: FINANCIAL ==========
    student_category = models.CharField(max_length=20, default='day_scholar', choices=STUDENT_CATEGORY_CHOICES)
    
    # Concessions
    has_sibling_discount = models.BooleanField(default=False)
    sibling_admission_number = models.CharField(max_length=50, blank=True)
    is_staff_ward = models.BooleanField(default=False)
    scholarship_type = models.CharField(max_length=50, blank=True, help_text='Merit/Sports/Other')
    is_rte_quota = models.BooleanField(default=False, help_text='Right to Education quota')
    
    # Banking (DBT)
    bank_account_number = models.CharField(max_length=30, blank=True)
    bank_account_holder = models.CharField(max_length=100, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    bank_branch = models.CharField(max_length=100, blank=True)
    bank_ifsc = models.CharField(max_length=15, blank=True)
    is_aadhar_seeded = models.BooleanField(default=False, help_text='Bank linked to Aadhaar')
    
    # ========== SECTION 8: INTERNATIONAL (FRRO) ==========
    is_international = models.BooleanField(default=False)
    passport_number = models.CharField(max_length=50, blank=True)
    passport_country = models.CharField(max_length=50, blank=True)
    passport_issue_date = models.DateField(null=True, blank=True)
    passport_expiry_date = models.DateField(null=True, blank=True)
    visa_type = models.CharField(max_length=30, blank=True, help_text='S-Visa/X-Visa/Diplomatic')
    is_oci = models.BooleanField(default=False, help_text='Overseas Citizen of India')
    oci_number = models.CharField(max_length=50, blank=True)
    frro_number = models.CharField(max_length=50, blank=True)
    arrival_date = models.DateField(null=True, blank=True)
    
    # ========== SECTION 9: CONSENTS ==========
    consent_website_media = models.BooleanField(default=False)
    consent_yearbook_media = models.BooleanField(default=False)
    consent_social_media = models.BooleanField(default=False)
    consent_acceptable_use = models.BooleanField(default=False)
    consent_data_processing = models.BooleanField(default=False)
    consent_third_party_sharing = models.BooleanField(default=False)
    consent_field_trips = models.BooleanField(default=False)
    consent_emergency_medical = models.BooleanField(default=False)
    
    # Status
    is_active = models.BooleanField(default=True)
    admission_date = models.DateField(null=True, blank=True)
    
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
        """Return full name including middle name."""
        parts = [self.first_name, self.middle_name, self.last_name]
        return ' '.join(p for p in parts if p).strip()
    
    @property
    def pickup_location(self):
        """Return pickup location as dict."""
        if self.pickup_latitude and self.pickup_longitude:
            return {
                'address': self.pickup_address,
                'latitude': float(self.pickup_latitude),
                'longitude': float(self.pickup_longitude)
            }
        return None
    
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
    
    @property
    def current_address_full(self):
        """Return formatted current address."""
        parts = [
            self.current_house_number,
            self.current_building_name,
            self.current_street,
            self.current_locality,
            self.current_city,
            self.current_district,
            self.current_state,
            self.current_pincode
        ]
        return ', '.join(p for p in parts if p)


class Parent(BaseModel):
    """
    Model linking parents/guardians to students.
    A parent can have multiple children, a student can have multiple parents.
    Extended with custodial details per Section 2 requirements.
    """
    RELATION_CHOICES = [
        ('father', 'Father'),
        ('mother', 'Mother'),
        ('step_father', 'Step-Father'),
        ('step_mother', 'Step-Mother'),
        ('guardian', 'Legal Guardian'),
        ('grandparent', 'Grandparent'),
        ('local_guardian', 'Local Guardian'),
        ('other', 'Other'),
    ]
    
    LG_AUTHORIZATION_CHOICES = [
        ('full', 'Full Authorization (Medical + Logistical)'),
        ('medical_only', 'Medical Decisions Only'),
        ('logistical_only', 'Logistical Decisions Only'),
        ('emergency_only', 'Emergency Only'),
    ]
    
    LG_VISITING_RIGHTS_CHOICES = [
        ('weekend_exeat', 'Allowed Weekend Exeats'),
        ('campus_only', 'Campus Visits Only'),
        ('no_visits', 'No Visiting Rights'),
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
    is_primary = models.BooleanField(default=False, help_text='Primary contact')
    is_active = models.BooleanField(default=True)
    
    # ========== SECTION 2: CUSTODIAL DETAILS ==========
    is_custodial_parent = models.BooleanField(default=True, help_text='Parent with physical custody')
    has_legal_restraining_order = models.BooleanField(default=False, help_text='RED FLAG - Court order')
    is_primary_payer = models.BooleanField(default=False, help_text='Billing responsibility')
    
    # ========== LOCAL GUARDIAN FIELDS (for boarders/expats) ==========
    is_local_guardian = models.BooleanField(default=False)
    lg_authorization_level = models.CharField(
        max_length=50, blank=True, 
        choices=LG_AUTHORIZATION_CHOICES,
        help_text='Level of authority for local guardian'
    )
    lg_visiting_rights = models.CharField(
        max_length=50, blank=True, 
        choices=LG_VISITING_RIGHTS_CHOICES,
        help_text='Visiting/exeat permissions'
    )
    lg_proximity_km = models.PositiveIntegerField(null=True, blank=True, help_text='Distance from school in km')
    lg_address = models.TextField(blank=True, help_text='Local guardian address')
    
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


# ========== SECTION 5: STUDENT HEALTH MODEL ==========
class StudentHealth(BaseModel):
    """
    Medical and health information for student (Section 5).
    Includes IHP triggers, allergies, vaccinations, physical impairments.
    """
    student = models.OneToOneField(
        Student, 
        on_delete=models.CASCADE, 
        related_name='health'
    )
    
    # Chronic Conditions (IHP Triggers)
    has_asthma = models.BooleanField(default=False)
    asthma_action_plan = models.JSONField(default=dict, blank=True, help_text='Green/Yellow/Red zones')
    has_diabetes = models.BooleanField(default=False)
    diabetes_protocol = models.JSONField(default=dict, blank=True, help_text='Insulin, glucagon details')
    has_epilepsy = models.BooleanField(default=False)
    epilepsy_protocol = models.JSONField(default=dict, blank=True)
    other_conditions = models.TextField(blank=True)
    
    # Allergy Matrix (JSON for flexibility)
    allergies_dietary = models.JSONField(default=list, blank=True, help_text='peanuts, gluten, dairy')
    allergies_environmental = models.JSONField(default=list, blank=True, help_text='bee stings, pollen')
    allergies_medicinal = models.JSONField(default=list, blank=True, help_text='penicillin, aspirin')
    
    # Vaccination Registry
    vaccine_bcg_date = models.DateField(null=True, blank=True)
    vaccine_dpt_date = models.DateField(null=True, blank=True)
    vaccine_polio_date = models.DateField(null=True, blank=True)
    vaccine_mmr_date = models.DateField(null=True, blank=True)
    vaccine_hepatitis_b_date = models.DateField(null=True, blank=True)
    vaccine_varicella_date = models.DateField(null=True, blank=True)
    
    # Physical Impairments
    wears_glasses = models.BooleanField(default=False)
    uses_hearing_aid = models.BooleanField(default=False)
    mobility_aid = models.CharField(max_length=50, blank=True, help_text='Crutches/Wheelchair/None')
    
    # Emergency Medical
    doctor_name = models.CharField(max_length=100, blank=True)
    doctor_phone = models.CharField(max_length=20, blank=True)
    hospital_preference = models.CharField(max_length=200, blank=True)
    
    class Meta:
        db_table = 'student_health'
        verbose_name = 'Student Health Record'
        verbose_name_plural = 'Student Health Records'
    
    def __str__(self):
        return f"Health record for {self.student.full_name}"


# ========== SECTION 6: AUTHORIZED PICKUP MODEL ==========
class AuthorizedPickup(BaseModel):
    """
    Authorized personnel for student pickup - transport security (Section 6.2).
    Includes photo ID and optional secret password.
    """
    student = models.ForeignKey(
        Student, 
        on_delete=models.CASCADE, 
        related_name='authorized_pickups'
    )
    name = models.CharField(max_length=100)
    relationship = models.CharField(max_length=50)
    phone = models.CharField(max_length=20)
    photo = models.ImageField(upload_to='authorized_pickups/', null=True, blank=True)
    secret_password = models.CharField(max_length=50, blank=True, help_text='Verbal verification password')
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'authorized_pickups'
        verbose_name = 'Authorized Pickup Person'
        verbose_name_plural = 'Authorized Pickup Persons'
    
    def __str__(self):
        return f"{self.name} ({self.relationship}) - {self.student.full_name}"


# ========== SECTION 10: STUDENT DOCUMENTS MODEL ==========
DOCUMENT_TYPE_CHOICES = [
    # Mandatory
    ('birth_certificate', 'Birth Certificate'),
    ('transfer_certificate', 'Transfer Certificate'),
    ('report_card', 'Report Card/Marksheet'),
    ('residence_proof', 'Residence Proof'),
    ('student_photo', 'Student Photograph'),
    ('parent_id_proof', 'Parent/Guardian ID Proof'),
    # Conditional
    ('caste_certificate', 'Caste Certificate'),
    ('medical_certificate', 'Medical Fitness Certificate'),
    ('disability_certificate', 'Disability Certificate'),
    ('single_parent_proof', 'Single Parent Proof'),
    ('passport', 'Passport Copy'),
    ('visa', 'Visa Copy'),
    ('affidavit', 'Affidavit (No TC)'),
    ('local_guardian_photo', 'Local Guardian Photo'),
    ('authorized_pickup_photo', 'Authorized Pickup Photo'),
    ('other', 'Other'),
]


class StudentDocument(BaseModel):
    """
    Document repository for student admission (Section 10).
    Supports file uploads with verification workflow.
    """
    student = models.ForeignKey(
        Student, 
        on_delete=models.CASCADE, 
        related_name='documents'
    )
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPE_CHOICES)
    file = models.FileField(upload_to='student_documents/')
    original_filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(default=0, help_text='File size in bytes')
    
    # Verification
    is_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(
        'accounts.User', 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        related_name='verified_documents'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    
    # Notes
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'student_documents'
        verbose_name = 'Student Document'
        verbose_name_plural = 'Student Documents'
        ordering = ['document_type', '-created_at']
    
    def __str__(self):
        return f"{self.get_document_type_display()} - {self.student.full_name}"

