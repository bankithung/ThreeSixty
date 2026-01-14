"""
Transport models for buses, routes, trips, and location tracking.
"""
from django.db import models
from core.models import BaseModel


class Bus(BaseModel):
    """
    Model representing a school bus.
    """
    FUEL_TYPE_CHOICES = [
        ('petrol', 'Petrol'),
        ('diesel', 'Diesel'),
        ('cng', 'CNG'),
        ('electric', 'Electric'),
    ]
    
    school = models.ForeignKey(
        'schools.School',
        on_delete=models.CASCADE,
        related_name='buses'
    )
    
    # Bus details
    number = models.CharField(max_length=50)  # Bus number/name (e.g., "Bus 1")
    registration_number = models.CharField(max_length=50)  # Vehicle registration
    
    # Capacity
    capacity = models.PositiveIntegerField(default=40)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Additional info
    make = models.CharField(max_length=100, blank=True)  # e.g., "Tata"
    model = models.CharField(max_length=100, blank=True)  # e.g., "Starbus"
    year = models.PositiveIntegerField(null=True, blank=True)
    color = models.CharField(max_length=50, blank=True)
    
    # === NEW FIELDS FOR BUS PROFILE ===
    # Images (stored as JSON array of URLs)
    images = models.JSONField(default=list, blank=True)
    
    # Telemetry (auto-calculated from trips)
    total_distance_km = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Total distance traveled in kilometers"
    )
    total_duration_hours = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Total time traveled in hours"
    )
    
    # Vehicle lifecycle
    purchase_date = models.DateField(null=True, blank=True,
        help_text="Date when bus was purchased (for age calculation)")
    fuel_type = models.CharField(
        max_length=20, choices=FUEL_TYPE_CHOICES, default='diesel'
    )

    # Compliance & Maintenance
    insurance_expiry_date = models.DateField(null=True, blank=True,
        help_text="Date when insurance policy expires")
    fitness_expiry_date = models.DateField(null=True, blank=True,
        help_text="Date when fitness certificate expires")
    last_maintenance_date = models.DateField(null=True, blank=True,
        help_text="Date of last scheduled maintenance")
    
    class Meta:
        db_table = 'buses'
        verbose_name = 'Bus'
        verbose_name_plural = 'Buses'
        unique_together = ('school', 'number')
    
    def __str__(self):
        return f"{self.number} ({self.registration_number})"
    
    @property
    def age_years(self):
        """Calculate bus age from purchase_date"""
        if self.purchase_date:
            from datetime import date
            today = date.today()
            return (today - self.purchase_date).days // 365
        return None


class BusStaff(BaseModel):
    """
    Model linking staff (drivers, conductors) to buses.
    """
    ROLE_CHOICES = [
        ('driver', 'Driver'),
        ('conductor', 'Conductor'),
    ]
    
    bus = models.ForeignKey(
        Bus,
        on_delete=models.CASCADE,
        related_name='staff'
    )
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='bus_assignments'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'bus_staff'
        verbose_name = 'Bus Staff'
        verbose_name_plural = 'Bus Staff'
        unique_together = ('bus', 'user')
    
    def __str__(self):
        return f"{self.user.full_name} - {self.role} on {self.bus.number}"


class Route(BaseModel):
    """
    Model representing a bus route.
    """
    school = models.ForeignKey(
        'schools.School',
        on_delete=models.CASCADE,
        related_name='routes'
    )
    bus = models.ForeignKey(
        Bus,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='routes'
    )
    
    # Route details
    name = models.CharField(max_length=100)  # e.g., "Route A - North City"
    description = models.TextField(blank=True)
    
    # Timing
    morning_start_time = models.TimeField(null=True, blank=True)
    evening_start_time = models.TimeField(null=True, blank=True)
    
    # Route polyline (encoded polyline from Google Maps)
    route_polyline = models.TextField(blank=True)
    
    # Estimated duration in minutes
    estimated_duration = models.PositiveIntegerField(default=60)
    
    # Distance in kilometers
    distance_km = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'routes'
        verbose_name = 'Route'
        verbose_name_plural = 'Routes'
    
    def __str__(self):
        return self.name


class Stop(BaseModel):
    """
    Model representing a stop on a route.
    """
    route = models.ForeignKey(
        Route,
        on_delete=models.CASCADE,
        related_name='stops'
    )
    
    # Stop details
    name = models.CharField(max_length=100)
    address = models.TextField(blank=True)
    
    # Location
    latitude = models.DecimalField(max_digits=10, decimal_places=7)
    longitude = models.DecimalField(max_digits=10, decimal_places=7)
    
    # Order in route
    sequence = models.PositiveIntegerField()
    
    # Timing (offset from route start in minutes)
    morning_arrival_offset = models.PositiveIntegerField(default=0)
    evening_arrival_offset = models.PositiveIntegerField(default=0)
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'stops'
        verbose_name = 'Stop'
        verbose_name_plural = 'Stops'
        ordering = ['sequence']
        unique_together = ('route', 'sequence')
    
    def __str__(self):
        return f"{self.name} (Stop #{self.sequence})"
    
    @property
    def location(self):
        return {
            'latitude': float(self.latitude),
            'longitude': float(self.longitude)
        }


class TripType(models.TextChoices):
    """Trip type choices."""
    MORNING = 'morning', 'Morning (Pickup)'
    EVENING = 'evening', 'Evening (Drop)'
    SPECIAL = 'special', 'Special Trip'


