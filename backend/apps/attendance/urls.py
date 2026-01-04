"""
URL configuration for attendance app.
"""
from django.urls import path
from .views import (
    FaceScanCheckinView,
    FaceScanCheckoutView,
    ManualAttendanceView,
    TripAttendanceView,
    StudentAttendanceHistoryView,
    ChildAttendanceHistoryView,
    ChildAttendanceHistoryView,
    ChildCurrentStatusView,
    AttendanceListView,
)

app_name = 'attendance'

urlpatterns = [
    # List endpoint
    path('', AttendanceListView.as_view(), name='attendance-list'),

    # Face scan endpoints
    path('checkin/', FaceScanCheckinView.as_view(), name='face-checkin'),
    path('checkout/', FaceScanCheckoutView.as_view(), name='face-checkout'),
    
    # Manual attendance
    path('manual/', ManualAttendanceView.as_view(), name='manual-attendance'),
    
    # Trip attendance
    path('trip/<uuid:trip_id>/', TripAttendanceView.as_view(), name='trip-attendance'),
    
    # Student history (for staff)
    path('student/<uuid:student_id>/history/', StudentAttendanceHistoryView.as_view(), name='student-history'),
    
    # Parent endpoints
    path('child/<uuid:student_id>/history/', ChildAttendanceHistoryView.as_view(), name='child-history'),
    path('child/<uuid:student_id>/status/', ChildCurrentStatusView.as_view(), name='child-status'),
]
