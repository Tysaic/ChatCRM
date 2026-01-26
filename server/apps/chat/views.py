from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticated
from .serializers import ChatRoomSerializer, ChatMessageSerializer
from .models import ChatRoom, ChatMessage
from apps.user.models import User
from django.db.models import Q
from django.shortcuts import get_object_or_404

class ChatRoomListView(APIView):
    #permission_classes = [IsAuthenticated]

    def get(self, request):

        chatRooms = ChatRoom.objects.filter(
            Q(member = request.user.id) | Q(member = request.user.userId)
        )

        serializer = ChatRoomSerializer(
            chatRooms, many=True, context={'request': request}
        )
        return Response(serializer.data, status = status.HTTP_200_OK)

class ChatRoomCreateView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        data = request.data.copy()

        members = data.get('members', [])

        if not isinstance(members, list):
            return Response(
                {"error": "Members should be a list."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if request.user.userId not in members:
            members.append(request.user.userId)

        data['members'] = members
        
        serializer = ChatRoomSerializer(data = data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status = status.HTTP_201_CREATED)
        return Response(serializer.errors, status = status.HTTP_400_BAD_REQUEST)

class UserChatRoomView(APIView):
    #permission_classes = [IsAuthenticated]
    def get(self, request):

        chatRooms = ChatRoom.objects.filter(
            Q(member = request.user.id) | Q(member = request.user.userId)
        )

        serializer = ChatRoomSerializer(
            chatRooms, many=True, context={'request': request}
        )

        return Response(serializer.data, status = status.HTTP_200_OK)

class MessagesView(ListAPIView):
    serializer_class = ChatMessageSerializer
    pagination_class = LimitOffsetPagination 
    #permission_classes = [IsAuthenticated]

    def get_queryset(self):

        room_id = self.kwargs.get('roomId')

        if room_id:
            chatroom = get_object_or_404(ChatRoom, roomId = room_id)
            user_instance = User.objects.get(id=self.request.user.id)

            if not chatroom.member.filter(username=user_instance).exists():
                return ChatMessage.objects.none()
            
            return ChatMessage.objects.filter(
                room__roomId = room_id
            ).select_related('user').order_by('-timestamp')
        
        return ChatMessage.objects.none()


    def post(self, request, *args, **kwargs):

        serializer = self.get_serializer(data = request.data)
        serializer.is_valid(raise_exception = True)

        room_id = serializer.validated_data.pop('roomId')
        chatroom = get_object_or_404(ChatRoom, roomId = room_id)
        user_instance = User.objects.get(id=request.user.id)

        if not chatroom.member.filter(id=user_instance.id).exists():
            return Response(
                {"error": "You aren't member of this chat room!"},
                status = status.HTTP_403_FORBIDDEN
            )
        
        image = request.FILES.get('image', None)
        message = serializer.save(user = user_instance, room=chatroom, image=image)

        response_serializer = self.get_serializer(message)

        return Response(response_serializer.data, status = status.HTTP_201_CREATED)
    
    def get_serializer_context(self):

        context = super().get_serializer_context()
        context['request'] = self.request
        return context