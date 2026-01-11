"""
WebSocket URL routing for notifications app.
"""
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/user/notifications/$', consumers.UserConsumer.as_asgi()),
]
