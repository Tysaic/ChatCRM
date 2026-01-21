from django.urls import path
from .views import (
    ChatRoomListView,
    ChatRoomCreateView,
    UserChatRoomView,
    MessagesView
)

urlpatterns = [
    path("chats", ChatRoomListView.as_view(), name="chat-room-list"),
    path("chats/create", ChatRoomCreateView.as_view(), name="chat-room-create"),
    path("user/chats", UserChatRoomView.as_view(), name="user-chat-rooms"),
    path("chats/messages", MessagesView.as_view(), name="send-chat-messages"), # POST
    path("chats/messages/<str:roomId>", MessagesView.as_view(), name="list-chat-messages"), # GET
]