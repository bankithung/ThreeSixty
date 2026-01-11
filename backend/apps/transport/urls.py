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
    RouteUpdateStopsView,
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
    # Bus Profile Views
    BusProfileView,
    BusFuelEntryListCreateView,
    BusFuelEntryDetailView,
    BusExpenseListCreateView,
    BusExpenseDetailView,
    BusEarningListCreateView,
    BusEarningDetailView,
    BusStudentsView,
    BusLiveStatusView,
    BusUploadImageView,
    BusDeleteImageView,
    BusAnalyticsView,
)

app_name = 'transport'

urlpatterns = [
    # Buses
    path('buses/', BusListCreateView.as_view(), name='bus-list-create'),
    path('buses/<uuid:pk>/', BusDetailView.as_view(), name='bus-detail'),
    path('buses/<uuid:pk>/staff/', BusStaffView.as_view(), name='bus-staff'),
    
    # Bus Profile (extended endpoints)
    path('buses/<uuid:pk>/profile/', BusProfileView.as_view(), name='bus-profile'),
    path('buses/<uuid:pk>/fuel/', BusFuelEntryListCreateView.as_view(), name='bus-fuel-list'),
    path('buses/<uuid:bus_pk>/fuel/<uuid:pk>/', BusFuelEntryDetailView.as_view(), name='bus-fuel-detail'),
    path('buses/<uuid:pk>/expenses/', BusExpenseListCreateView.as_view(), name='bus-expense-list'),
    path('buses/<uuid:bus_pk>/expenses/<uuid:pk>/', BusExpenseDetailView.as_view(), name='bus-expense-detail'),
    path('buses/<uuid:pk>/earnings/', BusEarningListCreateView.as_view(), name='bus-earning-list'),
    path('buses/<uuid:bus_pk>/earnings/<uuid:pk>/', BusEarningDetailView.as_view(), name='bus-earning-detail'),
    path('buses/<uuid:pk>/students/', BusStudentsView.as_view(), name='bus-students'),
    path('buses/<uuid:pk>/live/', BusLiveStatusView.as_view(), name='bus-live-status'),
    path('buses/<uuid:pk>/upload-image/', BusUploadImageView.as_view(), name='bus-upload-image'),
    path('buses/<uuid:pk>/images/<int:image_index>/', BusDeleteImageView.as_view(), name='bus-delete-image'),
    path('buses/<uuid:pk>/analytics/', BusAnalyticsView.as_view(), name='bus-analytics'),
    
    # Routes
    path('routes/', RouteListCreateView.as_view(), name='route-list-create'),
    path('routes/<uuid:pk>/', RouteDetailView.as_view(), name='route-detail'),
    path('routes/<uuid:pk>/stops/update/', RouteUpdateStopsView.as_view(), name='route-stops-update'),
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

