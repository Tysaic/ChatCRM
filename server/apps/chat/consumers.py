from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from .models import ChatRoom, ChatMessage
from apps.user.models import User, OnlineUser
from django.utils import timezone
import json

class ChatConsumer(AsyncWebsocketConsumer):

    @database_sync_to_async
    def getUser(self, id):
        return User.objects.get(id=id)
    
    @database_sync_to_async
    def getOnlineUsers(self):

        onlineUsers = OnlineUser.objects.all()
        return [onlineUser.user.id for onlineUser in onlineUsers]
    
    @database_sync_to_async
    def addOnlineUsers(self, user):
        try:
            OnlineUser.objects.create(user=user)
        except:
            pass
    
    @database_sync_to_async
    def deleteOnlineUser(self, user):
        try:
            OnlineUser.objects.get(user=user).delete()
        except:
            pass
        
    @database_sync_to_async
    def getUserRooms(self, user):
        return list(ChatRoom.objects.filter(member=user))
    
    @database_sync_to_async
    def getRoomMembers(self, roomId):
        try:
            room = ChatRoom.objects.get(roomId = roomId)
            return [member.id for member in room.member.all()]
        
        except ChatRoom.DoesNotExist:
            return []
    
    @database_sync_to_async
    def saveMessage(self, message, id, roomId, image=None):

        userObj = User.objects.get(id=id)
        chatObj = ChatRoom.objects.get(roomId=roomId)
        ChatMessageObj = ChatMessage.objects.create(
            room=chatObj, user=userObj, message=message
        )
        data = {
            'action': 'message',
            'user': userObj.id,
            'userId': userObj.id,
            'roomId': roomId,
            'message': message,
            'chatType': chatObj.type,
            'userImage': userObj.image.url if userObj.image else None,
            'userName': userObj.first_name + " " + userObj.last_name,
            'timestamp': str(ChatMessageObj.timestamp),
            'image': image
        }
        return data 
    
    async def sendOnlineUserList(self):

        onlineUserList = await self.getOnlineUsers()
        chatMessage = {
            'type': 'chat_message',
            'message': {
                'action': 'onlineUser',
                'userList': onlineUserList
            }
        }

        await self.channel_layer.group_send('onlineUser', chatMessage)
    
    async def connect(self):
        self.visitorId = self.scope['url_route']['kwargs']['visitorId']

        if not self.visitorId or self.visitorId in ('null', 'undefined', 'None', ''):
            await self.close()
            return

        try:
            self.user = await self.getUser(self.visitorId)
        except User.DoesNotExist:
            await self.close()
            return

        self.userRooms = await self.getUserRooms(self.user)
        for room in self.userRooms:
            await self.channel_layer.group_add(
                room.roomId,
                self.channel_name
            )

        await self.channel_layer.group_add(f'user_{self.visitorId}', self.channel_name)
        await self.channel_layer.group_add('onlineUser', self.channel_name)
        await self.addOnlineUsers(self.user)
        await self.sendOnlineUserList()
        await self.accept()



    async def disconnect(self, close_code):

        if not hasattr(self, 'user'):
            return

        await self.deleteOnlineUser(self.user)
        await self.sendOnlineUserList()

        for room in self.userRooms:
            await self.channel_layer.group_discard(
                room.roomId,
                self.channel_name
            )
        
        await self.channel_layer.group_discard(f'user_{self.visitorId}', self.channel_name)
    
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        action = text_data_json['action']
        roomId = text_data_json['roomId']
        chatMessage = {}

        if action == "join_room":
            await self.channel_layer.group_add(roomId, self.channel_name)
            return
        
        if action == "support_update":
            await self.channel_layer.group_send(
                'onlineUser',
                {
                    'type': 'chat_message',
                    'message' : {
                        'action': 'support_update',
                        'roomId': roomId
                    }
                }
            )

        if action == 'message':
            message = text_data_json['message']
            userId = text_data_json['user']
            fromUpload = text_data_json.get('fromUpload', False)

            if fromUpload:

                chatMessage = {
                    'action': 'message',
                    'userId': userId,
                    'roomId': roomId,
                    'message': message,
                    'userImage': text_data_json.get('userImage'),
                    'userName': text_data_json.get('userName'),
                    'timestamp': str(timezone.now()),
                    'image': text_data_json.get('image'),
                    'file': text_data_json.get('file'),
                    'fileName': text_data_json.get('fileName'),
                    'fileType': text_data_json.get('fileType'),
                    'fileSize': text_data_json.get('fileSize'),
                    'type': text_data_json.get('type', 'text'),
                }
            else:

                image = text_data_json.get('image', None)
                chatMessage = await self.saveMessage(message, userId, roomId, image)
            
            members = await self.getRoomMembers(roomId)

            for memberUserId in members:

                await self.channel_layer.group_send(
                    f'user_{memberUserId}',
                    {
                        'type': 'chat_message',
                        'message': chatMessage
                    }
                )
            return None

        elif action == 'typing':
            chatMessage = text_data_json
        
        await self.channel_layer.group_send(
            roomId,
            {
                'type': 'chat_message',
                'message': chatMessage
            }
        )
            
    
    async def chat_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps(message))