"""
URL configuration for transport app.
"""
from django.urls import path
from .views import (
    BusListCreateView,
    BusDetailView,
    BusStaffView,
    RouteListCreateView,
    RouteDetailView,
    StopListCreateView,
    StopDetailView,
    TripListView,
    ActiveTripsView,
    ConductorTripHistoryView,
    StartTripView,
    EndTripView,
    UpdateLocationView,
    TripTrackingView,
    ChildTripView,
)

app_name = 'transport'

urlpatterns = [
    # Buses
    path('buses/', BusListCreateView.as_view(), name='bus-list-create'),
    path('buses/<uuid:pk>/', BusDetailView.as_view(), name='bus-detail'),
    path('buses/<uuid:pk>/staff/', BusStaffView.as_view(), name='bus-staff'),
    
    # Routes
    path('routes/', RouteListCreateView.as_view(), name='route-list-create'),
    path('routes/<uuid:pk>/', RouteDetailView.as_view(), name='route-detail'),
    path('routes/<uuid:route_id>/stops/', StopListCreateView.as_view(), name='stop-list-create'),
    path('stops/<uuid:pk>/', StopDetailView.as_view(), name='stop-detail'),
    
    # Trips
    path('trips/', TripListView.as_view(), name='trip-list'),
    path('trips/active/', ActiveTripsView.as_view(), name='active-trips'),
    path('trips/history/', ConductorTripHistoryView.as_view(), name='conductor-trip-history'),
    path('trips/start/', StartTripView.as_view(), name='start-trip'),
    path('trips/<uuid:pk>/end/', EndTripView.as_view(), name='end-trip'),
    path('trips/<uuid:pk>/location/', UpdateLocationView.as_view(), name='update-location'),
    path('trips/<uuid:pk>/tracking/', TripTrackingView.as_view(), name='trip-tracking'),
    
    # Parent tracking
    path('track/child/<uuid:student_id>/', ChildTripView.as_view(), name='child-trip'),
]
