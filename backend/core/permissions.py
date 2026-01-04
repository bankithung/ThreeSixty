"""
Custom permissions for the ThreeSixty project.
"""
from rest_framework import permissions


class IsRootAdmin(permissions.BasePermission):
    """
    Permission for root admin users only.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'root_admin'
        )


class IsSchoolAdmin(permissions.BasePermission):
    """
    Permission for school admin users.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['root_admin', 'school_admin']
        )


class IsStaff(permissions.BasePermission):
    """
    Permission for any staff member (admin, office, teacher).
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['root_admin', 'school_admin', 'office_staff', 'teacher']
        )


class IsConductor(permissions.BasePermission):
    """
    Permission for conductors only.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'conductor'
        )


class IsDriver(permissions.BasePermission):
    """
    Permission for drivers only.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'driver'
        )


class IsParent(permissions.BasePermission):
    """
    Permission for parents only.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'parent'
        )


class IsConductorOrDriver(permissions.BasePermission):
    """
    Permission for conductors or drivers.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['conductor', 'driver']
        )


class IsOwnerOrStaff(permissions.BasePermission):
    """
    Object-level permission to only allow owners or staff to access/edit.
    """
    def has_object_permission(self, request, view, obj):
        # Staff can access anything
        if request.user.role in ['root_admin', 'school_admin', 'office_staff']:
            return True
        
        # Check if the object has a user field
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        # Check if the object has an owner field
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        
        return False
