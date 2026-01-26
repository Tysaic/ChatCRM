from django.db import models
from django.db.models import Count
from shortuuidfield import ShortUUIDField
from apps.user.models import User

class ChatRoom(models.Model):
    roomId = ShortUUIDField()
    type = models.CharField(max_length=10, default='DM')
    member = models.ManyToManyField(User)
    name = models.CharField(max_length=20, null=True, blank=True)

    def __str__(self):
        return self.roomId + " -> " + str(self.name)

    @staticmethod
    def get_existing_dm_room(users_ids):

        if len(users_ids) != 2:
            return None
        
        dm_chats = ChatRoom.objects.filter(type="DM").annotate(
            member_count = Count('member')
        ).filter(member_count=2)

        for chat in dm_chats:

            member_ids = [str(member.userId) for member in chat.member.all()]

            if set(member_ids) == set(users_ids):
                return chat
        return None
    
class ChatMessage(models.Model):

    room = models.ForeignKey(ChatRoom, on_delete=models.SET_NULL, null=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    message = models.TextField(default=' ')
    timestamp = models.DateTimeField(auto_now_add=True)
    image = models.ImageField(upload_to='tmp/', blank=True, null=True)

    def __str__(self):
        return self.message
