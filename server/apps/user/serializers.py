from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from apps.user.models import User
from apps.chat.models import ChatRoom
from django.contrib.auth import authenticate
from django.utils.translation import gettext_lazy as lazy
class UserSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ['userId', 'username', 'email','image', 'first_name', 'last_name']

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
            'userId': user.userId,
        }

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
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
            type="SELF", name=user.first_name + user.last_name
        )
        chatRoom.member.add(user.id)
        return user
    
    def to_representation(self,instance):

        return {
            'id': instance.id,
            'userId': instance.userId,
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