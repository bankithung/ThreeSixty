"""
Notification services for sending push notifications.
"""
import logging
from django.conf import settings
from django.utils import timezone

from .models import Notification, NotificationType

logger = logging.getLogger(__name__)

# Firebase Admin SDK
FIREBASE_INITIALIZED = False

try:
    import firebase_admin
    from firebase_admin import credentials, messaging
    
    # Initialize Firebase if credentials file exists
    cred_path = getattr(settings, 'FIREBASE_CREDENTIALS_PATH', '')
    if cred_path:
        try:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            FIREBASE_INITIALIZED = True
            logger.info("Firebase initialized successfully")
        except Exception as e:
            logger.warning(f"Firebase initialization failed: {e}")
except ImportError:
    logger.warning("firebase-admin not installed")


def send_push_notification(user, title, body, data=None):
    """
    Send push notification to a user via FCM.
    
    Args:
        user: User object with fcm_token
        title: Notification title
        body: Notification body
        data: Additional data payload (dict)
    
    Returns:
        bool: True if sent successfully, False otherwise
    """
    if not user.fcm_token:
        logger.warning(f"User {user.id} has no FCM token")
        return False
    
    if not FIREBASE_INITIALIZED:
        logger.info(f"[MOCK PUSH] To: {user.id}, Title: {title}, Body: {body}")
        return True
    
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=data or {},
            token=user.fcm_token,
            android=messaging.AndroidConfig(
                priority='high',
                notification=messaging.AndroidNotification(
                    icon='ic_notification',
                    color='#4CAF50',
                    sound='default',
                ),
            ),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(
                        sound='default',
                        badge=1,
                    ),
                ),
            ),
        )
        
        response = messaging.send(message)
        logger.info(f"Push notification sent: {response}")
        return True
    
    except Exception as e:
        logger.error(f"Failed to send push notification: {e}")
        return False


def send_attendance_notification(attendance):
    """
    Send notification to parents when a student checks in/out.
    
    Args:
        attendance: Attendance object
    """
    from apps.students.models import Parent
    from apps.attendance.models import EventType
    
    student = attendance.student
    
    # Get all parent users for this student
    parents = Parent.objects.filter(
        student=student,
        is_active=True
    ).select_related('user')
    
    # Prepare notification content
    if attendance.event_type == EventType.CHECKIN:
        title = f"{student.first_name} boarded the bus"
        body = f"{student.full_name} has boarded the school bus at {attendance.timestamp.strftime('%I:%M %p')}"
        notification_type = NotificationType.CHECKIN
    else:
        title = f"{student.first_name} got off the bus"
        body = f"{student.full_name} has been dropped off at {attendance.timestamp.strftime('%I:%M %p')}"
        notification_type = NotificationType.CHECKOUT
    
    # Prepare data payload
    data = {
        'type': notification_type,
        'student_id': str(student.id),
        'trip_id': str(attendance.trip_id),
        'timestamp': attendance.timestamp.isoformat(),
    }
    
    if attendance.latitude and attendance.longitude:
        data['latitude'] = str(attendance.latitude)
        data['longitude'] = str(attendance.longitude)
    
    # Send to all parents
    for parent in parents:
        user = parent.user
        
        # Create notification record
        notification = Notification.objects.create(
            user=user,
            title=title,
            body=body,
            notification_type=notification_type,
            student=student,
            trip=attendance.trip,
            data=data,
        )
        
        # Send push notification
        if send_push_notification(user, title, body, data):
            notification.is_pushed = True
            notification.pushed_at = timezone.now()
            notification.save(update_fields=['is_pushed', 'pushed_at'])


def send_trip_notification(trip, event_type):
    """
    Send notification when a trip starts or ends.
    
    Args:
        trip: Trip object
        event_type: 'started' or 'ended'
    """
    from apps.students.models import Student, Parent
    
    # Get all students on this route
    students = Student.objects.filter(
        route=trip.route,
        is_active=True
    )
    
    # Prepare notification content
    if event_type == 'started':
        title = "Bus on the way!"
        body = f"Bus {trip.bus.number} has started the {trip.trip_type} trip"
        notification_type = NotificationType.TRIP_STARTED
    else:
        title = "Trip completed"
        body = f"Bus {trip.bus.number} has completed the trip"
        notification_type = NotificationType.TRIP_ENDED
    
    data = {
        'type': notification_type,
        'trip_id': str(trip.id),
        'bus_id': str(trip.bus.id),
        'route_id': str(trip.route.id),
    }
    
    # Get all parents for these students
    parent_ids = Parent.objects.filter(
        student__in=students,
        is_active=True
    ).values_list('user_id', flat=True).distinct()
    
    from apps.accounts.models import User
    parents = User.objects.filter(id__in=parent_ids)
    
    for user in parents:
        # Create notification record
        notification = Notification.objects.create(
            user=user,
            title=title,
            body=body,
            notification_type=notification_type,
            trip=trip,
            data=data,
        )
        
        # Send push notification
        if send_push_notification(user, title, body, data):
            notification.is_pushed = True
            notification.pushed_at = timezone.now()
            notification.save(update_fields=['is_pushed', 'pushed_at'])


def send_approaching_notification(student, trip, eta_minutes):
    """
    Send notification when bus is approaching a student's stop.
    
    Args:
        student: Student object
        trip: Trip object
        eta_minutes: Estimated time of arrival in minutes
    """
    from apps.students.models import Parent
    
    # Get parent users
    parents = Parent.objects.filter(
        student=student,
        is_active=True
    ).select_related('user')
    
    title = f"Bus arriving in {eta_minutes} minutes!"
    body = f"Bus {trip.bus.number} is approaching {student.first_name}'s stop"
    
    data = {
        'type': NotificationType.APPROACHING,
        'student_id': str(student.id),
        'trip_id': str(trip.id),
        'eta_minutes': str(eta_minutes),
    }
    
    for parent in parents:
        user = parent.user
        
        notification = Notification.objects.create(
            user=user,
            title=title,
            body=body,
            notification_type=NotificationType.APPROACHING,
            student=student,
            trip=trip,
            data=data,
        )
        
        if send_push_notification(user, title, body, data):
            notification.is_pushed = True
            notification.pushed_at = timezone.now()
            notification.save(update_fields=['is_pushed', 'pushed_at'])
