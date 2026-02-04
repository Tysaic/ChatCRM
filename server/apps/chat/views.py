from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import serializers as drf_serializers
from rest_framework.generics import ListAPIView
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .serializers import ChatRoomSerializer, ChatMessageSerializer
from .models import ChatRoom, ChatMessage
from apps.user.models import User
from django.db.models import Q, Exists, OuterRef
from django.shortcuts import get_object_or_404
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from V0X.settings import MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES
from drf_spectacular.utils import extend_schema, OpenApiParameter, inline_serializer

class ChatRoomPagination(LimitOffsetPagination):

    default_limit = 10
    max_limit = 50

class ChatRoomListView(APIView):
    #permission_classes = [IsAuthenticated]

    def get(self, request):
        user_instance = User.objects.get(id = request.user.id)
        chatRooms = ChatRoom.objects.filter(member=user_instance)

        serializer = ChatRoomSerializer(
            chatRooms, many=True, context={'request': request}
        )
        return Response(serializer.data, status = status.HTTP_200_OK)

class ChatRoomCreateView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        data = request.data.copy()
        current_userId = User.objects.get(id=request.user.id).userId

        members = data.get('members', [])
        chat_type = data.get('type', 'DM')

        if not isinstance(members, list):
            return Response(
                {"error": "Members should be a list."},
                status=status.HTTP_400_BAD_REQUEST
            )
        members = [str(m) for m in members]

        #if current_userId not in members:
        #    members.append(current_userId)
        
        if chat_type == "DM":
            if len(members) != 2:

                return Response(
                    {"error": "DM chats must have exactly 2 members."},
                    status = status.HTTP_400_BAD_REQUEST
                )
            existing_chat = ChatRoom.get_existing_dm_room(members)

            if existing_chat:

                serializer = ChatRoomSerializer(
                    existing_chat,
                    context={'request': request}
                )

                return Response(
                    {
                        'message': 'Chat already exists',
                        'chat': serializer.data,
                    },
                    status = status.HTTP_200_OK
                )

        data['members'] = members

        serializer = ChatRoomSerializer(data = data)

        if serializer.is_valid():
            current_user = User.objects.get(id=request.user.id)
            serializer.save(created_by=current_user)
            return Response(serializer.data, status = status.HTTP_201_CREATED)
        return Response(serializer.errors, status = status.HTTP_400_BAD_REQUEST)

class UserChatRoomView(ListAPIView):
    serializer_class = ChatRoomSerializer
    pagination_class = ChatRoomPagination
    #permission_classes = [IsAuthenticated]

    def get_queryset(self):

        user = self.request.user
        user_instance = User.objects.get(id=user.id)

        has_messages = ChatMessage.objects.filter(room=OuterRef('pk'))

        return ChatRoom.objects.filter(
            member = user_instance
        ).annotate(
            has_messages = Exists(has_messages)
        ).filter(
            Q(has_messages=True) | Q(created_by=user_instance)
        ).distinct().order_by('-updated_at')
    
    def get_serializer_context(self):

        context = super().get_serializer_context()
        context['request'] = self.request
        return context

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
            
            
            query_set = ChatMessage.objects.filter(
                room__roomId = room_id
            ).select_related('user').order_by('-timestamp')

            return query_set
        
        return ChatMessage.objects.none()


    def post(self, request, *args, **kwargs):

        serializer = self.get_serializer(data = request.data)
        serializer.is_valid(raise_exception = True)

        serializer.validated_data.pop('roomId')
        room_id = self.kwargs.get('roomId')
        chatroom = get_object_or_404(ChatRoom, roomId = room_id)
        user_instance = User.objects.get(id=request.user.id)

        if not chatroom.member.filter(id=user_instance.id).exists():
            return Response(
                {"error": "You aren't member of this chat room!"},
                status = status.HTTP_403_FORBIDDEN
            )
        
        image = request.FILES.get('image', None)
        message = serializer.save(user = user_instance, room=chatroom, image=image)

        channel_layer = get_channel_layer()
        members = chatroom.member.all()

        for member in members:
            async_to_sync(channel_layer.group_send)(
                f"user_{member.userId}",
                {
                    'type': 'chat_message',
                    'message': {
                    'action': 'message',
                    'userId': user_instance.userId,
                    'roomId': room_id,
                    'message': message.message,
                    'userName': f"{user_instance.first_name} {user_instance.last_name}",
                    'userImage': user_instance.image.url if user_instance.image else None,
                    'timestamp': str(message.timestamp),
                    'image': None,
                    }
                }
            )

        response_serializer = self.get_serializer(message)

        return Response(response_serializer.data, status = status.HTTP_201_CREATED)
    
    def get_serializer_context(self):

        context = super().get_serializer_context()
        context['request'] = self.request
        return context

  
