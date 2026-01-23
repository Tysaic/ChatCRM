from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, OnlineUser


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


class OnlineUserAdmin(admin.ModelAdmin):

    list_display = ('user', 'get_user_id', 'user__email')
    search_fields = ('user__username', 'user__userId', 'user__email')

    @admin.display(description="User ID")
    def get_user_id(self, obj):
        return obj.user.userId

admin.site.register(User, CustomUserAdmin)
admin.site.register(OnlineUser, OnlineUserAdmin)