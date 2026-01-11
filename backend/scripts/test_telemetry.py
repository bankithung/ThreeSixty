
import os
import django
import sys
from decimal import Decimal

# Setup Django environment
sys.path.append('c:/Users/Asus/Documents/ThreeSixty/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.transport.models import Bus, Trip, TripStatus, Route, LocationUpdate, BusStaff
from apps.schools.models import School
from apps.accounts.models import User, UserRole
from django.utils import timezone
from rest_framework.test import APIClient

def run_test():
    print("Setting up test data...")
    # Create or get School
    school, _ = School.objects.get_or_create(
        code="test-school",
        defaults={
            'name': "Test School",
            'address': "123 Test St",
            'city': "Test City",
            'state': "TS",
            'pincode': "123456"
        }
    )
    
    # Create Bus
    bus, _ = Bus.objects.get_or_create(
        number="TestBus-001", 
        school=school,
        defaults={'registration_number': 'TEST-001', 'total_distance_km': 0, 'total_duration_hours': 0}
    )
    initial_bus_dist = bus.total_distance_km
    print(f"Initial Bus Distance: {initial_bus_dist}")

    # Create Route
    route, _ = Route.objects.get_or_create(name="Test Route", school=school)

    # Create Trip
    trip = Trip.objects.create(
        bus=bus,
        route=route,
        status=TripStatus.IN_PROGRESS,
        scheduled_start=timezone.now(),
        started_at=timezone.now()
    )
    print(f"Created Trip: {trip.id}")

    # Create driver user
    driver = User.objects.create(
        email='driver@test.com', 
        role=UserRole.DRIVER, 
        is_active=True,
        first_name="Test",
        last_name="Driver"
    )
    # Assign driver to bus using BusStaff
    BusStaff.objects.create(bus=bus, user=driver, role='driver')

    client = APIClient()
    client.force_authenticate(user=driver)

    # Point 1: 0, 0
    print("Sending Update 1: 0, 0")
    data1 = {
        'latitude': 0.0,
        'longitude': 0.0,
        'speed': 50,
        'heading': 90
    }
    
    response1 = client.post(f'/transport/trips/{trip.id}/location/', data1, format='json')
    print(f"Response 1: {response1.status_code}")
    
    # Point 2: 0.01, 0.0 (approx 1.11 km away)
    print("Sending Update 2: 0.01, 0.0")
    data2 = {
        'latitude': 0.01,
        'longitude': 0.0,
        'speed': 50,
        'heading': 90
    }
    response2 = client.post(f'/transport/trips/{trip.id}/location/', data2, format='json')
    print(f"Response 2: {response2.status_code}")

    # Verify
    trip.refresh_from_db()
    bus.refresh_from_db()
    
    print(f"Trip Distance: {trip.distance_traveled} km")
    print(f"Trip Duration: {trip.duration_minutes} min")
    
    if trip.distance_traveled > 0.5:
        print("SUCCESS: Distance updated!")
    else:
        print(f"FAILURE: Distance {trip.distance_traveled} too small or 0.")

    # Cleanup
    trip.delete()
    driver.delete()
    # bus not deleted

if __name__ == "__main__":
    try:
        run_test()
    except Exception as e:
        print(f"Error: {e}")
