from rest_framework import serializers
from apps.chat.models import ChatRoom, ChatMessage, ChatRoomMembership
from apps.user.serializers import UserSerializer
from apps.user.models import User
from django.db.models import Q

class ChatRoomSerializer(serializers.ModelSerializer):

    member = UserSerializer(many=True, read_only=True)
    members = serializers.ListField(write_only=True)
    unread_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    last_message_at = serializers.SerializerMethodField()

    def get_unread_count(self, obj):

        request = self.context.get('request')

        if request and request.user.is_authenticated:
            try:
                user = User.objects.get(id=request.user.id)
                return obj.get_unread_count_for_user(user)
            except User.DoesNotExist:
                return 0
        return 0
    
    def get_last_message(self, obj):

        last_msg = obj.get_last_message()
        if last_msg:
            if last_msg.image and not last_msg.message:
                return "[Imagen]"
            return last_msg.message[:50] if last_msg.message else None
        return None
    
    def get_last_message_at(self, obj):

        last_msg = obj.get_last_message()

        if last_msg:
            return last_msg.timestamp
        return None
    
    def create(self, validatedData):

        memberUserIds = validatedData.pop('members')
        chat_room = ChatRoom.objects.create(**validatedData)
        users = User.objects.filter(
            Q(userId__in=memberUserIds) | Q(user__in=memberUserIds)
        )

        for user in users:
            ChatRoomMembership.objects.get_or_create(
                user=user,
                room=chat_room
            )
        
        return chat_room
    
    class Meta:
        model = ChatRoom
        exclude = ['id']
    
class ChatMessageSerializer(serializers.ModelSerializer):
    userName = serializers.SerializerMethodField()
    userImage = serializers.SerializerMethodField()
    userId = serializers.SerializerMethodField()
    roomId = serializers.CharField(write_only=True)
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:

        model = ChatMessage
        fields = ['roomId', 'user', 'userId','message', 'timestamp', 'userName', 'userImage', 'image']
        read_only_fields = ['messageId', 'timestamp', 'userName', 'userImage', 'userId']

    
    def get_userName(self, obj):
        if obj.user:
            return f"{obj.user.first_name} - {obj.user.last_name}"
        return "User not found"
    
    def get_userImage(self, obj):
        if obj.user and obj.user.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.user.image.url)
            return obj.user.image.url
        return None
    
    def get_userId(self, obj):

        if obj.user:
            return obj.user.userId
        return None

    def validate_roomId(self, value):
        if not ChatRoom.objects.filter(roomId=value).exists():
            raise serializers.ValidationError("Chat room with this id doesnt exists")
        return value