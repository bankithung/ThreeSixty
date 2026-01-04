"""
URL configuration for notifications app.
"""
from django.urls import path
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import serializers
from django.utils import timezone

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model."""
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'body', 'notification_type', 'data',
            'student', 'student_name', 'trip', 'is_read', 'read_at',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class NotificationListView(generics.ListAPIView):
    """List notifications for current user."""
    serializer_class = NotificationSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Notification.objects.filter(user=user)
        
        # Filter by read status
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
        
        # Limit to recent notifications
        limit = int(self.request.query_params.get('limit', 50))
        return queryset[:limit]


class NotificationDetailView(generics.RetrieveAPIView):
    """Get notification detail and mark as read."""
    serializer_class = NotificationSerializer
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Mark as read
        if not instance.is_read:
            instance.is_read = True
            instance.read_at = timezone.now()
            instance.save(update_fields=['is_read', 'read_at'])
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class MarkAllReadView(APIView):
    """Mark all notifications as read."""
    
    def post(self, request):
        count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True, read_at=timezone.now())
        
        return Response({
            'message': f'Marked {count} notifications as read.'
        })


class UnreadCountView(APIView):
    """Get count of unread notifications."""
    
    def get(self, request):
        count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).count()
        
        return Response({'unread_count': count})


app_name = 'notifications'

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('<uuid:pk>/', NotificationDetailView.as_view(), name='notification-detail'),
    path('mark-all-read/', MarkAllReadView.as_view(), name='mark-all-read'),
    path('unread-count/', UnreadCountView.as_view(), name='unread-count'),
]
