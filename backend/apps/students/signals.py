from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Student

@receiver(pre_save, sender=Student)
def sync_student_stop_location(sender, instance, **kwargs):
    """
    Signal to automatically update student's pickup location
    when a Stop is assigned.
    """
    # Check if stop is assigned and route is present
    if instance.stop:
        # If pickup location is not manually set, or if stop changed
        # We want to ensure the pickup location matches the stop
        
        # We can detect if stop changed by getting the old instance, but pre_save is easier
        # Just always overwrite if stop is present, or maybe only if empty?
        # Better: Always sync to stop if stop is assigned, as the stop is the authority
        
        if instance.stop.latitude and instance.stop.longitude:
            print(f"DEBUG: Syncing student {instance.admission_number} location to stop {instance.stop.name}")
            instance.pickup_latitude = instance.stop.latitude
            instance.pickup_longitude = instance.stop.longitude
            instance.pickup_address = instance.stop.address
