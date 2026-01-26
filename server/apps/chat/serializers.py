from rest_framework import serializers
from apps.chat.models import ChatRoom, ChatMessage
from apps.user.serializers import UserSerializer
from apps.user.models import User

class ChatRoomSerializer(serializers.ModelSerializer):

    member = UserSerializer(many=True, read_only=True)
    members = serializers.ListField(write_only=True)

    def create(self, validatedData):

        memberUserIds = validatedData.pop('members')
        chat_room = ChatRoom.objects.create(**validatedData)
        users = User.objects.filter(userId__in=memberUserIds)
        chat_room.member.set(users)
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