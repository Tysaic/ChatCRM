from django.urls import path
from .views import (
    ChatRoomListView,
    ChatRoomCreateView,
    UserChatRoomView,
    MessagesView,
    MarkChatAsReadView,
    UploadChatFileView,
    SupportChatsListView,
    TakeReleaseChatView
)

urlpatterns = [
    path("chats", ChatRoomListView.as_view(), name="chat-room-list"),
    path("chats/create", ChatRoomCreateView.as_view(), name="chat-room-create"),
    path("user/chats", UserChatRoomView.as_view(), name="user-chat-rooms"),
    path('chats/messages/upload-file', UploadChatFileView.as_view(), name="upload-chat-file"),  # POST
    path("chats/messages/<str:roomId>", MessagesView.as_view(), name="list-chat-messages"), # GET
    path('chats/mark-read/<str:roomId>', MarkChatAsReadView.as_view(), name="mark-chat-as-read"), #POST
    path('support/', SupportChatsListView.as_view(), name = "support-chats-list"),
    path('support/<str:roomId>/<str:action>', TakeReleaseChatView.as_view(), name="take-release-chat"),
]