from django.contrib import admin
from .models import ChatRoom, ChatMessage


class ChatRoomAdmin(admin.ModelAdmin):

    list_display = ('roomId', 'name', 'type', 'get_members')
    list_filter = ('type',)
    search_fields = (
        'roomId', 'name', 'member__username', 
        'member__first_name', 'member__last_name', 'member__email'
    )
    filter_horizontal = ('member',)
    
    def get_members(self, obj):
        return ", ".join([member.username for member in obj.member.all()])
    
    get_members.short_description = 'Members'


class ChatMessageAdmin(admin.ModelAdmin):

    list_display = ('room', 'user', 'message', 'timestamp')
    list_filter = ('timestamp',)
    search_fields = ('message',)

admin.site.register(ChatRoom, ChatRoomAdmin)
admin.site.register(ChatMessage, ChatMessageAdmin)