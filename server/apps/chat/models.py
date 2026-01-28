from django.db import models
from django.db.models import Count
from shortuuidfield import ShortUUIDField
from apps.user.models import User
from django.utils import timezone

class ChatRoom(models.Model):

    class ChatType(models.TextChoices):
        DM = 'DM', 'Direct Message'
        GROUP = 'GROUP', 'Group Chat'
        SELF = 'SELF', 'Personal Chat'
    

    roomId = ShortUUIDField()
    type = models.CharField(
        max_length=10,
        choices = ChatType.choices,
        default = ChatType.DM
    )
    member = models.ManyToManyField(User)
    name = models.CharField(max_length=20, null=True, blank=True)

    def __str__(self):
        return self.roomId + "-" + str(self.name)


    def get_membership(self, user):
        membership, created = ChatRoomMembership.objects.get_or_create(
            user=user,
            room=self
        )
        return membership
    
    def get_unread_count_for_user(self, user):

        membership = self.get_membership(user)
        return membership.get_unread_count()
    
    def get_last_message(self):

        return ChatMessage.objects.filter(
            room=self
        ).order_by(
            '-timestamp'
        ).first()


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
    message = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    image = models.ImageField(upload_to='tmp/', blank=True, null=True)

    def __str__(self):
        return self.message

class ChatRoomMembership(models.Model):

    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name="chat_memberships"
    )
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name="memberships")
    last_read_at = models.DateTimeField(auto_now_add=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'room')
        ordering = ['-last_read_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.room.roomId}"
    
    def get_unread_count(self):

        return ChatMessage.objects.filter(
            room=self.room,
            timestamp__gt=self.last_read_at
        ).exclude(user=self.user).count()
    
    def mark_as_read(self):
        self.last_read_at = timezone.now()
        self.save(update_fields=['last_read_at'])