class TripStatus(models.TextChoices):
    """Trip status choices."""
    SCHEDULED = 'scheduled', 'Scheduled'
    IN_PROGRESS = 'in_progress', 'In Progress'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'


class Trip(BaseModel):
    """
    Model representing a bus trip.
    """
    bus = models.ForeignKey(
        Bus,
        on_delete=models.CASCADE,
        related_name='trips'
    )
    route = models.ForeignKey(
        Route,
        on_delete=models.CASCADE,
        related_name='trips'
    )
    
    # Trip details
    trip_type = models.CharField(
        max_length=20,
        choices=TripType.choices,
        default=TripType.MORNING
    )
    status = models.CharField(
        max_length=20,
        choices=TripStatus.choices,
        default=TripStatus.SCHEDULED
    )
    
    # Timing
    scheduled_start = models.DateTimeField()
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    # Staff on this trip
    driver = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='trips_as_driver'
    )
    conductor = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='trips_as_conductor'
    )
    
    # Summary
    total_students = models.PositiveIntegerField(default=0)
    students_boarded = models.PositiveIntegerField(default=0)
    students_dropped = models.PositiveIntegerField(default=0)
    
    # Telemetry
    distance_traveled = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Distance traveled in this trip (km)"
    )
    duration_minutes = models.PositiveIntegerField(
        default=0,
        help_text="Duration of trip in minutes"
    )
    
    class Meta:
        db_table = 'trips'
        verbose_name = 'Trip'
        verbose_name_plural = 'Trips'
        ordering = ['-scheduled_start']
    
    def __str__(self):
        return f"{self.bus.number} - {self.route.name} ({self.trip_type})"


class LocationUpdate(BaseModel):
    """
    Model for storing bus location updates during a trip.
    """
    trip = models.ForeignKey(
        Trip,
        on_delete=models.CASCADE,
        related_name='location_updates'
    )
    bus = models.ForeignKey(
        Bus,
        on_delete=models.CASCADE,
        related_name='location_updates'
    )
    
    # Location
    latitude = models.DecimalField(max_digits=10, decimal_places=7)
    longitude = models.DecimalField(max_digits=10, decimal_places=7)
    
    # Additional data
    speed = models.FloatField(null=True, blank=True)  # km/h
    heading = models.FloatField(null=True, blank=True)  # degrees
    accuracy = models.FloatField(null=True, blank=True)  # meters
    
    # Timestamp (using created_at from BaseModel)
    
    class Meta:
        db_table = 'location_updates'
        verbose_name = 'Location Update'
        verbose_name_plural = 'Location Updates'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['trip', '-created_at']),
            models.Index(fields=['bus', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.bus.number} @ {self.latitude}, {self.longitude}"
    
    @property
    def location(self):
        return {
            'latitude': float(self.latitude),
            'longitude': float(self.longitude)
        }


class BusFuelEntry(BaseModel):
    """
    Track fuel usage entries for a bus.
    """
    bus = models.ForeignKey(
        Bus,
        on_delete=models.CASCADE,
        related_name='fuel_entries'
    )
    date = models.DateField()
    liters = models.DecimalField(max_digits=8, decimal_places=2)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    odometer_reading = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Odometer reading at time of fill"
    )
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'bus_fuel_entries'
        verbose_name = 'Bus Fuel Entry'
        verbose_name_plural = 'Bus Fuel Entries'
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.bus.number} - {self.liters}L on {self.date}"


class BusExpense(BaseModel):
    """
    Track all expenses for a bus (maintenance, insurance, repairs, etc.).
    """
    CATEGORY_CHOICES = [
        ('fuel', 'Fuel'),
        ('maintenance', 'Maintenance'),
        ('insurance', 'Insurance'),
        ('repair', 'Repair'),
        ('tax', 'Tax/Registration'),
        ('cleaning', 'Cleaning'),
        ('salary', 'Staff Salary'),
        ('parking', 'Parking/Toll'),
        ('other', 'Other'),
    ]
    
    bus = models.ForeignKey(
        Bus,
        on_delete=models.CASCADE,
        related_name='expenses'
    )
    date = models.DateField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField()
    receipt_url = models.CharField(max_length=500, blank=True,
        help_text="URL to uploaded receipt image")
    
    class Meta:
        db_table = 'bus_expenses'
        verbose_name = 'Bus Expense'
        verbose_name_plural = 'Bus Expenses'
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.bus.number} - {self.category}: ₹{self.amount}"


class BusEarning(BaseModel):
    """
    Track earnings associated with a bus.
    """
    EARNING_TYPE_CHOICES = [
        ('trip', 'Trip Fee'),
        ('monthly', 'Monthly Subscription'),
        ('special', 'Special Trip'),
        ('other', 'Other'),
    ]
    
    bus = models.ForeignKey(
        Bus,
        on_delete=models.CASCADE,
        related_name='earnings'
    )
    date = models.DateField()
    trip = models.ForeignKey(
        'Trip',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='earnings',
        help_text="Link to specific trip if applicable"
    )
    earning_type = models.CharField(max_length=20, choices=EARNING_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True)
    
    class Meta:
        db_table = 'bus_earnings'
        verbose_name = 'Bus Earning'
        verbose_name_plural = 'Bus Earnings'
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.bus.number} - {self.earning_type}: ₹{self.amount}"
