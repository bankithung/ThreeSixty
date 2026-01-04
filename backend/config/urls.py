"""
URL configuration for ThreeSixty project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/auth/', include('apps.accounts.urls')),
    path('api/schools/', include('apps.schools.urls')),
    path('api/students/', include('apps.students.urls')),
    path('api/transport/', include('apps.transport.urls')),
    path('api/attendance/', include('apps.attendance.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/emergency/', include('apps.emergency.urls')),
    path('api/subscriptions/', include('apps.subscriptions.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