class MarkChatAsReadView(APIView):

    @extend_schema(
        responses = {
            200: inline_serializer(
                name="MarkReadResponse",
                fields = {
                    'message': drf_serializers.CharField(),
                    'roomId': drf_serializers.CharField(),
                    'last_read_at': drf_serializers.DateTimeField(),
                }
            )
        },
        description="Mark a chat as read by the current user."
    )

    def post(self, request, roomId):

        try:
            chatroom = ChatRoom.objects.get(roomId = roomId)
        except ChatRoom.DoesNotExist:

            return Response(
                {"error": "Chat room does not exists."},
                status = status.HTTP_404_NOT_FOUND
            )
        
        user = User.objects.get(id=request.user.id)

        if not chatroom.member.filter(id = user.id).exists():

            return Response(
                {"error": "You aren't member of this chat room!"},
                status = status.HTTP_403_FORBIDDEN
            )
        
        membership = chatroom.get_membership(user = user)
        membership.mark_as_read()

        return Response({
            "message": "Chat marked as read.",
            "roomId": roomId,
            "last_read_at": membership.last_read_at
        },
        status = status.HTTP_200_OK
        )

class UploadChatFileView(APIView):

    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        request = {
                'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'roomId': {'type': 'string'},
                    'file': {'type': 'string', 'format': 'binary'},
                    'message': {'type': 'string'},
                },
                'required': ['roomId', 'file']
            }
        },
        responses = {
                201: inline_serializer(
                name='UploadFileResponse',
                fields={
                    'messageId': drf_serializers.IntegerField(),
                    'roomId': drf_serializers.CharField(),
                    'message': drf_serializers.CharField(allow_null=True),
                    'userId': drf_serializers.CharField(),
                    'userName': drf_serializers.CharField(),
                    'userImage': drf_serializers.URLField(allow_null=True),
                    'timestamp': drf_serializers.DateTimeField(),
                    'type': drf_serializers.ChoiceField(choices=['image', 'file']),
                    'image': drf_serializers.URLField(allow_null=True),
                    'file': drf_serializers.URLField(allow_null=True),
                    'fileName': drf_serializers.CharField(allow_null=True),
                    'fileType': drf_serializers.CharField(allow_null=True),
                    'fileSize': drf_serializers.IntegerField(allow_null=True),
                }
            )
        },
        description = "Sube una imagen o documento a un chat"
    )

    def post(self, request):

        room_id = request.data.get('roomId')
        uploaded_file = request.FILES.get('file')
        message = request.data.get('message', '')

        if not room_id:
            return Response(
                {"error": "roomId not provided."},
                status = status.HTTP_400_BAD_REQUEST
            )
        
        if not uploaded_file:
            return Response(
                {"error": "file not provided."},
                status = status.HTTP_400_BAD_REQUEST
            )
        
        if uploaded_file.size > MAX_FILE_SIZE:

            return Response(
                {"error": f"File size exceeds the maximum limit of {MAX_FILE_SIZE / (1024 * 1024)} MB."},
                status = status.HTTP_400_BAD_REQUEST
            )
        
        try:
            chatroom = ChatRoom.objects.get(roomId = room_id)
        except ChatRoom.DoesNotExist:
            return Response(
                {"error": "Chat room does not exists."},
                status = status.HTTP_404_NOT_FOUND
            )
        
        user = User.objects.get(id=request.user.id)

        if not chatroom.member.filter(id=user.id).exists():
            return Response(
                {"error": "You aren't member of this chat room!"},
                status = status.HTTP_403_FORBIDDEN
            )
        
        content_type = uploaded_file.content_type.split(';')[0].strip()
        is_image = content_type in ALLOWED_IMAGE_TYPES

        chat_message = ChatMessage.objects.create(
            room = chatroom,
            user = user,
            message = message if message else None,
            image = uploaded_file if is_image else None,
            file = uploaded_file if not is_image else None,
            file_name = uploaded_file.name if not is_image else None,
            file_type = content_type if not is_image else None,
            file_size = uploaded_file.size if not is_image else None
        )


        response_data = {
            "messageId": chat_message.id,
            "roomId": chatroom.roomId,
            "message": message if message else None,
            "userId": user.userId,
            "userName": f"{user.first_name} {user.last_name}",
            "userImage": request.build_absolute_uri(user.image.url) if user.image else None,
            "timestamp": str(chat_message.timestamp),
            "type": "image" if is_image else "file",
        }

        if is_image:
            response_data["image"] = request.build_absolute_uri(chat_message.image.url)
        else:
            response_data["file"] = request.build_absolute_uri(chat_message.file.url)
            response_data["fileName"] = chat_message.file_name
            response_data["fileType"] = chat_message.file_type
            response_data["fileSize"] = chat_message.file_size
        
        return Response(response_data, status = status.HTTP_201_CREATED)