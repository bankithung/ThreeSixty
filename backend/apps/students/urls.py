"""
URL configuration for students app - Comprehensive Admission System.
"""
from django.urls import path
from .views import (
    StudentListCreateView,
    StudentDetailView,
    StudentParentsView,
    StudentFaceEncodingsView,
    ParentChildrenView,
    ParentListView,
    ConductorStudentListView,
    EnrollStudentsView,
    StudentIdentifyView,
    # Comprehensive admission views
    ComprehensiveAdmissionView,
    ComprehensiveStudentDetailView,
    StudentHealthView,
    StudentDocumentListCreateView,
    StudentDocumentDetailView,
    AuthorizedPickupListCreateView,
    AuthorizedPickupDetailView,
)

app_name = 'students'

urlpatterns = [
    # Student CRUD
    path('', StudentListCreateView.as_view(), name='student-list-create'),
    path('<uuid:pk>/', StudentDetailView.as_view(), name='student-detail'),
    
    # Comprehensive student detail (with all related data)
    path('<uuid:pk>/comprehensive/', ComprehensiveStudentDetailView.as_view(), name='student-comprehensive'),
    
    # Parent management
    path('<uuid:pk>/parents/', StudentParentsView.as_view(), name='student-parents'),
    
    # Parents list (admin portal)
    path('parents/', ParentListView.as_view(), name='parent-list'),
    
    # Face encodings
    path('<uuid:pk>/faces/', StudentFaceEncodingsView.as_view(), name='student-faces'),
    
    # Health records
    path('<uuid:pk>/health/', StudentHealthView.as_view(), name='student-health'),
    
    # Document management
    path('<uuid:pk>/documents/', StudentDocumentListCreateView.as_view(), name='student-documents'),
    path('documents/<uuid:pk>/', StudentDocumentDetailView.as_view(), name='document-detail'),
    
    # Authorized pickup personnel
    path('<uuid:pk>/authorized-pickups/', AuthorizedPickupListCreateView.as_view(), name='student-pickups'),
    path('authorized-pickups/<uuid:pk>/', AuthorizedPickupDetailView.as_view(), name='pickup-detail'),
    
    # Parent's children
    path('parent/children/', ParentChildrenView.as_view(), name='parent-children'),
    
    # Conductor's student list
    path('conductor/list/', ConductorStudentListView.as_view(), name='conductor-students'),
    
    # Enrollment (basic - parent-first workflow)
    path('enroll/', EnrollStudentsView.as_view(), name='enroll-students'),
    
    # Comprehensive admission (full workflow with all data)
    path('admit/', ComprehensiveAdmissionView.as_view(), name='comprehensive-admission'),
    
    # Face Identification
    path('identify/', StudentIdentifyView.as_view(), name='identify-student'),
]

