"""
Custom pagination classes for the ThreeSixty project.
"""
from rest_framework.pagination import PageNumberPagination


class StandardResultsPagination(PageNumberPagination):
    """
    Standard pagination with configurable page size.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class SmallResultsPagination(PageNumberPagination):
    """
    Smaller pagination for mobile apps.
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class LargeResultsPagination(PageNumberPagination):
    """
    Larger pagination for admin lists.
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200
