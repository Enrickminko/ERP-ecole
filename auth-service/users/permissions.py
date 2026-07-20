from rest_framework.permissions import BasePermission

class IsAdminUserOnly(BasePermission):
    def has_permission(self, request, view):
        
        return request.user and getattr(request.user, 'role', None) == 'Admin'