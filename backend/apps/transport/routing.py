"""
WebSocket URL routing for transport app.
"""
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/trip/(?P<trip_id>[0-9a-f-]+)/$', consumers.TripTrackingConsumer.as_asgi()),
    re_path(r'ws/bus/(?P<bus_id>[0-9a-f-]+)/location/$', consumers.BusLocationConsumer.as_asgi()),
]
