from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from apps.user.models import User, UserType, ApiKey
from apps.chat.models import ChatRoom
from django.contrib.auth import authenticate
from django.utils.translation import gettext_lazy as lazy
from rest_framework_simplejwt.tokens import RefreshToken
from apps.chat.models import ChatRoom
import uuid

class UserSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'image', 'first_name', 'last_name']

class LoginSerializer(TokenObtainPairSerializer):
    
    def validate(self, attrs):
        username_or_email = attrs.get("username")
        password = attrs.get("password")

        # Checking if username or email value

        if '@' in username_or_email:
            try:
                user_obj = User.objects.get(email=username_or_email)
                username_or_email = user_obj.username
            except User.DoesNotExist:
                raise serializers.ValidationError(lazy("Invalid credentials."), code="authorization")

        # Verify credentials
        user = authenticate(
            request = self.context.get('request'),
            username=username_or_email, 
            password=password
        )

        if not user:
            raise serializers.ValidationError(
                lazy("Invalid credentials."),
                code="authorization"
            )
        
        if not user.is_active:
            raise serializers.ValidationError(
                lazy("User account is disabled."),
                code="authorization"
            )
        
        # Getting token

        refresh = self.get_token(user)

        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'userId': user.id,
        }

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        #del token['user_id']
        token['username'] = user.username
        token['userId'] = user.id
        return token

class SignupSerializer(serializers.ModelSerializer):

    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(
        write_only = True, required=True, validators = [validate_password]
    )
    passwordTwo = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = (
            'first_name', 'last_name', 'username',
            'email', 'password', 'passwordTwo', 
            'image'
        )
        extra_kwargs = {
            'first_name' : {'required': True},
            'last_name' : {'required': True},
            'username': {'required': True},
            'email': {'required': True},
            'password': {'required': True},
            'image': {'required': False}
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs['passwordTwo']:
            raise serializers.ValidationError(
                {"password": "Password fields didn't match."}
            )
        return attrs
    
    @transaction.atomic
    def create(self, validated_data):
        user = User.objects.create(
            username = validated_data['username'],
            email = validated_data['email'],
            first_name = validated_data['first_name'],
            last_name = validated_data['last_name'],
            image = validated_data.get('image', None)
        )

        user.set_password(validated_data['password'])
        user.save()
        chatRoom = ChatRoom.objects.create(
            type=ChatRoom.ChatType.SELF, 
            name=user.first_name + user.last_name
        )
        chatRoom.member.add(user.id)
        return user
    
    def to_representation(self,instance):

        return {
            'id': instance.id,
            'userId': instance.id,
            'message': 'User registered successfully'
        }

class ProfileSerializer(serializers.ModelSerializer):

    email = serializers.EmailField(required=False)

    class Meta:

        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'image']
        read_only_fields = ['username']
    
    def validate_email(self, value):

        user = self.context['request'].user

        if User.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError("Email existing currently!")
        return value

    def update(self, instance, validated_data):

        instance.email = validated_data.get('email', instance.email)
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)


        if 'image' in validated_data:
            instance.image = validated_data['image']
        
        instance.save()
        return instance

class ChangePasswordSerializer(serializers.Serializer):


    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(
        required=True, 
        write_only=True, 
        validators = [validate_password]
    )
    confirm_new_password = serializers.CharField(required=True, write_only=True)


    def validate_current_password(self, value):

        user = self.context['request'].user
        main_user = User.objects.get(id=user.id)

        if not main_user.check_password(value):
            raise serializer.ValidationError("The password is incorrect from server!")
        return value

    
    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_new_password"]:

            raise serializers.ValidationError({
                "confirm_new_password": "The password doesn't match."
            })

        return attrs
    
    def save(self):

        user = self.context["request"].user
        main_user = User.objects.get(id=user.id)
        main_user.set_password(self.validated_data["new_password"])
        main_user.save()

        return main_user


class GuestAuthSerializer(serializers.Serializer):

    email = serializers.EmailField(required=True, allow_blank=False)
    first_name = serializers.CharField(required=True, allow_blank=False)
    last_name = serializers.CharField(required=True, allow_blank=False)
    metadata = serializers.JSONField(required=False, allow_null=True)


    def __init__(self, *args, **kwargs):

        self.api_key = kwargs.pop('api_key', None)
        super().__init__(*args, **kwargs)

    def validate(self, attrs):

        email = attrs.get('email', '').strip()
        
        if not email:
            raise serializers.ValidationError({
                'email': 'Email is required.'
            })
        
        attrs['email'] = email

        return attrs
    
    def get_or_created_guest(self, validated_data):

        email = validated_data.get('email')
        first_name = validated_data.get('first_name')
        last_name = validated_data.get('last_name')

        username = None
        created = False

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            user = None
        
        if not user:

            user_preffix = uuid.uuid4().hex[:8]
            base_username = email.split('@')[0]
            username = f"{base_username}_{user_preffix}"
            user_type = UserType.objects.get(code='GUEST')

            user = User.objects.create(
                username=username,
                email=email,
                first_name = first_name,
                last_name = last_name,
                user_type = user_type,
                is_active = True
            )

            user.set_password(uuid.uuid4().hex)
            user.save()

            created = True
        
        return user, created
    
    def generate_tokens(self, user):

        refresh = RefreshToken.for_user(user)
        refresh['userId'] = str(user.id)
        refresh['user_type'] = user.get_type_code()

        return {
            'refresh': str(refresh),
            'access_token': str(refresh.access_token)
        }

    def authenticate(self):

        user, created = self.get_or_created_guest(self.validated_data)
        tokens = self.generate_tokens(user)

        support_room, room_created = ChatRoom.objects.get_or_create(
            type = ChatRoom.ChatType.SUPPORT,
            created_by = user,
            defaults = {
                'name': f"{user.first_name} {user.last_name}"
            }
        )

        if room_created:
            support_room.member.add(user)

        return {
            **tokens,
            'userId': str(user.id),
            'user_type': user.get_type_code(),
            'is_new_user': created,
            'roomId': str(support_room.roomId),
            'user': {
                'userId': str(user.id),
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'user_type': user.get_type_code(),
            }
        }




        
