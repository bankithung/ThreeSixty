"""
Utility functions for the ThreeSixty project.
"""
import random
import string
from django.conf import settings


def generate_otp(length=None):
    """
    Generate a numeric OTP of specified length.
    """
    if length is None:
        length = getattr(settings, 'OTP_LENGTH', 6)
    return ''.join(random.choices(string.digits, k=length))


def format_phone_number(phone):
    """
    Format phone number to a consistent format.
    Removes spaces, dashes, and ensures country code.
    """
    if not phone:
        return None
    
    # Remove all non-digit characters except +
    cleaned = ''.join(c for c in phone if c.isdigit() or c == '+')
    
    # Add +91 for Indian numbers if no country code
    if not cleaned.startswith('+'):
        if len(cleaned) == 10:
            cleaned = '+91' + cleaned
    
    return cleaned


def mask_phone_number(phone):
    """
    Mask a phone number for display (e.g., +91 ****2345).
    """
    if not phone or len(phone) < 4:
        return phone
    
    visible_digits = 4
    return phone[:-visible_digits].replace(phone[-10:-visible_digits], '****') + phone[-visible_digits:]


def get_client_ip(request):
    """
    Get the client IP address from the request.
    Handles proxy headers.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
