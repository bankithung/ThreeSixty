"""
URL configuration for students app.
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
)

app_name = 'students'

urlpatterns = [
    # Student CRUD
    path('', StudentListCreateView.as_view(), name='student-list-create'),
    path('<uuid:pk>/', StudentDetailView.as_view(), name='student-detail'),
    
    # Parent management
    path('<uuid:pk>/parents/', StudentParentsView.as_view(), name='student-parents'),
    
    # Parents list (admin portal)
    path('parents/', ParentListView.as_view(), name='parent-list'),
    
    # Face encodings
    path('<uuid:pk>/faces/', StudentFaceEncodingsView.as_view(), name='student-faces'),
    
    # Parent's children
    path('parent/children/', ParentChildrenView.as_view(), name='parent-children'),
    
    # Conductor's student list
    path('conductor/list/', ConductorStudentListView.as_view(), name='conductor-students'),
    
    # Enrollment (parent-first workflow)
    # Enrollment (parent-first workflow)
    path('enroll/', EnrollStudentsView.as_view(), name='enroll-students'),
    
    # Face Identification
    path('identify/', StudentIdentifyView.as_view(), name='identify-student'),
]
