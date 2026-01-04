"""
URL configuration for schools app.
"""
from django.urls import path
from .views import SchoolListCreateView, SchoolDetailView, SchoolStatsView, SchoolDashboardView

app_name = 'schools'

urlpatterns = [
    path('dashboard/', SchoolDashboardView.as_view(), name='school-dashboard'),
    path('', SchoolListCreateView.as_view(), name='school-list-create'),
    path('<uuid:pk>/', SchoolDetailView.as_view(), name='school-detail'),
    path('<uuid:pk>/stats/', SchoolStatsView.as_view(), name='school-stats'),
]
