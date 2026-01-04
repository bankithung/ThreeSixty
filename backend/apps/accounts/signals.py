"""
Signal handlers for accounts app.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import User


@receiver(post_save, sender=User)
def user_created(sender, instance, created, **kwargs):
    """Handle user creation signals."""
    if created:
        # Add any post-creation logic here
        # For example: send welcome notification
        pass
