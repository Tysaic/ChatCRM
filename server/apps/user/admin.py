from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, OnlineUser, 
    UserType, ApiKey
)

@admin.register(User)
class CustomUserAdmin(BaseUserAdmin):

    list_display = (
        'username', 'email', 'userId', 
        'first_name', 'last_name', 'is_staff'
    )

    search_fields = (
        'username', 'userId', 'email',
        'first_name', 'last_name'
    )

    list_filter = (
        'is_staff', 'is_superuser', 'is_active', 'groups'
    )

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Extra Info', {
            'fields': ('userId', 'image'),
        }),
    )

    readonly_fields = ('userId', )

@admin.register(UserType)
class UserTypeAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'priority', 'is_active', 'created_at']
    list_filter = ['is_active', 'priority']
    search_fields = ['code', 'name']
    ordering = ['-priority', 'code']

@admin.register(ApiKey)
class ApiKeyAdmin(admin.ModelAdmin):

    list_display = [
        'name', 'key_prefix', 'status', 'default_user_type',
        'usage_count', 'last_used_at', 'created_at'
    ]

    list_filter = ['status', 'default_user_type', 'created_at']
    search_fields = ['name', 'key_prefix']
    read_only_fields = [
        'key_hash', 'key_prefix', 'usage_count',
        'last_used_at', 'created_at', 'updated_at'
    ]
    ordering = ['-created_at']

    fieldsets = (
        ('Information', {
            'fields': ('name', 'key_prefix', 'status')
        }),
        ('Configuration', {
            'fields': ('default_user_type', 'scopes', 'rate_limit', 'expires_at')
        }),
        ('Usage', {
            'fields': ('usage_count', 'last_used_at'),
            'classes': ('collapse',)
        }),
        ('Audit', {
            'fields': ('created_by', 'key_hash'),
            'classes': ('collapse',)
        }),
    )

@admin.register(OnlineUser)
class OnlineUserAdmin(admin.ModelAdmin):

    list_display = ('user', 'get_user_id', 'user__email')
    search_fields = ('user__username', 'user__userId', 'user__email')

    @admin.display(description="User ID")
    def get_user_id(self, obj):
        return obj.user.userId
